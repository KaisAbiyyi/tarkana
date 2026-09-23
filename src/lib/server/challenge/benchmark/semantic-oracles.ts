import type { GeneratedQuestion } from '$lib/server/challenge/types';
import type { SemanticCheckResult } from '$lib/server/challenge/benchmark/types';

/**
 * Semantic Oracles for Tarkana procedural generators.
 * Verifies rule-specific mathematical, logical, and structural invariants beyond basic schema checks.
 *
 * All 22 active generator rules are explicitly handled.
 * Unknown or unimplemented rules FAIL loudly and never return PASS.
 */
export function verifySemanticInvariants(question: GeneratedQuestion): SemanticCheckResult {
	const ruleType = String(question.metadata?.ruleType ?? '');

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
			return {
				passed: false,
				ruleType,
				reason: `Unimplemented or unrecognized question category '${question.questionType}'`
			};
	}
}

// ============================================================================
// 1. NUMBER SEQUENCE SEMANTIC ORACLES (6 rules)
// ============================================================================

function verifyNumberSequenceSemantic(
	question: GeneratedQuestion,
	ruleType: string
): SemanticCheckResult {
	const sequence = question.metadata?.sequence as unknown[];
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

	switch (ruleType) {
		case 'arithmetic_sequence': {
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
			return { passed: true, ruleType };
		}

		case 'geometric_sequence': {
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
			return { passed: true, ruleType };
		}

		case 'square_number': {
			const allSquares = fullSequence.every((n) => n >= 0 && Math.round(Math.sqrt(n)) ** 2 === n);
			const allCubes = fullSequence.every((n) => Math.round(Math.cbrt(n)) ** 3 === n);
			if (!allSquares && !allCubes) {
				return {
					passed: false,
					ruleType,
					reason: `Elements must all be exact squares or all exact cubes; received [${fullSequence.join(', ')}]`
				};
			}
			return { passed: true, ruleType };
		}

		case 'fibonacci_like': {
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
			return { passed: true, ruleType };
		}

		case 'alternating_sequence': {
			// Mathematical recurrence check:
			// Either alternating (+add, -sub):
			//   d_odd = fullSequence[2k+1] - fullSequence[2k] is constant > 0
			//   d_even = fullSequence[2k+2] - fullSequence[2k+1] is constant < 0
			// OR alternating (*mult, +add):
			//   m_odd = fullSequence[2k+1] / fullSequence[2k] is constant integer >= 2
			//   d_even = fullSequence[2k+2] - fullSequence[2k+1] is constant
			if (fullSequence.length < 5) {
				return {
					passed: false,
					ruleType,
					reason: `Alternating sequence requires at least 5 terms; got ${fullSequence.length}`
				};
			}

			// Check Pattern 1: Additive alternating (+add, -sub)
			const add1 = fullSequence[1]! - fullSequence[0]!;
			const sub1 = fullSequence[2]! - fullSequence[1]!;
			let isAdditiveAlternating = add1 > 0 && sub1 < 0;
			if (isAdditiveAlternating) {
				for (let i = 3; i < fullSequence.length; i++) {
					const diff = fullSequence[i]! - fullSequence[i - 1]!;
					const expectedDiff = i % 2 === 1 ? add1 : sub1;
					if (diff !== expectedDiff) {
						isAdditiveAlternating = false;
						break;
					}
				}
			}

			if (isAdditiveAlternating) {
				return { passed: true, ruleType };
			}

			// Check Pattern 2: Multiplicative-Additive alternating (*m, +s)
			const mult1 = fullSequence[0]! !== 0 ? fullSequence[1]! / fullSequence[0]! : 0;
			const add2 = fullSequence[2]! - fullSequence[1]!;
			let isMultAddAlternating = Number.isInteger(mult1) && mult1 >= 2;
			if (isMultAddAlternating) {
				for (let i = 3; i < fullSequence.length; i++) {
					if (i % 2 === 1) {
						if (fullSequence[i - 1]! === 0 || fullSequence[i]! / fullSequence[i - 1]! !== mult1) {
							isMultAddAlternating = false;
							break;
						}
					} else {
						if (fullSequence[i]! - fullSequence[i - 1]! !== add2) {
							isMultAddAlternating = false;
							break;
						}
					}
				}
			}

			if (isMultAddAlternating) {
				return { passed: true, ruleType };
			}

			return {
				passed: false,
				ruleType,
				reason: `Alternating recurrence violated: sequence [${fullSequence.join(', ')}] does not follow alternating (+add, -sub) or (*mult, +add)`
			};
		}

		case 'increasing_difference': {
			// Mathematical recurrence check:
			// First differences d_i = fullSequence[i] - fullSequence[i-1]
			// Second differences D_i = d_i - d_{i-1} must be a constant stepIncrease > 0
			if (fullSequence.length < 4) {
				return {
					passed: false,
					ruleType,
					reason: `Increasing difference requires at least 4 terms; got ${fullSequence.length}`
				};
			}

			const firstStep = fullSequence[1]! - fullSequence[0]!;
			const secondStep = fullSequence[2]! - fullSequence[1]!;
			const stepIncrease = secondStep - firstStep;

			if (stepIncrease <= 0) {
				return {
					passed: false,
					ruleType,
					reason: `Increasing difference acceleration must be positive; got step increase ${stepIncrease}`
				};
			}

			for (let i = 3; i < fullSequence.length; i++) {
				const currentStep = fullSequence[i]! - fullSequence[i - 1]!;
				const prevStep = fullSequence[i - 1]! - fullSequence[i - 2]!;
				if (currentStep - prevStep !== stepIncrease) {
					return {
						passed: false,
						ruleType,
						reason: `Increasing difference invariant violated at index ${i}: expected step increase ${stepIncrease}, got ${currentStep - prevStep}`
					};
				}
			}

			return { passed: true, ruleType };
		}

		default:
			return {
				passed: false,
				ruleType,
				reason: `Unknown or unimplemented number sequence rule '${ruleType}'`
			};
	}
}

