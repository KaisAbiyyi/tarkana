# Procedural Generator Benchmark & Invariant Oracle Methodology

> Tarkana Milestone P1.8.1 — Challenge Quality, Generator Benchmarks & Admin Diagnostics  
> Technical Specification, Oracle Definitions, and Benchmark Contracts

---

## 1. Overview & Architectural Principles

Tarkana generates logic challenges procedurally server-side using deterministic pseudo-random generators (`createSeededRng`) parameterized by seed tokens, difficulty bands, and rule definitions. Procedural questions power all ranked and unranked challenges, including **Quick**, **Standard**, **Long**, **Mode**, **Daily**, and **Blind Duel** replays.

To guarantee product integrity, fairness, and anti-cheat confidence, procedural questions must strictly satisfy four tiers of validation:

```text
+------------------------------------------------------------------------+
| 1. Structural Validation (RuleValidator / JSON Schema)                 |
|    - Non-empty prompt, explanation, choices, correctAnswer             |
|    - At least 2 choices (default 4 choices), exactly 1 correct answer  |
|    - Positive difficultyScore and timeLimitSeconds                      |
+------------------------------------------------------------------------+
                                   |
+------------------------------------------------------------------------+
| 2. Choice Normalization & Ambiguity Detection                          |
|    - Normalized string/symbol representation uniqueness                |
|    - Exactly 1 normalized choice matches the normalized correctAnswer  |
|    - Anomaly counters included in overall benchmark failure rate       |
+------------------------------------------------------------------------+
                                   |
+------------------------------------------------------------------------+
| 3. Semantic Invariant Oracles (All 22 Rules Covered)                  |
|    - Rule-specific mathematical, logical, and memory ground truth      |
|    - Full recurrence verification for sequence & pattern rules         |
|    - Unknown/unimplemented rules fail loudly (never default to PASS)   |
+------------------------------------------------------------------------+
                                   |
+------------------------------------------------------------------------+
| 4. Deterministic Reconstruction & Replay Invariance                     |
|    - Deep object equality (isDeepEqual) for identical inputs           |
|    - Daily HMAC-SHA256 canonical snapshot determinism                  |
|    - Synthetic Duel DTO replay vs production transactional spawn       |
+------------------------------------------------------------------------+
```

---

## 2. Dynamic Rule Inventory Derivation

Tarkana avoids hardcoded rule counts. Rule types are dynamically aggregated from the generator registries:
- `NUMBER_SEQUENCE_RULES` (6 rules): `arithmetic_sequence`, `geometric_sequence`, `square_number`, `fibonacci_like`, `alternating_sequence`, `increasing_difference`.
- `SYMBOL_PATTERN_RULES` (6 rules): `symbol_rotation`, `alternating_symbol`, `repeating_cycle`, `shape_order`, `growing_count`, `mirrored_sequence`.
- `MINI_DEDUCTION_RULES` (5 rules): `comparison_chain`, `object_ordering`, `simple_elimination`, `true_false_clue`, `position_reasoning`.
- `MEMORY_PATTERN_RULES` (5 rules): `symbol_recall`, `position_recall`, `sequence_recall`, `missing_element_recall`, `reverse_sequence_recall`.

Total rule inventory is queried at runtime via `getRuleInventory()` and `getAllRuleTypes()` exported from `$lib/server/challenge/generators/registry`. Tests, CLI runners, and admin dashboards must never hardcode rule counts.

---

## 3. Invariant Oracle Verification (All 22 Active Rules)

Semantic non-ambiguity requires mathematical or deductive proofs beyond structural schema validation. Unimplemented or unknown rules fail loudly with `passed: false`.

### 3.1 Number Sequences (6 Rules)
1. **`arithmetic_sequence`**: Constant first difference: $\forall i \ge 2: a_i - a_{i-1} = \Delta$.
2. **`geometric_sequence`**: Constant non-zero ratio: $a_0 \ne 0 \land \forall i \ge 2: \frac{a_i}{a_{i-1}} = r \ne 0$.
3. **`square_number`**: All elements are exact squares ($\lfloor\sqrt{x}\rfloor^2 = x$) or exact cubes ($\lfloor\sqrt[3]{x}\rfloor^3 = x$).
4. **`fibonacci_like`**: Consistent second-order linear recurrence: $\forall i \ge 3: a_i = a_{i-1} + a_{i-2} + c$, where $c = a_2 - (a_1 + a_0)$.
5. **`alternating_sequence`**: Strict 2-periodic recurrence. Validated against either:
   - *Additive alternating* ($+add, -sub$): $a_{2k+1} - a_{2k} = d_1 > 0$ and $a_{2k+2} - a_{2k+1} = d_2 < 0$.
   - *Multiplicative-additive* ($\times mult, +add$): $a_{2k+1} = a_{2k} \times m$ ($m \ge 2$) and $a_{2k+2} = a_{2k+1} + s$.
6. **`increasing_difference`**: Constant positive second difference (constant acceleration):
   $d_i = a_i - a_{i-1}$ satisfies $d_i - d_{i-1} = \delta > 0$ for all $i \ge 2$.

