import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

type CorsHeaders = Record<string, string>;

export function createAdminClient() {
	return createClient(
		Deno.env.get('SUPABASE_URL') ?? '',
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
		{
			auth: {
				autoRefreshToken: false,
				detectSessionInUrl: false,
				persistSession: false
			}
		}
	);
}

export function unauthorizedResponse(corsHeaders: CorsHeaders) {
	return new Response(JSON.stringify({ error: 'Unauthorized' }), {
		status: 401,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' }
	});
}

export async function getAuthenticatedContext(req: Request, corsHeaders: CorsHeaders) {
	const authHeader = req.headers.get('Authorization') ?? '';
	const match = authHeader.match(/^Bearer\s+(.+)$/i);
	const accessToken = match?.[1]?.trim();

	if (!accessToken) {
		console.warn('Edge auth rejected: missing bearer token');
		return unauthorizedResponse(corsHeaders);
	}

	const supabaseAdmin = createAdminClient();
	const {
		data: { user },
		error
	} = await supabaseAdmin.auth.getUser(accessToken);

	if (error || !user) {
		console.warn('Edge auth rejected: invalid bearer token', {
			reason: error?.message ?? 'missing user',
			tokenLength: accessToken.length
		});
		return unauthorizedResponse(corsHeaders);
	}

	return { user, supabaseAdmin };
}
