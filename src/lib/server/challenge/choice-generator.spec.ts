import { describe, expect, it } from 'vitest';
import { createChoices } from './choice-generator';
import { createSeededRng } from './random/seeded-rng';

describe('choice generator', () => {
	it('includes the correct answer and unique choices', () => {
		const choices = createChoices({
			correctAnswer: '42',
			distractors: ['40', '41', '43', '42'],
			rng: createSeededRng('choices')
		});

		expect(choices).toContain('42');
		expect(new Set(choices).size).toBe(4);
	});

	it('is deterministic for the same seed', () => {
		const input = {
			correctAnswer: 'A',
			distractors: ['B', 'C', 'D', 'E'],
			count: 4
		};

		expect(createChoices({ ...input, rng: createSeededRng('x') })).toEqual(
			createChoices({ ...input, rng: createSeededRng('x') })
		);
	});

	it('throws when unique choices are insufficient', () => {
		expect(() =>
			createChoices({
				correctAnswer: 'A',
				distractors: ['A', 'a'],
				rng: createSeededRng('bad')
			})
		).toThrow('Not enough unique choices');
	});
});