// ============================================================================
// 2. SYMBOL PATTERN SEMANTIC ORACLES (6 rules)
// ============================================================================

function verifySymbolPatternSemantic(
	question: GeneratedQuestion,
	ruleType: string
): SemanticCheckResult {
	const pattern = question.metadata?.pattern as unknown[];
	if (!Array.isArray(pattern) || pattern.length === 0) {
		return {
			passed: false,
			ruleType,
			reason: 'Symbol pattern metadata is missing or empty'
		};
	}

	if (typeof question.correctAnswer !== 'string' || question.correctAnswer.trim().length === 0) {
		return { passed: false, ruleType, reason: 'Correct answer symbol must be a non-empty string' };
	}

	// Full 6-element sequence
	const fullSequence: string[] = [...(pattern as string[]), question.correctAnswer];
	if (fullSequence.length !== 6) {
		return {
			passed: false,
			ruleType,
			reason: `Expected full symbol pattern of length 6, got ${fullSequence.length}`
		};
	}

	switch (ruleType) {
		case 'symbol_rotation': {
			// Sequence is produced by cyclic stepping through a distinct pool of 4 or 5 shapes.
			// With pool length L in {4, 5} and step s in {1, 2}:
			// If L=4, step=1: S[4] === S[0], S[5] === S[1], and S[0..3] are 4 distinct shapes.
			// If L=5, step=1: S[5] === S[0], and S[0..4] are 5 distinct shapes.
			// If L=4, step=2: S[2] === S[0], S[3] === S[1], S[4] === S[0], S[5] === S[1] with 2 distinct shapes.
			// If L=5, step=2: cyclic permutation with gcd(2, 5)=1, so 5 distinct shapes in S[0..4] and S[5] === S[0] (or 5-cycle step 2).
			// General cyclic invariant: elements must form a valid cyclic trajectory of length 6.
			const distinctCount = new Set(fullSequence).size;
			if (distinctCount < 2 || distinctCount > 5) {
				return {
					passed: false,
					ruleType,
					reason: `symbol_rotation requires between 2 and 5 distinct symbols; got ${distinctCount}`
				};
			}

			// Verify that either S[4]===S[0] && S[5]===S[1] (4-cycle) OR S[5]===S[0] (5-cycle) OR consistent 2-step period
			const is4Cycle = fullSequence[4] === fullSequence[0] && fullSequence[5] === fullSequence[1];
			const is5Cycle = fullSequence[5] === fullSequence[0];
			const is2Cycle = fullSequence[2] === fullSequence[0] && fullSequence[3] === fullSequence[1];

			if (!is4Cycle && !is5Cycle && !is2Cycle) {
				return {
					passed: false,
					ruleType,
					reason: `symbol_rotation cyclic sequence contract violated: [${fullSequence.join(', ')}]`
				};
			}

			return { passed: true, ruleType };
		}

		case 'alternating_symbol': {
			// Either period 2 (A, B, A, B, A, B with A !== B) OR period 3 (A, B, C, A, B, C with A, B, C distinct)
			const isPeriod2 =
				fullSequence[0] !== fullSequence[1] &&
				fullSequence.every((val, i) => val === fullSequence[i % 2]);

			const isPeriod3 =
				new Set(fullSequence.slice(0, 3)).size === 3 &&
				fullSequence.every((val, i) => val === fullSequence[i % 3]);

			if (!isPeriod2 && !isPeriod3) {
				return {
					passed: false,
					ruleType,
					reason: `alternating_symbol contract violated: sequence [${fullSequence.join(', ')}] is neither period 2 nor period 3`
				};
			}
			return { passed: true, ruleType };
		}

		case 'repeating_cycle': {
			// Cycle length k in {2, 3, 4} where first k elements are distinct and all i: S[i] === S[i % k]
			let validCycle = false;
			for (const k of [2, 3, 4]) {
				const cycleSlice = fullSequence.slice(0, k);
				if (new Set(cycleSlice).size === k) {
					if (fullSequence.every((val, i) => val === cycleSlice[i % k])) {
						validCycle = true;
						break;
					}
				}
			}

			if (!validCycle) {
				return {
					passed: false,
					ruleType,
					reason: `repeating_cycle contract violated: sequence [${fullSequence.join(', ')}] does not repeat a 2, 3, or 4-element cycle`
				};
			}
			return { passed: true, ruleType };
		}

		case 'shape_order': {
			// Cycle length 4 with 4 distinct shapes: S[4] === S[0] and S[5] === S[1]
			const first4 = fullSequence.slice(0, 4);
			if (new Set(first4).size !== 4) {
				return {
					passed: false,
					ruleType,
					reason: `shape_order requires 4 distinct shapes in the first 4 elements; got ${new Set(first4).size}`
				};
			}
			if (fullSequence[4] !== fullSequence[0] || fullSequence[5] !== fullSequence[1]) {
				return {
					passed: false,
					ruleType,
					reason: `shape_order cycle continuation violated: expected S[4]=${fullSequence[0]} and S[5]=${fullSequence[1]}; got S[4]=${fullSequence[4]}, S[5]=${fullSequence[5]}`
				};
			}
			return { passed: true, ruleType };
		}

		case 'growing_count': {
			// Easy: A, B, B, A, A, A (counts 1, 2, 3 of shapes A, B)
			// Med/Hard: A, B, B, C, C, C (counts 1, 2, 3 of distinct shapes A, B, C)
			const A = fullSequence[0]!;
			const B = fullSequence[1]!;
			const B2 = fullSequence[2]!;
			const C1 = fullSequence[3]!;
			const C2 = fullSequence[4]!;
			const C3 = fullSequence[5]!;

			if (B !== B2 || C1 !== C2 || C2 !== C3) {
				return {
					passed: false,
					ruleType,
					reason: `growing_count grouping violated: expected [A, B, B, C, C, C]; got [${fullSequence.join(', ')}]`
				};
			}
			if (A === B || B === C1) {
				return {
					passed: false,
					ruleType,
					reason: `growing_count requires adjacent groups to have different symbols: A=${A}, B=${B}, C=${C1}`
				};
			}
			return { passed: true, ruleType };
		}

		case 'mirrored_sequence': {
			// Easy/Med: A, B, C, C, B, A (palindrome: S[0]===S[5], S[1]===S[4], S[2]===S[3] with A,B,C distinct)
			// Hard: A, B, C, D, C, B (reflection around D: S[2]===S[4], S[1]===S[5] with A,B,C,D distinct)
			const isFullPalindrome =
				fullSequence[0] === fullSequence[5] &&
				fullSequence[1] === fullSequence[4] &&
				fullSequence[2] === fullSequence[3] &&
				new Set(fullSequence.slice(0, 3)).size === 3;

			const isReflectedAroundCenter =
				fullSequence[2] === fullSequence[4] &&
				fullSequence[1] === fullSequence[5] &&
				new Set(fullSequence.slice(0, 4)).size === 4;

			if (!isFullPalindrome && !isReflectedAroundCenter) {
				return {
					passed: false,
					ruleType,
					reason: `mirrored_sequence symmetry violated: sequence [${fullSequence.join(', ')}] is neither a full palindrome nor center-reflected`
				};
			}
			return { passed: true, ruleType };
		}

		default:
			return {
				passed: false,
				ruleType,
				reason: `Unknown or unimplemented symbol pattern rule '${ruleType}'`
			};
	}
}

