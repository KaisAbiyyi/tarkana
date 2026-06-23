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

		const body = await req.json();
		const { sessionId } = body;
		if (!sessionId) throw new Error('sessionId is required');

		const { data: session } = await supabaseAdmin
			.from('challenge_session')
			.select('*')
			.eq('id', sessionId)
			.eq('user_id', user.id)
			.single();
		if (!session) throw new Error('Session not found');

		if (session.status !== 'in_progress') {
			throw new Error('Can only abandon in_progress sessions');
		}

		const { error } = await supabaseAdmin
			.from('challenge_session')
			.update({ status: 'abandoned', completed_at: new Date().toISOString() })
			.eq('id', session.id);

		if (error) throw new Error('Failed to abandon session');

		return new Response(JSON.stringify({ success: true }), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
});
