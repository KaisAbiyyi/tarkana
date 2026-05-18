# Challenge Engine Requirements and Constraints

## Question Output Requirements

Each generated question must contain:

- question type.
- prompt.
- choices.
- correct answer.
- explanation.
- difficulty score.
- time limit.
- metadata rule.
- generated seed.

Before a question is sent to browser, strip:

- correct answer.
- private validation metadata.
- any internal solution hints not intended for active play.

## Supported Question Types

Number sequence:

- arithmetic sequence.
- geometric sequence.
- square number.
- Fibonacci-like sequence.
- alternating sequence.
- mixed simple operation.
- increasing difference.
- decreasing difference.
- multiply then add pattern.
- add then multiply pattern.

Symbol pattern:

- symbol rotation.
- shape order.
- alternating symbol.
- growing count.
- mirrored sequence.
- repeating cycle.
- position shifting.
- color cycle.
- shape transformation.

Mini deduction:

- comparison chain.
- object ordering.
- true/false clue.
- simple elimination.
- tallest/shortest/fastest/highest/lowest reasoning.
- position reasoning.
- category matching.
- relationship inference.

Memory pattern:

- symbol recall.
- position recall.
- color recall.
- sequence recall.
- missing element recall.
- reverse sequence recall.
- count recall.
- pair recall.

## Generator Constraints

- Use deterministic seedable randomness.
- Store seed with every generated question.
- Choices must be unique after normalization.
- Exactly one choice must match the correct answer after normalization.
- Distractors must be plausible for the rule.
- Difficulty score must be within configured range.
- Time limit must come from active rule/config or safe default.
- RuleValidator must reject ambiguous, duplicate, missing-answer, or malformed questions.
- Generator failures must be explicit and recoverable by trying another active rule.

## ChallengeBuilder Constraints

- Question count is not permanently hardcoded.
- Default standard challenge uses 10 questions.
- Quick challenge default uses 5 questions.
- Long challenge default uses 20 questions.
- Daily challenge default uses 10 questions if implemented.
- Mixed challenge distribution is percentage/config driven.
- Builder must respect active categories and active rules.
- Builder must respect target difficulty distribution.
- Builder must handle unavailable rules by retrying or falling back inside allowed config.
- Builder must fail safely if it cannot generate enough valid questions.

## Adaptive Difficulty Requirements

Use PRD distribution:

```text
rating 0-499: easy 60, medium 40, hard 0
rating 500-999: easy 40, medium 50, hard 10
rating 1000-1499: easy 20, medium 60, hard 20
rating 1500-1999: easy 10, medium 50, hard 40
rating 2000+: easy 0, medium 40, hard 60
```

Distribution uses percentages, not fixed counts.

## Scoring Requirements

Question score:

```text
Question Score = Difficulty Score * Accuracy Multiplier * Time Multiplier
```

Accuracy multiplier:

- correct answer: `1.0`
- wrong answer: `0`

Time multiplier:

- 75-100 percent remaining: `1.5`
- 50-74 percent remaining: `1.3`
- 25-49 percent remaining: `1.1`
- 1-24 percent remaining: `1.0`
- time expired: `0`

Session score:

```text
Session Score = Total Question Score + Accuracy Bonus + Streak Bonus
```

Accuracy bonus:

- 100 percent: `150`
- 90-99 percent: `100`
- 80-89 percent: `60`
- 70-79 percent: `30`
- below 70 percent: `0`

Streak bonus:

- 3 correct in a row: `20`
- 5 correct in a row: `50`
- 10 correct in a row: `120`

## Rating and Rank Requirements

Rating delta:

- 90-100 percent accuracy: `+40`
- 80-89 percent accuracy: `+25`
- 70-79 percent accuracy: `+10`
- 50-69 percent accuracy: `0`
- below 50 percent accuracy: `-10`

Add a small difficulty modifier only if implemented consistently and tested. If not implemented in MVP, document that rating delta follows the base table exactly.

Rank table:

- Unranked: no completed challenge.
- Bronze Mind: 0-499.
- Silver Solver: 500-999.
- Gold Analyst: 1000-1499.
- Platinum Strategist: 1500-1999.
- Diamond Reasoner: 2000-2499.
- Mastermind: 2500+.

Rank promotion:

- Result must indicate promotion when rank after session is higher than rank before session.

## Anti-Cheat Constraints

- Client cannot submit score.
- Client cannot submit correctness.
- Client cannot submit rating delta.
- Client cannot submit rank.
- Client cannot submit server user id.
- Correct answer is not sent before answer submission.
- Answer cannot be changed after submit.
- User cannot go back to previous question in ranked mode.
- Server validates timer.
- Suspicious sessions do not count toward leaderboard.

Suspicious criteria:

- invalid time values.
- impossible response speed.
- repeated tab switching signal from browser telemetry.
- answer submitted for question outside session order.
- request manipulation or user id mismatch.

## Out of Scope

- AI question generation.
- Genetic algorithm.
- Coding/programming challenges.
- Multiplayer real-time.
- Advanced anti-cheat beyond MVP flags.
- Android implementation.