### 3.2 Symbol Patterns (6 Rules)
The complete sequence of 6 elements $S = [\dots\text{pattern.visible}, \text{correctAnswer}]$ is validated:
1. **`symbol_rotation`**: Sequence is generated by cyclic stepping through a distinct pool of 4 or 5 shapes. Verified as a valid cyclic permutation trajectory.
2. **`alternating_symbol`**: Strictly periodic with period 2 ($A, B, A, B, A, B$ with $A \ne B$) or period 3 ($A, B, C, A, B, C$ with $A, B, C$ distinct).
3. **`repeating_cycle`**: Strictly periodic with cycle length $k \in \{2, 3, 4\}$, where the first $k$ elements are pairwise distinct.
4. **`shape_order`**: 4 distinct shapes in the first 4 elements, with cycle continuation: $S[4] = S[0]$ and $S[5] = S[1]$.
5. **`growing_count`**: Grouping pattern of 1, 2, 3 counts: $S[1] = S[2]$ and $S[3] = S[4] = S[5]$, with $S[0] \ne S[1]$ and $S[1] \ne S[3]$.
6. **`mirrored_sequence`**: Symmetric reflection. Either full palindrome ($S[0]=S[5], S[1]=S[4], S[2]=S[3]$ with 3 distinct shapes) or center reflection ($S[2]=S[4], S[1]=S[5]$ with 4 distinct shapes).

### 3.3 Memory Patterns (5 Rules)
All memory rules validate their difficulty SLA contract:
- Sequence length: Easy = 5, Medium = 6, Hard = 7.
- Reveal duration: Easy = 4s, Medium = 3s, Hard = 2s.

Rule-specific verification against structured server metadata:
1. **`symbol_recall`**: $\text{correctAnswer} = \text{memorize}[\text{targetIndex}]$.
2. **`position_recall`**: Target symbol appears exactly once in the sequence; $\text{correctAnswer} = \text{String}(\text{targetIndex} + 1)$.
3. **`sequence_recall`**: $\text{correctAnswer} = \text{memorize.join(' > ')}$.
4. **`missing_element_recall`**: $\text{correctAnswer} = \text{memorize}[\text{missingIndex}]$.
5. **`reverse_sequence_recall`**: $\text{correctAnswer} = [\dots\text{memorize}].\text{reverse}().\text{join(' > ')}$.

### 3.4 Mini Deduction (5 Rules)
Mini deduction generators expose structured metadata (`deductionTarget` and `entities`):
1. **Common Contract**: `deductionTarget === correctAnswer`, and `entities` contains `deductionTarget`.
2. **`comparison_chain`**: `deductionTarget` matches `entities[0]` (the transitive maximum).
3. **`object_ordering`**: `deductionTarget` matches `entities[1]` (easy) or `entities[3]` (medium/hard).
4. **`simple_elimination`**: `deductionTarget` matches `entities[0]` (the non-eliminated entity).
5. **`true_false_clue`**: `deductionTarget` matches `entities[0]` (the truthful speaker).
6. **`position_reasoning`**: `deductionTarget` matches `entities[1]` (the middle position).

---

## 4. Daily Challenge & Duel Replay Verification

### 4.1 Daily Challenge Snapshot Determinism
Daily challenges derive a canonical seed server-side using HMAC-SHA256:
$$\text{seed} = \text{HMAC-SHA256}(\text{DAILY\_CHALLENGE\_SECRET}, \text{"tarkana:daily:"} \parallel \text{YYYY-MM-DD} \parallel \text{":cfg1:gen1"})$$
- Generates 10 questions using the fixed daily difficulty distribution: 30% Easy, 40% Medium, 30% Hard.
- Deterministic reconstruction is verified using deep object equality (`isDeepEqual`), preventing key-order or string-serialization differences from masking replay drift.

### 4.2 Duel Replay Fidelity: Synthetic DTO vs Production Transaction
- **Synthetic DTO Replay (`runSyntheticDuelDtoReplayBenchmark`)**: In-memory benchmark validating deep equality of simulated memory DTO mappings. Does not access the database.
- **Production Duel Session Spawn (`spawnParticipantSessionTransaction`)**: Production duels copy questions within an atomic PostgreSQL transaction. Any concurrent race on the unique participant constraint triggers transaction rollback. Production replay tests run in the database integration test suite (`duel-concurrency.integration.spec.ts`).

---

## 5. Failure Rate Reporting & Choice Anomaly Integration

Observed failure rates integrate all four failure modes:
1. `structuralFailures`: Schema validation errors.
2. `semanticFailures`: Mathematical or deductive invariant violations.
3. `reconstructionMismatches`: Deterministic replay inequality.
4. `duplicateChoiceAnomalies` and `ambiguousChoiceAnomalies`: Choice collision or multiple correct answers.

$$\text{overallFailures} = N_{\text{struct}} + N_{\text{sem}} + N_{\text{recon}} + N_{\text{dup}} + N_{\text{ambig}}$$
$$\text{overallObservedFailureRatePct} = \frac{\text{overallFailures}}{N_{\text{total}}} \times 100$$

Reporting statement convention:
```text
0 failures in N generated samples across K rule combinations (observed rate: 0.00%)
```

---

## 6. CLI Benchmark Runner & Reproducibility

The CLI runner (`scripts/run-generator-benchmark.mjs`) supports reproducible benchmarking:
```bash
# Standard reproducible run (default seedPrefix 'tarkana-bench-v1')
npm run benchmark

# Custom seed prefix for regression investigations
node scripts/run-generator-benchmark.mjs --seed-prefix=investigation-202610 --iterations=200

# High-volume stress run (250 iterations per combination = 16,500 samples)
npm run benchmark -- --iterations=250

# Output raw JSON with Git commit SHA and generator/config versions
npm run benchmark -- --json > report.json
```

Benchmark artifacts record:
- `commitSha`: Exact Git commit SHA (or fallback).
- `seedPrefix`: Configured seed prefix.
- `configVersions`: Daily config and generator versions.
- `aggregateLatency`: `minMs`, `p50Ms`, `p90Ms`, `p95Ms`, `p99Ms`, `maxMs`, `avgMs`.
