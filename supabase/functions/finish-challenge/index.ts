import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
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

	try {
		const supabaseClient = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_ANON_KEY') ?? '',
			{ global: { headers: { Authorization: req.headers.get('Authorization')! } } }
		);

		const {
			data: { user },
			error: userError
		} = await supabaseClient.auth.getUser();
		if (userError || !user) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		const body = await req.json();
		const { sessionId, tabSwitchCount, requestAnomalyFlags } = body;

		if (!sessionId) {
			return new Response(JSON.stringify({ error: 'sessionId is required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		const supabaseAdmin = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
		);

		// 1. Fetch Session and Profile
		const [{ data: session }, { data: profile }] = await Promise.all([
			supabaseAdmin
				.from('challenge_session')
				.select('*')
				.eq('id', sessionId)
				.eq('user_id', user.id)
				.single(),
			supabaseAdmin.from('profile').select('*').eq('id', user.id).single()
		]);

		if (!session) throw new Error('Session not found');
		if (!profile) throw new Error('Profile not found');

		const [{ data: questions }, { data: answers }] = await Promise.all([
			supabaseAdmin
				.from('challenge_question')
				.select('*')
				.eq('session_id', session.id)
				.order('order_index', { ascending: true }),
			supabaseAdmin
				.from('challenge_answer')
				.select('*')
				.eq('session_id', session.id)
				.eq('user_id', user.id)
		]);

		const qList = questions || [];
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
								sessionId: answer.session_id,
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

		if (session.status === 'completed' || session.status === 'suspicious') {
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
			status: suspicious.isSuspicious ? 'suspicious' : 'completed',
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
				.from('challenge_session')
				.update(updateSessionPayload)
				.eq('id', session.id)
				.select()
				.single(),
			supabaseAdmin
				.from('profile')
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
