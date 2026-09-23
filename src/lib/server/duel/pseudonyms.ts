import { randomInt } from 'node:crypto';

const ADJECTIVES = [
	'Quick',
	'Keen',
	'Sharp',
	'Bright',
	'Clever',
	'Wise',
	'Brave',
	'Calm',
	'Swift',
	'Curious',
	'Noble',
	'Agile',
	'Bold',
	'Lucid',
	'Steady'
] as const;

const ANIMALS = [
	'Falcon',
	'Owl',
	'Lynx',
	'Fox',
	'Raven',
	'Otter',
	'Badger',
	'Beaver',
	'Hawk',
	'Wolf',
	'Eagle',
	'Panda',
	'Dolphin',
	'Hedgehog',
	'Cheetah'
] as const;

/**
 * Generates a random safe pseudonym for anonymous duel participants/creators.
 * Never derives from PII, IP, distinctId, or guest tokens.
 * Format: "Adjective Animal ##" (e.g. "Keen Owl 42").
 */
export function generateSafeDuelPseudonym(): string {
	const adj = ADJECTIVES[randomInt(ADJECTIVES.length)]!;
	const animal = ANIMALS[randomInt(ANIMALS.length)]!;
	const num = randomInt(10, 100);
	return `${adj} ${animal} ${num}`;
}
