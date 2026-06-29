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
	if (req.method !== 'GET' && req.method !== 'POST') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	try {
		const auth = await getAuthenticatedContext(req, corsHeaders);
		if (auth instanceof Response) return auth;
		const { user, supabaseAdmin } = auth;

		const { data: session } = await supabaseAdmin
			.from('challenge_sessions')
			.select('*')
			.eq('user_id', user.id)
			.eq('status', 'in_progress')
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (!session) {
			return new Response(JSON.stringify({ hasActive: false }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
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
		const answeredIds = new Set(aList.map((a: any) => a.session_question_id));

		const currentQuestion = qList.find((q: any) => !answeredIds.has(q.id));

		if (!currentQuestion) {
			// Technically this means all answered, but status is still in_progress
			return new Response(
				JSON.stringify({ hasActive: true, isComplete: true, sessionId: session.id }),
				{ headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
			);
		}

		return new Response(
			JSON.stringify({
				hasActive: true,
				isComplete: false,
				sessionId: session.id,
				totalQuestions: qList.length,
				currentQuestion: {
					id: currentQuestion.id,
					sessionQuestionId: currentQuestion.id,
					sessionId: currentQuestion.session_id,
					categoryId: currentQuestion.category_id,
					questionType: currentQuestion.question_type,
					prompt: currentQuestion.prompt,
					choices: currentQuestion.choices,
					difficultyScore: currentQuestion.difficulty_score,
					timeLimitSeconds: currentQuestion.time_limit_seconds,
					metadata: currentQuestion.metadata,
					generatedSeed: currentQuestion.generated_seed,
					orderIndex: currentQuestion.order_index
				}
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

