import type { RequestEvent } from '@sveltejs/kit';
import type { CategoryDto, ChallengeConfigDto, QuestionRuleDto } from '$lib/shared/types/challenge';
import type { PaginatedResult, PaginationInput } from '$lib/shared/types/session';
import { CHALLENGE_TYPES, DIFFICULTY_BANDS } from '$lib/shared/constants/challenge';
import { requireAdmin } from '$lib/server/auth/guards';
import {
	createAdminRepository,
	type AdminOverview,
	type AdminRepository
} from '$lib/server/db/repositories/admin-repository';
import type { ProfileRepository } from '$lib/server/db/repositories/profile-repository';
import { badRequest } from '$lib/server/errors';
import { parsePositiveInteger, parseRecord, requireUuid } from '$lib/shared/validation/common';

export type AdminService = {
	getOverview(event: RequestEvent): Promise<AdminOverview>;
	listCategories(
		event: RequestEvent,
		pagination: PaginationInput
	): Promise<PaginatedResult<CategoryDto>>;
	saveCategory(event: RequestEvent, input: unknown): Promise<CategoryDto>;
	listQuestionRules(
		event: RequestEvent,
		pagination: PaginationInput
	): Promise<PaginatedResult<QuestionRuleDto>>;
	saveQuestionRule(event: RequestEvent, input: unknown): Promise<QuestionRuleDto>;
	listChallengeConfigs(
		event: RequestEvent,
		pagination: PaginationInput
	): Promise<PaginatedResult<ChallengeConfigDto>>;
	saveChallengeConfig(event: RequestEvent, input: unknown): Promise<ChallengeConfigDto>;
};

export function createAdminService(
	adminRepository: AdminRepository = createAdminRepository(),
	profileRepository?: ProfileRepository
): AdminService {
	return {
		async getOverview(event) {
			await requireAdmin(event, profileRepository);
			return adminRepository.getOverview();
		},

		async listCategories(event, pagination) {
			await requireAdmin(event, profileRepository);
			const categories = await adminRepository.listCategories(pagination);

			return {
				items: categories.map(toCategoryDto),
				limit: pagination.limit,
				offset: pagination.offset,
				total: null
			};
		},

		async saveCategory(event, input) {
			await requireAdmin(event, profileRepository);
			const category = parseCategoryInput(input);
			return toCategoryDto(await adminRepository.upsertCategory(category));
		},

		async listQuestionRules(event, pagination) {
			await requireAdmin(event, profileRepository);
			const rules = await adminRepository.listQuestionRules(pagination);

			return {
				items: rules.map(toQuestionRuleDto),
				limit: pagination.limit,
				offset: pagination.offset,
				total: null
			};
		},

		async saveQuestionRule(event, input) {
			await requireAdmin(event, profileRepository);
			const rule = parseQuestionRuleInput(input);
			return toQuestionRuleDto(await adminRepository.upsertQuestionRule(rule));
		},

		async listChallengeConfigs(event, pagination) {
			await requireAdmin(event, profileRepository);
			const configs = await adminRepository.listChallengeConfigs(pagination);

			return {
				items: configs.map(toChallengeConfigDto),
				limit: pagination.limit,
				offset: pagination.offset,
				total: null
			};
		},

		async saveChallengeConfig(event, input) {
			await requireAdmin(event, profileRepository);
			const config = parseChallengeConfigInput(input);
			return toChallengeConfigDto(await adminRepository.upsertChallengeConfig(config));
		}
	};
}

function parseCategoryInput(input: unknown) {
	const body = parseRecord(input, 'category');
	const id = optionalUuid(body.id);
	const name = parseRequiredString(body.name, 'name', 120);
	const slug = parseSlug(body.slug);

	return {
		...(id ? { id } : {}),
		name,
		slug,
		description: optionalString(body.description, 1000),
		isActive: parseBoolean(body.isActive, true)
	};
}

