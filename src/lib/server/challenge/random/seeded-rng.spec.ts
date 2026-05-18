import { describe, expect, it } from 'vitest';
import { createSeededRng } from './seeded-rng';

describe('seeded rng', () => {
	it('returns the same sequence for the same seed', () => {
		const left = createSeededRng('same-seed');
		const right = createSeededRng('same-seed');

		expect([left.next(), left.next(), left.next()]).toEqual([
			right.next(),
			right.next(),
			right.next()
		]);
	});

	it('shuffles deterministically', () => {
		expect(createSeededRng('shuffle-seed').shuffle(['a', 'b', 'c', 'd'])).toEqual(
			createSeededRng('shuffle-seed').shuffle(['a', 'b', 'c', 'd'])
		);
	});
});
