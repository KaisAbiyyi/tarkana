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

		const { data: profile, error } = await supabaseAdmin
			.from('profile')
			.select('id, display_name, avatar_url, rank, rating, created_at')
			.eq('id', user.id)
			.single();
		if (error || !profile) throw new Error('Profile not found');

		return new Response(
			JSON.stringify({
				id: profile.id,
				email: user.email,
				displayName: profile.display_name,
				avatarUrl: profile.avatar_url,
				rank: profile.rank,
				rating: profile.rating,
				createdAt: profile.created_at
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
