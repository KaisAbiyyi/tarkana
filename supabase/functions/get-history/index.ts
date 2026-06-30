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
		const limit = parseInt(url.searchParams.get('limit') || '10');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		const { data, count, error } = await supabaseAdmin
			.from('challenge_sessions')
			.select('*', { count: 'exact' })
			.eq('user_id', user.id)
			.in('status', ['completed', 'abandoned'])
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) throw new Error(error.message);

		const history = (data || []).map((s: any) => ({
			id: s.id,
			challengeType: s.challenge_type,
			status: s.status,
			totalScore: s.total_score,
			accuracy: s.accuracy,
			ratingDelta: s.rating_delta,
			createdAt: s.created_at
		}));

		return new Response(
			JSON.stringify({
				items: history,
				total: count,
				limit,
				offset
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
