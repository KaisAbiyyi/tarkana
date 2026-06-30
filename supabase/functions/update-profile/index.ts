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

		const body = await req.json();
		const { displayName } = body;

		if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
			throw new Error('displayName is required');
		}

		const { data: profile, error } = await supabaseAdmin
			.from('users_profile')
			.update({ display_name: displayName.trim() })
			.eq('id', user.id)
			.select('id, display_name, avatar_url, rank, rating, created_at')
			.single();

		if (error) throw new Error(error.message);

		return new Response(
			JSON.stringify({
				id: profile.id,
				displayName: profile.display_name,
				avatarUrl: profile.avatar_url,
				rank: profile.rank,
				rating: profile.rating
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
