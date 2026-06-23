import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

		const supabaseAdmin = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
		);

		const url = new URL(req.url);
		const sessionId = url.searchParams.get('sessionId');
		if (!sessionId) throw new Error('sessionId query param is required');

		const { data: session } = await supabaseAdmin
			.from('challenge_session')
			.select('*')
			.eq('id', sessionId)
			.eq('user_id', user.id)
			.single();
		if (!session) throw new Error('Session not found');

		const [{ data: questions }, { data: answers }] = await Promise.all([
			supabaseAdmin
				.from('challenge_question')
				.select('*')
				.eq('session_id', session.id)
				.order('order_index', { ascending: true }),
			supabaseAdmin.from('challenge_answer').select('*').eq('session_id', session.id)
		]);

		const qList = questions || [];
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
							sessionId: answer.session_id,
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