// ============================================================================
// 3. MEMORY PATTERN SEMANTIC ORACLES (5 rules)
// ============================================================================

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

	const memorize = question.metadata?.memorize as unknown[];
	if (!Array.isArray(memorize) || memorize.length === 0) {
		return {
			passed: false,
			ruleType,
			reason: 'Memory pattern metadata.memorize must be a non-empty array'
		};
	}

	const difficulty = question.metadata?.difficulty as string | undefined;

	// Invariant: Sequence length per difficulty (easy: 5, medium: 6, hard: 7)
	if (difficulty) {
		const expectedLength = difficulty === 'hard' ? 7 : difficulty === 'medium' ? 6 : 5;
		if (memorize.length !== expectedLength) {
			return {
				passed: false,
				ruleType,
				reason: `Expected memorize sequence length ${expectedLength} for difficulty '${difficulty}', got ${memorize.length}`
			};
		}

		// Invariant: Reveal time per difficulty (easy: 4, medium: 3, hard: 2)
		const expectedReveal = difficulty === 'hard' ? 2 : difficulty === 'medium' ? 3 : 4;
		const revealSeconds = Number(question.metadata?.revealSeconds);
		if (revealSeconds !== expectedReveal) {
			return {
				passed: false,
				ruleType,
				reason: `Expected revealSeconds ${expectedReveal} for difficulty '${difficulty}', got ${revealSeconds}`
			};
		}
	}

	switch (ruleType) {
		case 'symbol_recall': {
			const targetIndex = Number(question.metadata?.targetIndex);
			if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= memorize.length) {
				return {
					passed: false,
					ruleType,
					reason: `Invalid or out-of-bounds targetIndex ${targetIndex} for symbol_recall`
				};
			}
			const expectedAnswer = String(memorize[targetIndex]);
			if (question.correctAnswer !== expectedAnswer) {
				return {
					passed: false,
					ruleType,
					reason: `symbol_recall answer mismatch: expected '${expectedAnswer}', got '${question.correctAnswer}'`
				};
			}
			return { passed: true, ruleType };
		}

		case 'position_recall': {
			const targetIndex = Number(question.metadata?.targetIndex);
			const targetSymbol = String(question.metadata?.targetSymbol ?? '');
			if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= memorize.length) {
				return {
					passed: false,
					ruleType,
					reason: `Invalid or out-of-bounds targetIndex ${targetIndex} for position_recall`
				};
			}
			if (memorize[targetIndex] !== targetSymbol) {
				return {
					passed: false,
					ruleType,
					reason: `position_recall targetSymbol '${targetSymbol}' does not match memorize[${targetIndex}]='${memorize[targetIndex]}'`
				};
			}
			// Verify target occurs exactly once in the sequence
			const count = memorize.filter((s) => s === targetSymbol).length;
			if (count !== 1) {
				return {
					passed: false,
					ruleType,
					reason: `position_recall targetSymbol '${targetSymbol}' must appear exactly once, but appears ${count} times`
				};
			}
			const expectedAnswer = String(targetIndex + 1);
			if (question.correctAnswer !== expectedAnswer) {
				return {
					passed: false,
					ruleType,
					reason: `position_recall answer mismatch: expected '${expectedAnswer}', got '${question.correctAnswer}'`
				};
			}
			return { passed: true, ruleType };
		}

		case 'sequence_recall': {
			const expectedAnswer = memorize.join(' > ');
			if (question.correctAnswer !== expectedAnswer) {
				return {
					passed: false,
					ruleType,
					reason: `sequence_recall answer mismatch: expected '${expectedAnswer}', got '${question.correctAnswer}'`
				};
			}
			return { passed: true, ruleType };
		}

		case 'missing_element_recall': {
			const missingIndex = Number(question.metadata?.missingIndex);
			if (!Number.isInteger(missingIndex) || missingIndex < 0 || missingIndex >= memorize.length) {
				return {
					passed: false,
					ruleType,
					reason: `Invalid or out-of-bounds missingIndex ${missingIndex} for missing_element_recall`
				};
			}
			const expectedAnswer = String(memorize[missingIndex]);
			if (question.correctAnswer !== expectedAnswer) {
				return {
					passed: false,
					ruleType,
					reason: `missing_element_recall answer mismatch: expected '${expectedAnswer}', got '${question.correctAnswer}'`
				};
			}
			return { passed: true, ruleType };
		}

		case 'reverse_sequence_recall': {
			const expectedAnswer = [...memorize].reverse().join(' > ');
			if (question.correctAnswer !== expectedAnswer) {
				return {
					passed: false,
					ruleType,
					reason: `reverse_sequence_recall answer mismatch: expected '${expectedAnswer}', got '${question.correctAnswer}'`
				};
			}
			return { passed: true, ruleType };
		}

		default:
			return {
				passed: false,
				ruleType,
				reason: `Unknown or unimplemented memory pattern rule '${ruleType}'`
			};
	}
}

