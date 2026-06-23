import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

boilerplate = """import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // CUSTOM_LOGIC
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
"""

endpoints = {
    "get-active-challenge": """
    const { data: session } = await supabaseAdmin.from('challenge_session')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
    if (!session) {
        return new Response(JSON.stringify({ hasActive: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const [{ data: questions }, { data: answers }] = await Promise.all([
        supabaseAdmin.from('challenge_question').select('*').eq('session_id', session.id).order('order_index', { ascending: true }),
        supabaseAdmin.from('challenge_answer').select('*').eq('session_id', session.id)
    ]);

    const qList = questions || [];
    const aList = answers || [];
    const answeredIds = new Set(aList.map((a: any) => a.session_question_id));
    
    const currentQuestion = qList.find((q: any) => !answeredIds.has(q.id));

    if (!currentQuestion) {
        // Technically this means all answered, but status is still in_progress
        return new Response(JSON.stringify({ hasActive: true, isComplete: true, sessionId: session.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
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
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    """,
    
    "abandon-challenge": """
    const body = await req.json();
    const { sessionId } = body;
    if (!sessionId) throw new Error('sessionId is required');

    const { data: session } = await supabaseAdmin.from('challenge_session').select('*').eq('id', sessionId).eq('user_id', user.id).single();
    if (!session) throw new Error('Session not found');
    
    if (session.status !== 'in_progress') {
        throw new Error('Can only abandon in_progress sessions');
    }

    const { error } = await supabaseAdmin.from('challenge_session')
        .update({ status: 'abandoned', completed_at: new Date().toISOString() })
        .eq('id', session.id);

    if (error) throw new Error('Failed to abandon session');
    
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    """,
    
    "get-challenge-result": """
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) throw new Error('sessionId query param is required');

    const { data: session } = await supabaseAdmin.from('challenge_session').select('*').eq('id', sessionId).eq('user_id', user.id).single();
    if (!session) throw new Error('Session not found');

    const [{ data: questions }, { data: answers }] = await Promise.all([
        supabaseAdmin.from('challenge_question').select('*').eq('session_id', session.id).order('order_index', { ascending: true }),
        supabaseAdmin.from('challenge_answer').select('*').eq('session_id', session.id)
    ]);
    
    const qList = questions || [];
    const aList = answers || [];
    const answerByQuestionId = new Map(aList.map((a: any) => [a.session_question_id, a]));

    const reviewList = qList.map((q: any) => {
        const answer = answerByQuestionId.get(q.id) || null;
        return {
            question: {
                id: q.id,
                sessionId: q.session_id,
                categoryId: q.category_id,
                questionType: q.question_type,
                prompt: q.prompt,
                choices: q.choices,
                correctAnswer: q.correct_answer,
                explanation: q.explanation,
                difficultyScore: q.difficulty_score,
                timeLimitSeconds: q.time_limit_seconds,
                metadata: q.metadata,
                generatedSeed: q.generated_seed,
                orderIndex: q.order_index
            },
            answer: answer ? {
                id: answer.id,
                sessionId: answer.session_id,
                sessionQuestionId: answer.session_question_id,
                userId: answer.user_id,
                selectedAnswer: answer.selected_answer,
                isCorrect: answer.is_correct,
                timeSpentSeconds: answer.time_spent_seconds,
                scoreEarned: answer.score_earned,
                createdAt: answer.created_at
            } : null
        };
    });

    return new Response(JSON.stringify({
        sessionId: session.id,
        status: session.status,
        totalScore: session.total_score,
        accuracy: session.accuracy,
        totalTimeSeconds: session.total_time_seconds,
        averageTimeSeconds: session.average_time_seconds,
        ratingBefore: session.rating_before,
        ratingAfter: session.rating_after,
        ratingDelta: session.rating_delta,
        rankBefore: session.rank_before,
        rankAfter: session.rank_after,
        isSuspicious: session.is_suspicious,
        suspiciousReason: session.suspicious_reason,
        review: reviewList
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    """,
    
    "get-dashboard": """
    const { data: profile } = await supabaseAdmin.from('profile').select('*').eq('id', user.id).single();
    if (!profile) throw new Error('Profile not found');

    const { data: sessions } = await supabaseAdmin.from('challenge_session')
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
        totalAccuracy += (s.accuracy || 0);
        totalSolveTime += (s.average_time_seconds || 0);
        totalRatingDelta += (s.rating_delta || 0);
    });

    const averageAccuracy = totalCompleted > 0 ? (totalAccuracy / totalCompleted) : 0;
    const averageSolveTimeSeconds = totalCompleted > 0 ? (totalSolveTime / totalCompleted) : 0;

    const recentSessions = sessList.slice(0, 5).map((s: any) => ({
        id: s.id,
        challengeType: s.challenge_type,
        totalScore: s.total_score,
        accuracy: s.accuracy,
        createdAt: s.created_at
    }));

    return new Response(JSON.stringify({
        currentRank: profile.rank,
        logicRating: profile.rating,
        totalCompleted,
        bestScore,
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        totalRatingDelta,
        averageSolveTimeSeconds: Math.round(averageSolveTimeSeconds * 100) / 100,
        recentSessions
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    """,
    
    "get-history": """
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const { data, count, error } = await supabaseAdmin.from('challenge_session')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .in('status', ['completed', 'abandoned', 'suspicious'])
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

    return new Response(JSON.stringify({
        items: history,
        total: count,
        limit,
        offset
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    """,
    
    "get-leaderboard": """
    const { data, error } = await supabaseAdmin.from('profile')
        .select('id, display_name, avatar_url, rank, rating')
        .order('rating', { ascending: false })
        .limit(100);

    if (error) throw new Error(error.message);

    const mapped = (data || []).map((p: any) => ({
        id: p.id,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        rank: p.rank,
        rating: p.rating
    }));

    return new Response(JSON.stringify({ leaderboard: mapped }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    """,

    "get-profile": """
    const { data: profile, error } = await supabaseAdmin.from('profile').select('id, display_name, avatar_url, rank, rating, created_at').eq('id', user.id).single();
    if (error || !profile) throw new Error('Profile not found');

    return new Response(JSON.stringify({
        id: profile.id,
        email: user.email,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        rank: profile.rank,
        rating: profile.rating,
        createdAt: profile.created_at
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    """,

    "update-profile": """
    const body = await req.json();
    const { displayName } = body;
    
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
        throw new Error('displayName is required');
    }

    const { data: profile, error } = await supabaseAdmin.from('profile')
        .update({ display_name: displayName.trim() })
        .eq('id', user.id)
        .select('id, display_name, avatar_url, rank, rating, created_at')
        .single();

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({
        id: profile.id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        rank: profile.rank,
        rating: profile.rating
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    """,

    "create-avatar-upload-url": """
    const body = await req.json();
    const { fileName, contentType } = body;
    if (!fileName || !contentType) throw new Error('fileName and contentType are required');

    // Make sure we store it securely under the user's ID
    const extension = fileName.split('.').pop();
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { data, error } = await supabaseAdmin.storage.from('avatars').createSignedUploadUrl(path);

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({
        signedUrl: data.signedUrl,
        path: data.path,
        token: data.token
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    """,

    "update-avatar": """
    const body = await req.json();
    const { path } = body;
    if (!path) throw new Error('path is required');

    const { data: urlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
    if (!urlData || !urlData.publicUrl) throw new Error('Could not get public URL');

    const { data: profile, error } = await supabaseAdmin.from('profile')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id)
        .select('id, display_name, avatar_url')
        .single();

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({
        id: profile.id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    """
}

for name, logic in endpoints.items():
    content = boilerplate.replace("// CUSTOM_LOGIC", logic)
    write_file(f"supabase/functions/{name}/index.ts", content)

print("Created all endpoints successfully!")
