import { describe, expect, it } from 'vitest';
import { createAdminService } from './admin-service';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';
import type { AdminRepository } from '$lib/server/db/repositories/admin-repository';

describe('admin service', () => {
	it('rejects non-admin users', async () => {
		const service = createAdminService(
			createAdminRepositoryFake(),
			createProfileRepositoryFake(createProfile())
		);

		await expect(service.getOverview(createFakeEvent(createFakeUser()))).rejects.toMatchObject({
			status: 403
		});
	});

	it('allows admins to save valid categories', async () => {
		const adminProfile = createProfile({ role: 'admin' });
		const repository = createAdminRepositoryFake();
		const service = createAdminService(repository, createProfileRepositoryFake(adminProfile));

		const category = await service.saveCategory(
			createFakeEvent(createFakeUser({ id: adminProfile.id })),
			{
				name: 'Number Sequence',
				slug: 'number-sequence',
				description: 'Sequence puzzles',
				isActive: true
			}
		);

		expect(category.slug).toBe('number-sequence');
		expect(repository.savedCategories).toHaveLength(1);
	});

	it('rejects impossible question rule difficulty ranges', async () => {
		const adminProfile = createProfile({ role: 'admin' });
		const service = createAdminService(
			createAdminRepositoryFake(),
			createProfileRepositoryFake(adminProfile)
		);

		await expect(
			service.saveQuestionRule(createFakeEvent(createFakeUser({ id: adminProfile.id })), {
				categoryId: '11111111-1111-4111-8111-111111111111',
				ruleType: 'arithmetic_sequence',
				difficultyMin: 50,
				difficultyMax: 10,
				timeLimitSeconds: 30,
				config: {},
				isActive: true
			})
		).rejects.toThrow('difficultyMin');
	});
});

function createAdminRepositoryFake(): AdminRepository & { savedCategories: unknown[] } {
	const savedCategories: unknown[] = [];

	return {
		savedCategories,
		async listCategories() {
			return [];
		},
		async upsertCategory(input) {
			savedCategories.push(input);
			return {
				id: input.id ?? '11111111-1111-4111-8111-111111111111',
				name: input.name,
				slug: input.slug,
				description: input.description ?? null,
				isActive: input.isActive ?? true,
				createdAt: new Date(),
				updatedAt: new Date()
			};
		},
		async listQuestionRules() {
			return [];
		},
		async upsertQuestionRule() {
			throw new Error('not used');
		},
		async listChallengeConfigs() {
			return [];
		},
		async upsertChallengeConfig() {
			throw new Error('not used');
		},
		async getOverview() {
			return {
				categoryCount: 0,
				activeRuleCount: 0,
				challengeConfigCount: 0,
				suspiciousSessionCount: 0,
				userCount: 0
			};
		}
	};
}
