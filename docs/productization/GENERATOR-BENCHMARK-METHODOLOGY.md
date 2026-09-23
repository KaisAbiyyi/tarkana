# Procedural Generator Benchmark & Invariant Oracle Methodology

> Tarkana Milestone P1.8 — Challenge Quality, Generator Benchmarks & Admin Diagnostics  
> Technical Specification, Oracle Definitions, and Benchmark Contracts

---

## 1. Overview & Architectural Principles

Tarkana generates logic challenges procedurally server-side using deterministic pseudo-random generators (`createSeededRng`) parameterized by seed tokens, difficulty bands, and rule definitions. Procedural questions power all ranked and unranked challenges, including **Quick**, **Standard**, **Long**, **Mode**, **Daily**, and **Blind Duel** replays.

To guarantee product integrity, fairness, and anti-cheat confidence, procedural questions must strictly satisfy four tiers of validation:

```
+------------------------------------------------------------------------+
| 1. Structural Validation (RuleValidator / JSON Schema)                 |
|    - Non-empty prompt, explanation, choices, correctAnswer              |
|    - Exactly 4 choices, answer in choices, valid timeLimitSeconds       |
+------------------------------------------------------------------------+
                                   |
+------------------------------------------------------------------------+
| 2. Choice Normalization & Ambiguity Detection                          |
|    - Normalized string/symbol representation uniqueness                |
|    - Exactly 1 normalized choice matches the normalized correctAnswer  |
+------------------------------------------------------------------------+
                                   |
+------------------------------------------------------------------------+
| 3. Semantic Invariant Oracles                                          |
|    - Rule-specific mathematical and logical ground truth verification  |
|    - Arithmetic step consistency, geometric factor ratios, powers,     |
|      deduction clue consistency, and memory token correspondence       |
+------------------------------------------------------------------------+
                                   |
+------------------------------------------------------------------------+
| 4. Deterministic Reconstruction & Replay Invariance                     |
|    - Deep object equality for identical seed, difficulty, and inputs   |
|    - Daily HMAC-SHA256 canonical snapshot determinism                  |
|    - Duel immutable participant replay fidelity                        |
+------------------------------------------------------------------------+
```

---

## 2. Dynamic Rule Inventory Derivation

Tarkana avoids hardcoded rule counts. Rule types are dynamically aggregated from the generator registries:
- `NUMBER_SEQUENCE_RULES`: `arithmetic_sequence`, `geometric_sequence`, `square_number`, `fibonacci_like`, `alternating_sequence`, `increasing_difference`.
- `SYMBOL_PATTERN_RULES`: `symbol_rotation`, `alternating_symbol`, `repeating_cycle`, `shape_order`, `growing_count`, `mirrored_sequence`.
- `MINI_DEDUCTION_RULES`: `comparison_chain`, `object_ordering`, `simple_elimination`, `true_false_clue`, `position_reasoning`.
- `MEMORY_PATTERN_RULES`: `symbol_recall`, `position_recall`, `sequence_recall`, `missing_element_recall`, `reverse_sequence_recall`.

Total rule inventory is queried at runtime via `getRuleInventory()` and `getAllRuleTypes()` exported from `$lib/server/challenge/generators/registry`. Tests, CLI runners, and admin dashboards must never hardcode rule counts.

---

## 3. Invariant Oracle Verification

### 3.1 Structural Schema vs Semantic Invariant
Structural integrity ensures that question payloads match SvelteKit and database constraints. Semantic non-ambiguity requires mathematical or deductive proofs:

1. **Number Sequences**:
   - `arithmetic_sequence`: Invariant $\forall i \ge 2: a_i - a_{i-1} = \Delta$.
   - `geometric_sequence`: Invariant $\forall i \ge 2: \frac{a_i}{a_{i-1}} = r \ne 0$.
   - `square_number`: Every sequence element $x$ satisfies $\lfloor\sqrt{x}\rfloor^2 = x$ (or $\lfloor\sqrt[3]{x}\rfloor^3 = x$ for cube variants).
   - `fibonacci_like`: Invariant $\forall i \ge 3: a_i = a_{i-1} + a_{i-2} + c$.

2. **Symbol Patterns**:
   - Correct answer must be a valid recognized token.
   - Rotations, cyclic permutations, and mirror images must maintain valid symbol token geometry.

3. **Mini Deduction**:
   - Prompt length and clue consistency: clues must not introduce contradictions.
   - The correct answer deduced from clues must exist in the choice list without ambiguity.

4. **Memory Patterns**:
   - Memorized sequence length conforms to difficulty: 5 (easy), 6 (medium), 7 (hard).
   - Reveal time conforms to difficulty: 4s (easy), 3s (medium), 2s (hard).
   - Distractors are generated via transpositions, single-symbol mutations, and random pool permutations to prevent distractor starvation or duplicate choices.

---

## 4. Daily Challenge & Duel Replay Verification

### 4.1 Daily Challenge Snapshot Determinism
Daily challenges derive a canonical seed server-side using HMAC-SHA256:
$$\text{seed} = \text{HMAC-SHA256}(\text{DAILY\_CHALLENGE\_SECRET}, \text{"tarkana:daily:"} \parallel \text{YYYY-MM-DD} \parallel \text{":cfg1:gen1"})$$
- Generates 10 questions using the fixed daily difficulty distribution: 30% Easy, 40% Medium, 30% Hard.
- Generating the snapshot across identical dates and secrets must produce 100% deep equality.

### 4.2 Duel Replay Invariance
Blind Duels replay immutable challenger question snapshots. Duels are unrated (`ratingDelta = 0`) and never generate new procedural questions on the fly. Replay verification tests ensure that replicating participant sessions from challenger question snapshots produces identical prompts, choices, answers, explanations, and ordering.

---

## 5. Failure Rate Reporting Convention

Observed failure rates must be communicated honestly without claiming universal zero defect rates:
```text
0 failures in N generated samples (observed rate: 0.00%)
```
When anomalies occur, the exact failure type (`structural`, `semantic`, `choice`, or `reconstruction`), failing seed, and stack trace are isolated in the benchmark report.

---

## 6. CLI Benchmark Runner & CI Guardrails

Run the benchmark suite from the CLI:
```bash
# Standard run (100 iterations per rule x difficulty = 6,600 samples)
npm run benchmark

# High-volume stress run (250 iterations per combination = 16,500 samples)
npm run benchmark -- --iterations=250

# Output raw JSON for automation or CI artifact upload
npm run benchmark -- --json > report.json
```

The benchmark saves an execution report to:
`docs/productization/artifacts/generator-benchmark-report.json`.

### CI Regression Latency Guardrails
Benchmark latency measurements capture `p50`, `p90`, `p95`, `p99`, `min`, `max`, and `avg`. To prevent flaky CI failures across heterogeneous runner hardware:
- Generous unit test timeout and latency guardrails are configured ($\text{avg} < 50\text{ms}$, $\text{max} < 300\text{ms}$).
- Sub-millisecond strict latency gates are reserved for standalone CLI benchmarking in dedicated environments.