// ============================================================================
// 4. MINI DEDUCTION SEMANTIC ORACLES (5 rules)
// ============================================================================

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

	const deductionTarget = question.metadata?.deductionTarget as string | undefined;
	const entities = question.metadata?.entities as string[] | undefined;

	if (typeof deductionTarget !== 'string' || deductionTarget.trim().length === 0) {
		return {
			passed: false,
			ruleType,
			reason: 'Mini deduction metadata.deductionTarget is missing or empty'
		};
	}

	if (!Array.isArray(entities) || entities.length === 0) {
		return {
			passed: false,
			ruleType,
			reason: 'Mini deduction metadata.entities must be a non-empty array'
		};
	}

	if (question.correctAnswer !== deductionTarget) {
		return {
			passed: false,
			ruleType,
			reason: `Mini deduction correct answer '${question.correctAnswer}' does not match deduction target '${deductionTarget}'`
		};
	}

	if (!entities.includes(deductionTarget)) {
		return {
			passed: false,
			ruleType,
			reason: `Mini deduction target '${deductionTarget}' is not among premise entities [${entities.join(', ')}]`
		};
	}

	switch (ruleType) {
		case 'comparison_chain': {
			// deductionTarget is the transitive leader (entities[0])
			if (deductionTarget !== entities[0]) {
				return {
					passed: false,
					ruleType,
					reason: `comparison_chain target must be entities[0]='${entities[0]}', got '${deductionTarget}'`
				};
			}
			return { passed: true, ruleType };
		}

		case 'object_ordering': {
			// deductionTarget is either entities[1] (easy) or entities[3] (med/hard)
			if (deductionTarget !== entities[1] && deductionTarget !== entities[3]) {
				return {
					passed: false,
					ruleType,
					reason: `object_ordering target must be entities[1] or entities[3], got '${deductionTarget}'`
				};
			}
			return { passed: true, ruleType };
		}

		case 'simple_elimination': {
			// deductionTarget is the non-eliminated entity (entities[0])
			if (deductionTarget !== entities[0]) {
				return {
					passed: false,
					ruleType,
					reason: `simple_elimination target must be entities[0]='${entities[0]}', got '${deductionTarget}'`
				};
			}
			return { passed: true, ruleType };
		}

		case 'true_false_clue': {
			// deductionTarget is the truth speaker (entities[0])
			if (deductionTarget !== entities[0]) {
				return {
					passed: false,
					ruleType,
					reason: `true_false_clue target must be entities[0]='${entities[0]}', got '${deductionTarget}'`
				};
			}
			return { passed: true, ruleType };
		}

		case 'position_reasoning': {
			// deductionTarget is the middle person (entities[1])
			if (deductionTarget !== entities[1]) {
				return {
					passed: false,
					ruleType,
					reason: `position_reasoning target must be entities[1]='${entities[1]}', got '${deductionTarget}'`
				};
			}
			return { passed: true, ruleType };
		}

		default:
			return {
				passed: false,
				ruleType,
				reason: `Unknown or unimplemented mini deduction rule '${ruleType}'`
			};
	}
}