function parseQuestionRuleInput(input: unknown) {
	const body = parseRecord(input, 'questionRule');
	const difficultyMin = parsePositiveInteger(body.difficultyMin, 'difficultyMin', 10000);
	const difficultyMax = parsePositiveInteger(body.difficultyMax, 'difficultyMax', 10000);

	if (difficultyMin > difficultyMax) {
		throw badRequest('difficultyMin cannot be greater than difficultyMax');
	}

	const difficultyBand = optionalEnum(body.difficultyBand, DIFFICULTY_BANDS, 'difficultyBand');

	return {
		...(optionalUuid(body.id) ? { id: optionalUuid(body.id) } : {}),
		categoryId: requireUuid(body.categoryId, 'categoryId'),
		ruleType: parseRequiredString(body.ruleType, 'ruleType', 120),
		difficultyMin,
		difficultyMax,
		difficultyBand,
		timeLimitSeconds: parsePositiveInteger(body.timeLimitSeconds, 'timeLimitSeconds', 600),
		config: parseRecord(body.config ?? {}, 'config'),
		isActive: parseBoolean(body.isActive, true)
	};
}

function parseChallengeConfigInput(input: unknown) {
	const body = parseRecord(input, 'challengeConfig');
	const questionCount = parsePositiveInteger(body.questionCount, 'questionCount', 100);
	const challengeType = optionalEnum(body.challengeType, CHALLENGE_TYPES, 'challengeType');

	if (!challengeType) throw badRequest('challengeType is required');

	return {
		...(optionalUuid(body.id) ? { id: optionalUuid(body.id) } : {}),
		name: parseRequiredString(body.name, 'name', 120),
		challengeType,
		questionCount,
		modeDistribution: nullableRecord(body.modeDistribution, 'modeDistribution'),
		difficultyDistribution: nullableRecord(body.difficultyDistribution, 'difficultyDistribution'),
		isActive: parseBoolean(body.isActive, true)
	};
}

function parseRequiredString(value: unknown, fieldName: string, maxLength: number): string {
	if (typeof value !== 'string') throw badRequest(`${fieldName} must be text`);
	const trimmed = value.trim();
	if (trimmed.length === 0 || trimmed.length > maxLength) {
		throw badRequest(`${fieldName} must be 1-${maxLength} characters`);
	}
	return trimmed;
}

function optionalString(value: unknown, maxLength: number): string | null {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value !== 'string') throw badRequest('description must be text');
	const trimmed = value.trim();
	if (trimmed.length > maxLength)
		throw badRequest(`description must be up to ${maxLength} characters`);
	return trimmed || null;
}

function optionalUuid(value: unknown): string | undefined {
	if (value === null || value === undefined || value === '') return undefined;
	return requireUuid(value, 'id');
}

function parseSlug(value: unknown): string {
	const slug = parseRequiredString(value, 'slug', 120);
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		throw badRequest('slug must use lowercase letters, numbers, and hyphens');
	}
	return slug;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
	if (value === undefined || value === null) return fallback;
	if (typeof value !== 'boolean') throw badRequest('boolean value is invalid');
	return value;
}

function optionalEnum<const T extends readonly string[]>(
	value: unknown,
	values: T,
	fieldName: string
): T[number] | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value !== 'string' || !values.includes(value))
		throw badRequest(`${fieldName} is invalid`);
	return value;
}

function nullableRecord(value: unknown, fieldName: string): Record<string, unknown> | null {
	if (value === undefined || value === null) return null;
	return parseRecord(value, fieldName);
}

function toCategoryDto(category: {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	isActive: boolean;
}): CategoryDto {
	return {
		id: category.id,
		name: category.name,
		slug: category.slug,
		description: category.description,
		isActive: category.isActive
	};
}

function toQuestionRuleDto(rule: {
	id: string;
	categoryId: string;
	ruleType: string;
	difficultyMin: number;
	difficultyMax: number;
	timeLimitSeconds: number;
	config: Record<string, unknown>;
	isActive: boolean;
}): QuestionRuleDto {
	return {
		id: rule.id,
		categoryId: rule.categoryId,
		ruleType: rule.ruleType,
		difficultyMin: rule.difficultyMin,
		difficultyMax: rule.difficultyMax,
		timeLimitSeconds: rule.timeLimitSeconds,
		config: rule.config,
		isActive: rule.isActive
	};
}

function toChallengeConfigDto(config: {
	id: string;
	name: string;
	challengeType: ChallengeConfigDto['challengeType'];
	questionCount: number;
	modeDistribution: Record<string, unknown> | null;
	difficultyDistribution: Record<string, unknown> | null;
	isActive: boolean;
}): ChallengeConfigDto {
	return {
		id: config.id,
		name: config.name,
		challengeType: config.challengeType,
		questionCount: config.questionCount,
		modeDistribution: config.modeDistribution,
		difficultyDistribution: config.difficultyDistribution,
		isActive: config.isActive
	};
}
