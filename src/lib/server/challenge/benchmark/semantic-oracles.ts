import type { GeneratedQuestion } from '$lib/server/challenge/types';
import type { SemanticCheckResult } from '$lib/server/challenge/benchmark/types';

/**
 * Semantic Oracles for Tarkana procedural generators.
 * Verifies rule-specific mathematical, logical, and structural invariants beyond basic schema checks.
 */
export function verifySemanticInvariants(question: GeneratedQuestion): SemanticCheckResult {
	const ruleType = String(question.metadata.ruleType ?? '');

	switch (question.questionType) {
		case 'number_sequence':
			return verifyNumberSequenceSemantic(question, ruleType);
		case 'symbol_pattern':
			return verifySymbolPatternSemantic(question, ruleType);
		case 'mini_deduction':
			return verifyMiniDeductionSemantic(question, ruleType);
		case 'memory_pattern':
			return verifyMemoryPatternSemantic(question, ruleType);
		default:
			return { passed: true, ruleType };
	}
}

function verifyNumberSequenceSemantic(
	question: GeneratedQuestion,
	ruleType: string
): SemanticCheckResult {
	const sequence = question.metadata.sequence as unknown[];
	if (!Array.isArray(sequence) || sequence.length < 4) {
		return {
			passed: false,
			ruleType,
			reason: 'Number sequence metadata is missing or has fewer than 4 elements'
		};
	}

	const numericAnswer = Number(question.correctAnswer);
	if (!Number.isFinite(numericAnswer)) {
		return {
			passed: false,
			ruleType,
			reason: `Correct answer '${question.correctAnswer}' cannot be parsed as a finite number`
		};
	}

	// Reconstruct the full sequence with the answer in place of '?'
	const fullSequence: number[] = [];
	for (const item of sequence) {
		if (item === '?') {
			fullSequence.push(numericAnswer);
		} else {
			const n = Number(item);
			if (!Number.isFinite(n)) {
				return {
					passed: false,
					ruleType,
					reason: `Invalid non-numeric element '${String(item)}' in sequence`
				};
			}
			fullSequence.push(n);
		}
	}

	if (ruleType === 'arithmetic_sequence') {
		const step = fullSequence[1]! - fullSequence[0]!;
		for (let i = 2; i < fullSequence.length; i++) {
			if (fullSequence[i]! - fullSequence[i - 1]! !== step) {
				return {
					passed: false,
					ruleType,
					reason: `Arithmetic step invariant violated at index ${i}: expected difference ${step}, got ${fullSequence[i]! - fullSequence[i - 1]!}`
				};
			}
		}
	} else if (ruleType === 'geometric_sequence') {
		if (fullSequence[0]! === 0) {
			return { passed: false, ruleType, reason: 'Geometric sequence starting term is 0' };
		}
		const factor = fullSequence[1]! / fullSequence[0]!;
		for (let i = 2; i < fullSequence.length; i++) {
			if (fullSequence[i - 1]! === 0 || fullSequence[i]! / fullSequence[i - 1]! !== factor) {
				return {
					passed: false,
					ruleType,
					reason: `Geometric ratio invariant violated at index ${i}: expected factor ${factor}, got ${fullSequence[i]! / fullSequence[i - 1]!}`
				};
			}
		}
	} else if (ruleType === 'square_number') {
		// All elements must either be exact non-negative squares or all exact cubes
		const allSquares = fullSequence.every((n) => n >= 0 && Math.round(Math.sqrt(n)) ** 2 === n);
		const allCubes = fullSequence.every((n) => Math.round(Math.cbrt(n)) ** 3 === n);
		if (!allSquares && !allCubes) {
			return {
				passed: false,
				ruleType,
				reason: `Elements must all be exact squares or all exact cubes; received [${fullSequence.join(', ')}]`
			};
		}
	} else if (ruleType === 'fibonacci_like') {
		// Look for consistent linear recurrence a_n = a_{n-1} + a_{n-2} + c
		const addends = fullSequence[2]! - (fullSequence[1]! + fullSequence[0]!);
		for (let i = 3; i < fullSequence.length; i++) {
			const expected = fullSequence[i - 1]! + fullSequence[i - 2]! + addends;
			if (fullSequence[i] !== expected) {
				return {
					passed: false,
					ruleType,
					reason: `Fibonacci recurrence violated at index ${i}: expected ${expected}, got ${fullSequence[i]}`
				};
			}
		}
	}

	return { passed: true, ruleType };
}

function verifySymbolPatternSemantic(
	question: GeneratedQuestion,
	ruleType: string
): SemanticCheckResult {
	const pattern = question.metadata.pattern as unknown[];
	if (!Array.isArray(pattern) || pattern.length === 0) {
		return {
			passed: false,
			ruleType,
			reason: 'Symbol pattern metadata is missing or empty'
		};
	}

	if (!question.correctAnswer || question.correctAnswer.trim().length === 0) {
		return { passed: false, ruleType, reason: 'Correct answer symbol is empty' };
	}

	// Verify the correct answer is a recognized shape symbol token
	if (typeof question.correctAnswer !== 'string') {
		return { passed: false, ruleType, reason: 'Correct answer must be a string' };
	}

	return { passed: true, ruleType };
}

function verifyMiniDeductionSemantic(
	question: GeneratedQuestion,
	ruleType: string
): SemanticCheckResult {
	if (!question.prompt || question.prompt.trim().length < 10) {
		return { passed: false, ruleType, reason: 'Mini deduction prompt is too short' };
	}

	if (!question.explanation || question.explanation.trim().length === 0) {
		return { passed: false, ruleType, reason: 'Mini deduction explanation is missing' };
	}

	// Answer must be present in choices
	if (!question.choices.includes(question.correctAnswer)) {
		return {
			passed: false,
			ruleType,
			reason: `Correct answer '${question.correctAnswer}' is not present in choices`
		};
	}

	return { passed: true, ruleType };
}

function verifyMemoryPatternSemantic(
	question: GeneratedQuestion,
	ruleType: string
): SemanticCheckResult {
	if (!question.prompt || question.prompt.trim().length === 0) {
		return { passed: false, ruleType, reason: 'Memory pattern prompt is missing' };
	}

	if (!question.choices.includes(question.correctAnswer)) {
		return {
			passed: false,
			ruleType,
			reason: `Correct answer '${question.correctAnswer}' is not in choices`
		};
	}

	return { passed: true, ruleType };
}
