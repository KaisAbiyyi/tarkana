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

		const { data, error } = await supabaseAdmin
			.from('users_profile')
			.select('id, display_name, avatar_url, rank, rating')
			.order('rating', { ascending: false })
			.limit(100);

		if (error) throw new Error(error.message);

		const ids = (data || []).map((p: any) => p.id);
		const { data: sessions } =
			ids.length > 0
				? await supabaseAdmin
						.from('challenge_sessions')
						.select('user_id, accuracy')
						.in('user_id', ids)
						.eq('status', 'completed')
						.eq('is_suspicious', false)
				: { data: [] };
		const stats = new Map<string, { count: number; accuracy: number }>();
		for (const session of sessions || []) {
			const item = stats.get(session.user_id) || { count: 0, accuracy: 0 };
			item.count += 1;
			item.accuracy += Number(session.accuracy || 0);
			stats.set(session.user_id, item);
		}

		const mapped = (data || []).map((p: any, index: number) => {
			const stat = stats.get(p.id) || { count: 0, accuracy: 0 };
			const averageAccuracy = stat.count > 0 ? stat.accuracy / stat.count : 0;
			return {
			id: p.id,
			displayName: p.display_name,
			playerName: p.display_name,
			avatarUrl: p.avatar_url,
			rank: p.rank,
			rating: p.rating,
			logicRating: p.rating,
			position: index + 1,
			accuracy: `${averageAccuracy.toFixed(1)}%`,
			completedRounds: stat.count,
			isCurrentUser: p.id === user.id
		};
		});

		return new Response(JSON.stringify({ leaderboard: mapped }), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
});

