import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getAuthenticatedContext } from '../_shared/server/auth.ts';
import {
	buildChallengeQuestions,
	toRuleDefinition
} from '../_shared/server/challenge/challenge-builder.ts';
import type { QuestionType, ChallengeType } from '../_shared/shared/constants/challenge.ts';
import {
	CHALLENGE_TYPES,
	QUESTION_TYPES,
	DEFAULT_CHALLENGE_QUESTION_COUNTS
} from '../_shared/shared/constants/challenge.ts';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}
	if (req.method !== 'POST') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}

	try {
		const auth = await getAuthenticatedContext(req, corsHeaders);
		if (auth instanceof Response) return auth;
		const { user, supabaseAdmin } = auth;

		const body = await req.json();
		const challengeType = body.challengeType as ChallengeType;
		const selectedMode = body.selectedMode as QuestionType | undefined;
		const seed = crypto.randomUUID();

		if (!challengeType) {
			return new Response(JSON.stringify({ error: 'challengeType is required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}
		if (!CHALLENGE_TYPES.includes(challengeType)) {
			return new Response(JSON.stringify({ error: 'challengeType is invalid' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}
		if (selectedMode && !QUESTION_TYPES.includes(selectedMode)) {
			return new Response(JSON.stringify({ error: 'selectedMode is invalid' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		const { data: profile } = await supabaseAdmin
			.from('users_profile')
			.select('*')
			.eq('id', user.id)
			.single();
		if (!profile) throw new Error('Profile not found');

		const { data: activeSession } = await supabaseAdmin
			.from('challenge_sessions')
			.select('id')
			.eq('user_id', user.id)
			.eq('status', 'in_progress')
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (activeSession) {
			return new Response(JSON.stringify({ error: 'An active challenge is already in progress' }), {
				status: 409,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}

		const [configRes, categoriesRes, rulesRes] = await Promise.all([
			supabaseAdmin
				.from('challenge_configs')
				.select('*')
				.eq('challenge_type', challengeType)
				.eq('is_active', true)
				.maybeSingle(),
			supabaseAdmin.from('categories').select('*').eq('is_active', true),
			supabaseAdmin.from('question_rules').select('*').eq('is_active', true)
		]);

		const rawRules = rulesRes.data || [];
		const categories = categoriesRes.data || [];
		const config = configRes.data;

		const rules = rawRules
			.map((r: any) =>
				toRuleDefinition({
					id: r.id,
					categoryId: r.category_id,
					ruleType: r.rule_type,
					difficultyMin: r.difficulty_min,
					difficultyMax: r.difficulty_max,
					difficultyBand: r.difficulty_band,
					timeLimitSeconds: r.time_limit_seconds,
					config: r.config,
					isActive: r.is_active
				})
			)
			.filter((rule: any) => rule !== null);

		const challengeConfig = config
			? {
					name: config.name,
					challengeType: config.challenge_type,
					questionCount: config.question_count,
					modeDistribution: config.mode_distribution,
					difficultyDistribution: config.difficulty_distribution,
					isActive: config.is_active
				}
			: {
					name: `${challengeType} default`,
					challengeType,
					questionCount: DEFAULT_CHALLENGE_QUESTION_COUNTS[challengeType],
					modeDistribution: null,
					difficultyDistribution: null,
					isActive: true
				};

		const challengeCategories = categories
			.map((category: any) => {
				const matchingRule = rules.find((rule: any) => rule.categoryId === category.id);
				if (!matchingRule) return null;
				return {
					id: category.id,
					slug: category.slug,
					questionType: matchingRule.questionType,
					isActive: category.is_active
				};
			})
			.filter((c: any) => c !== null);

		const builtQuestions = buildChallengeQuestions({
			locale: 'en', // default for Edge
			config: challengeConfig,
			categories: challengeCategories,
			rules,
			userRating: profile.rating,
			selectedMode,
			seed
		});

		const { data: session, error: sessionErr } = await supabaseAdmin
			.from('challenge_sessions')
			.insert({
				user_id: user.id,
				challenge_type: challengeType,
				status: 'in_progress',
				total_questions: builtQuestions.length,
				rating_before: profile.rating,
				rating_after: profile.rating,
				rank_before: profile.rank,
				rank_after: profile.rank
			})
			.select()
			.single();

		if (sessionErr || !session) throw new Error('Failed to create session: ' + sessionErr?.message);

		const questionsToInsert = builtQuestions.map((q: any, i: number) => ({
			session_id: session.id,
			category_id: q.categoryId,
			question_type: q.questionType,
			prompt: q.prompt,
			choices: q.choices,
			correct_answer: q.correctAnswer,
			explanation: q.explanation,
			difficulty_score: q.difficultyScore,
			time_limit_seconds: q.timeLimitSeconds,
			metadata: q.metadata,
			generated_seed: q.generatedSeed,
			order_index: i
		}));

		const { data: persistedQuestions, error: insertErr } = await supabaseAdmin
			.from('session_questions')
			.insert(questionsToInsert)
			.select();
		if (insertErr || !persistedQuestions || persistedQuestions.length === 0)
			throw new Error('Failed to insert questions');

		const firstQuestion =
			persistedQuestions.find((q: any) => q.order_index === 0) || persistedQuestions[0];

		return new Response(
			JSON.stringify({
				sessionId: session.id,
				totalQuestions: persistedQuestions.length,
				currentQuestion: {
					id: firstQuestion.id,
					sessionQuestionId: firstQuestion.id,
					sessionId: firstQuestion.session_id,
					categoryId: firstQuestion.category_id,
					questionType: firstQuestion.question_type,
					prompt: firstQuestion.prompt,
					choices: firstQuestion.choices,
					difficultyScore: firstQuestion.difficulty_score,
					timeLimitSeconds: firstQuestion.time_limit_seconds,
					metadata: firstQuestion.metadata,
					generatedSeed: firstQuestion.generated_seed,
					orderIndex: firstQuestion.order_index
				}
			}),
			{
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			}
		);
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' }
		});
	}
});
