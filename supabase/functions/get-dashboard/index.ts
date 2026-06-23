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

		const { data: profile } = await supabaseAdmin
			.from('profile')
			.select('*')
			.eq('id', user.id)
			.single();
		if (!profile) throw new Error('Profile not found');

		const { data: sessions } = await supabaseAdmin
			.from('challenge_session')
			.select('*')
			.eq('user_id', user.id)
			.in('status', ['completed', 'suspicious'])
			.order('completed_at', { ascending: false });

		const sessList = sessions || [];
		const validSessions = sessList.filter((s: any) => s.status === 'completed');

		let bestScore = 0;
		let totalAccuracy = 0;
		let totalSolveTime = 0;
		let totalCompleted = validSessions.length;
		let totalRatingDelta = 0;

		validSessions.forEach((s: any) => {
			if (s.total_score > bestScore) bestScore = s.total_score;
			totalAccuracy += s.accuracy || 0;
			totalSolveTime += s.average_time_seconds || 0;
			totalRatingDelta += s.rating_delta || 0;
		});

		const averageAccuracy = totalCompleted > 0 ? totalAccuracy / totalCompleted : 0;
		const averageSolveTimeSeconds = totalCompleted > 0 ? totalSolveTime / totalCompleted : 0;

		const recentSessions = sessList.slice(0, 5).map((s: any) => ({
			id: s.id,
			challengeType: s.challenge_type,
			totalScore: s.total_score,
			accuracy: s.accuracy,
			createdAt: s.created_at
		}));

		return new Response(
			JSON.stringify({
				currentRank: profile.rank,
				logicRating: profile.rating,
				totalCompleted,
				bestScore,
				averageAccuracy: Math.round(averageAccuracy * 100) / 100,
				totalRatingDelta,
				averageSolveTimeSeconds: Math.round(averageSolveTimeSeconds * 100) / 100,
				recentSessions
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
