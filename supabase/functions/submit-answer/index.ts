import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getAuthenticatedContext } from '../_shared/server/auth.ts';
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
		const { sessionId, sessionQuestionId, selectedAnswer } = body;

		if (
			!sessionId ||
			!sessionQuestionId ||
			typeof selectedAnswer !== 'string' ||
			selectedAnswer.trim().length === 0
		) {
			return new Response(JSON.stringify({ error: 'Invalid input' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		// 1. Fetch Session
		const { data: session } = await supabaseAdmin
			.from('challenge_sessions')
			.select('*')
			.eq('id', sessionId)
			.eq('user_id', user.id)
			.single();
		if (!session) throw new Error('Session not found');
		if (session.status !== 'in_progress') throw new Error('Session is not in progress');

		// 2. Fetch Question
		const { data: question } = await supabaseAdmin
			.from('session_questions')
			.select('*')
			.eq('id', sessionQuestionId)
			.single();
		if (!question || question.session_id !== session.id)
			throw new Error('Question not found or does not belong to session');
		if (!Array.isArray(question.choices) || !question.choices.includes(selectedAnswer.trim())) {
			throw new Error('Selected answer is not one of the question choices');
		}

		const { data: questions } = await supabaseAdmin
			.from('session_questions')
			.select('id, order_index')
			.eq('session_id', session.id)
			.order('order_index', { ascending: true });
		const questionIds = (questions || []).map((q: any) => q.id);
		const { data: existingAnswers } =
			questionIds.length > 0
				? await supabaseAdmin
						.from('session_answers')
						.select('*')
						.eq('user_id', user.id)
						.in('session_question_id', questionIds)
				: { data: [] };
		const answers = existingAnswers || [];

		if (answers.some((a: any) => a.session_question_id === question.id)) {
			throw new Error('Question is already answered');
		}

		// 4. Determine elapsed time server-side

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
		const { error: insertErr } = await supabaseAdmin.from('session_answers').insert({
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
				.from('session_questions')
				.select('*')
				.eq('id', nextQuestionRef.id)
				.single();
			if (nq) {
				nextQuestionFull = {
					id: nq.id,
					sessionQuestionId: nq.id,
					sessionId: nq.session_id,
					categoryId: nq.category_id,
					questionType: nq.question_type,
					prompt: nq.prompt,
					choices: nq.choices,
					difficultyScore: nq.difficulty_score,
					timeLimitSeconds: nq.time_limit_seconds,
					metadata: nq.metadata,
					generatedSeed: nq.generated_seed,
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

