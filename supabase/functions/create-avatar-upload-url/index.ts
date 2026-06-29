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
		const { fileName, contentType } = body;
		if (!fileName || !contentType) throw new Error('fileName and contentType are required');

		// Make sure we store it securely under the user's ID
		const extension = fileName.split('.').pop();
		const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

		const { data, error } = await supabaseAdmin.storage.from('avatars').createSignedUploadUrl(path);

		if (error) throw new Error(error.message);

		return new Response(
			JSON.stringify({
				signedUrl: data.signedUrl,
				path: data.path,
				token: data.token
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

