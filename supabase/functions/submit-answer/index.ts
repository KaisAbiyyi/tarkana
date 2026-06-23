import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { answersMatch } from '../_shared/server/challenge/normalization.ts';
import { calculateQuestionScore } from '../_shared/server/scoring/scoring.ts';

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
		const { sessionId, sessionQuestionId, selectedAnswer } = body;

		if (!sessionId || !sessionQuestionId || !selectedAnswer || selectedAnswer.trim().length === 0) {
			return new Response(JSON.stringify({ error: 'Invalid input' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		const supabaseAdmin = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
		);

		// 1. Fetch Session
		const { data: session } = await supabaseAdmin
			.from('challenge_session')
			.select('*')
			.eq('id', sessionId)
			.eq('user_id', user.id)
			.single();
		if (!session) throw new Error('Session not found');
		if (session.status === 'completed' || session.status === 'suspicious')
			throw new Error('Session is already finished');

		// 2. Fetch Question
		const { data: question } = await supabaseAdmin
			.from('challenge_question')
			.select('*')
			.eq('id', sessionQuestionId)
			.single();
		if (!question || question.session_id !== session.id)
			throw new Error('Question not found or does not belong to session');

		// 3. Fetch all answers for this session
		const { data: existingAnswers } = await supabaseAdmin
			.from('challenge_answer')
			.select('*')
			.eq('session_id', session.id);
		const answers = existingAnswers || [];

		if (answers.some((a: any) => a.session_question_id === question.id)) {
			throw new Error('Question is already answered');
		}

		// 4. Determine elapsed time server-side
		const { data: questions } = await supabaseAdmin
			.from('challenge_question')
			.select('id, order_index')
			.eq('session_id', session.id)
			.order('order_index', { ascending: true });

		const previousQuestion = questions?.find(
			(q: any) => q.order_index === question.order_index - 1
		);
		const previousAnswer = previousQuestion
			? answers.find((a: any) => a.session_question_id === previousQuestion.id)
			: null;

		const startedAt = previousAnswer
			? new Date(previousAnswer.created_at)
			: new Date(session.created_at);
		const now = new Date();
		const elapsedSeconds = Math.max(0, Math.ceil((now.getTime() - startedAt.getTime()) / 1000));
		const timeSpentSeconds = Math.min(elapsedSeconds, question.time_limit_seconds);

		// 5. Calculate Score
		const isCorrect =
			timeSpentSeconds < question.time_limit_seconds &&
			answersMatch(selectedAnswer, question.correct_answer, {
				exactSymbols: question.question_type === 'symbol_pattern'
			});

		const scoreEarned = calculateQuestionScore({
			isCorrect,
			difficultyScore: question.difficulty_score,
			timeSpentSeconds,
			timeLimitSeconds: question.time_limit_seconds
		});

		// 6. Save Answer
		const { error: insertErr } = await supabaseAdmin.from('challenge_answer').insert({
			session_id: session.id,
			session_question_id: question.id,
			user_id: user.id,
			selected_answer: selectedAnswer.trim(),
			is_correct: isCorrect,
			time_spent_seconds: timeSpentSeconds,
			score_earned: scoreEarned
		});

		if (insertErr) throw new Error('Failed to save answer');

		const nextQuestionRef = questions?.find((q: any) => q.order_index === question.order_index + 1);
		let nextQuestionFull = null;

		if (nextQuestionRef) {
			const { data: nq } = await supabaseAdmin
				.from('challenge_question')
				.select('*')
				.eq('id', nextQuestionRef.id)
				.single();
			if (nq) {
				nextQuestionFull = {
					id: nq.id,
					sessionId: nq.session_id,
					categoryId: nq.category_id,
					questionType: nq.question_type,
					prompt: nq.prompt,
					choices: nq.choices,
					difficultyScore: nq.difficulty_score,
					timeLimitSeconds: nq.time_limit_seconds,
					orderIndex: nq.order_index
				};
			}
		}

		return new Response(
			JSON.stringify({
				isCorrect,
				scoreEarned,
				isComplete: !nextQuestionFull,
				nextQuestion: nextQuestionFull
			}),
			{
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			}
		);
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
});
