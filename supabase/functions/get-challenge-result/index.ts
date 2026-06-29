import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getAuthenticatedContext } from '../_shared/server/auth.ts';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	try {
		const auth = await getAuthenticatedContext(req, corsHeaders);
		if (auth instanceof Response) return auth;
		const { user, supabaseAdmin } = auth;

		const url = new URL(req.url);
		const sessionId = url.searchParams.get('sessionId');
		if (!sessionId) throw new Error('sessionId query param is required');

		const { data: session } = await supabaseAdmin
			.from('challenge_sessions')
			.select('*')
			.eq('id', sessionId)
			.eq('user_id', user.id)
			.single();
		if (!session) throw new Error('Session not found');
		if (session.status !== 'completed') {
			throw new Error('Challenge result is only available after completion');
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
		const answerByQuestionId = new Map(aList.map((a: any) => [a.session_question_id, a]));

		const reviewList = qList.map((q: any) => {
			const answer = answerByQuestionId.get(q.id) || null;
			return {
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
							createdAt: answer.created_at
						}
					: null
			};
		});

		return new Response(
			JSON.stringify({
				sessionId: session.id,
				status: session.status,
				totalScore: session.total_score,
				accuracy: session.accuracy,
				totalTimeSeconds: session.total_time_seconds,
				averageTimeSeconds: session.average_time_seconds,
				ratingBefore: session.rating_before,
				ratingAfter: session.rating_after,
				ratingDelta: session.rating_delta,
				rankBefore: session.rank_before,
				rankAfter: session.rank_after,
				isSuspicious: session.is_suspicious,
				suspiciousReason: session.suspicious_reason,
				review: reviewList
			}),
			{ headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
		);
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
});

