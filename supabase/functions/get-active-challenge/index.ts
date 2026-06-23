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

		const { data: session } = await supabaseAdmin
			.from('challenge_session')
			.select('*')
			.eq('user_id', user.id)
			.eq('status', 'in_progress')
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		if (!session) {
			return new Response(JSON.stringify({ hasActive: false }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

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
					sessionId: currentQuestion.session_id,
					categoryId: currentQuestion.category_id,
					questionType: currentQuestion.question_type,
					prompt: currentQuestion.prompt,
					choices: currentQuestion.choices,
					difficultyScore: currentQuestion.difficulty_score,
					timeLimitSeconds: currentQuestion.time_limit_seconds,
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
