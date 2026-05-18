export class SeededRng {
	private state: number;

	constructor(seed: string) {
		if (seed.trim().length === 0) throw new Error('Seed must not be empty');
		this.state = hashSeed(seed);
	}

	next(): number {
		this.state |= 0;
		this.state = (this.state + 0x6d2b79f5) | 0;
		let value = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
		value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	}

	intBetween(min: number, max: number): number {
		if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
			throw new Error('Invalid integer range');
		}

		return Math.floor(this.next() * (max - min + 1)) + min;
	}

	pick<T>(items: readonly T[]): T {
		if (items.length === 0) throw new Error('Cannot pick from an empty list');
		return items[this.intBetween(0, items.length - 1)] as T;
	}

	shuffle<T>(items: readonly T[]): T[] {
		const copy = [...items];
		for (let index = copy.length - 1; index > 0; index -= 1) {
			const swapIndex = this.intBetween(0, index);
			[copy[index], copy[swapIndex]] = [copy[swapIndex] as T, copy[index] as T];
		}
		return copy;
	}
}

export function createSeededRng(seed: string): SeededRng {
	return new SeededRng(seed);
}

function hashSeed(seed: string): number {
	let hash = 2166136261;
	for (let index = 0; index < seed.length; index += 1) {
		hash ^= seed.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}
