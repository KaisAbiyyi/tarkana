import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getAuthenticatedContext } from '../_shared/server/auth.ts';
import { calculateRatingDelta, applyRatingDelta } from '../_shared/server/scoring/rating.ts';
import {
	resolveCompletedRank,
	isRankPromotion,
	getRankProgress
} from '../_shared/server/scoring/rank.ts';
import { calculateSessionScore } from '../_shared/server/scoring/scoring.ts';
import { detectSuspiciousSession } from '../_shared/server/scoring/suspicious-session.ts';
import { toResultQuestionReviewDto } from '../_shared/server/sessions/dto.ts';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}
	if (req.method !== 'POST') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	try {
		const auth = await getAuthenticatedContext(req, corsHeaders);
		if (auth instanceof Response) return auth;
		const { user, supabaseAdmin } = auth;

		const body = await req.json();
		const { sessionId, tabSwitchCount, requestAnomalyFlags } = body;

		if (!sessionId) {
			return new Response(JSON.stringify({ error: 'sessionId is required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// 1. Fetch Session and Profile
		const [{ data: session }, { data: profile }] = await Promise.all([
			supabaseAdmin
				.from('challenge_sessions')
				.select('*')
				.eq('id', sessionId)
				.eq('user_id', user.id)
				.single(),
			supabaseAdmin.from('users_profile').select('*').eq('id', user.id).single()
		]);

		if (!session) throw new Error('Session not found');
		if (!profile) throw new Error('Profile not found');
		if (session.status === 'abandoned') throw new Error('Challenge session is abandoned');
		if (session.status !== 'in_progress' && session.status !== 'completed') {
			throw new Error('Challenge session is not active');
		}

		const { data: questions } = await supabaseAdmin
			.from('session_questions')
			.select('*')
			.eq('session_id', session.id)
			.order('order_index', { ascending: true });

		const qList = questions || [];
		const questionIds = qList.map((q: any) => q.id);
		const { data: answers } =
			questionIds.length > 0
				? await supabaseAdmin
						.from('session_answers')
						.select('*')
						.eq('user_id', user.id)
						.in('session_question_id', questionIds)
				: { data: [] };
		const aList = answers || [];

		// Helper to format result
		const toResult = (sessionData: any, suspiciousReasons: string[]) => {
			const answerByQuestionId = new Map(aList.map((a: any) => [a.session_question_id, a]));
			const scoreSummary = calculateSessionScore(
				qList.map((q: any) => {
					const answer = answerByQuestionId.get(q.id);
					return {
						isCorrect: answer?.is_correct ?? false,
						difficultyScore: q.difficulty_score,
						timeSpentSeconds: answer?.time_spent_seconds ?? 0,
						timeLimitSeconds: q.time_limit_seconds,
						scoreEarned: answer?.score_earned ?? 0
					};
				})
			);

			const reviewList = qList.map((q: any) => {
				const answer = answerByQuestionId.get(q.id) || null;
				return toResultQuestionReviewDto({
					question: {
						id: q.id,
						sessionId: q.session_id,
						categoryId: q.category_id,
						questionType: q.question_type,
						prompt: q.prompt,
						choices: q.choices,
						correctAnswer: q.correct_answer,
						explanation: q.explanation,
						difficultyScore: q.difficulty_score,
						timeLimitSeconds: q.time_limit_seconds,
						metadata: q.metadata,
						generatedSeed: q.generated_seed,
						orderIndex: q.order_index
					},
					answer: answer
						? {
								id: answer.id,
								sessionId: session.id,
								sessionQuestionId: answer.session_question_id,
								userId: answer.user_id,
								selectedAnswer: answer.selected_answer,
								isCorrect: answer.is_correct,
								timeSpentSeconds: answer.time_spent_seconds,
								scoreEarned: answer.score_earned,
								createdAt: new Date(answer.created_at)
							}
						: null
				});
			});

			return {
				sessionId: sessionData.id,
				totalScore:
					sessionData.total_score !== null ? sessionData.total_score : scoreSummary.totalScore,
				accuracy: sessionData.accuracy !== null ? sessionData.accuracy : scoreSummary.accuracy,
				correctAnswers: scoreSummary.correctAnswers,
				wrongAnswers: scoreSummary.wrongAnswers,
				totalTimeSeconds:
					sessionData.total_time_seconds !== null
						? sessionData.total_time_seconds
						: scoreSummary.totalTimeSeconds,
				averageTimeSeconds:
					sessionData.average_time_seconds !== null
						? sessionData.average_time_seconds
						: scoreSummary.averageTimeSeconds,
				ratingBefore: sessionData.rating_before,
				ratingAfter: sessionData.rating_after,
				ratingDelta: sessionData.rating_delta,
				rankBefore: sessionData.rank_before,
				rankAfter: sessionData.rank_after,
				rankPromoted: isRankPromotion(sessionData.rank_before, sessionData.rank_after),
				rankProgress: getRankProgress(sessionData.rating_after),
				isSuspicious: sessionData.is_suspicious,
				suspiciousReasons:
					suspiciousReasons.length > 0
						? suspiciousReasons
						: (sessionData.suspicious_reason?.split(', ').filter(Boolean) ?? []),
				review: reviewList
			};
		};

		if (session.status === 'completed') {
			return new Response(JSON.stringify(toResult(session, [])), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		if (qList.length === 0) throw new Error('Challenge has no questions');
		if (aList.length !== qList.length)
			throw new Error('Challenge cannot be finished before every question is answered');

		const answerByQuestionId = new Map(aList.map((a: any) => [a.session_question_id, a]));
		const scoreSummary = calculateSessionScore(
			qList.map((q: any) => {
				const answer = answerByQuestionId.get(q.id);
				return {
					isCorrect: answer.is_correct,
					difficultyScore: q.difficulty_score,
					timeSpentSeconds: answer.time_spent_seconds,
					timeLimitSeconds: q.time_limit_seconds,
					scoreEarned: answer.score_earned
				};
			})
		);

		const suspicious = detectSuspiciousSession({
			answers: aList.map((a: any) => {
				const q = qList.find((item: any) => item.id === a.session_question_id);
				return {
					orderIndex: q.order_index,
					timeSpentSeconds: a.time_spent_seconds,
					timeLimitSeconds: q.time_limit_seconds
				};
			}),
			tabSwitchCount: tabSwitchCount,
			requestAnomalyFlags: requestAnomalyFlags || []
		});

		const ratingDelta = suspicious.isSuspicious ? 0 : calculateRatingDelta(scoreSummary.accuracy);
		const ratingAfter = applyRatingDelta(profile.rating, ratingDelta);
		const rankAfter = suspicious.isSuspicious ? profile.rank : resolveCompletedRank(ratingAfter);

		const updateSessionPayload = {
			status: 'completed',
			total_score: scoreSummary.totalScore,
			accuracy: scoreSummary.accuracy,
			total_time_seconds: scoreSummary.totalTimeSeconds,
			average_time_seconds: scoreSummary.averageTimeSeconds,
			rating_after: ratingAfter,
			rating_delta: ratingDelta,
			rank_after: rankAfter,
			is_suspicious: suspicious.isSuspicious,
			suspicious_reason: suspicious.reasons.join(', ') || null,
			completed_at: new Date().toISOString()
		};

		// Transactional-ish update (using admin client to bypass RLS for direct profile update)
		const [{ data: updatedSession, error: sessionErr }, { error: profileErr }] = await Promise.all([
			supabaseAdmin
				.from('challenge_sessions')
				.update(updateSessionPayload)
				.eq('id', session.id)
				.select()
				.single(),
			supabaseAdmin
				.from('users_profile')
				.update({ rating: ratingAfter, rank: rankAfter })
				.eq('id', profile.id)
		]);

		if (sessionErr || profileErr) throw new Error('Failed to save completion status');

		return new Response(JSON.stringify(toResult(updatedSession, suspicious.reasons)), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
});

