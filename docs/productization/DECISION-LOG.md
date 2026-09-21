# Tarkana Architecture Decision Log (ADR)

> Records significant architectural, product, and legal decisions for Tarkana.

---

## ADR-0001: Software Licensing Strategy

### Status
Accepted (Phase P0.1)

### Context
In Phase P0, a default permissive MIT license was placed in the repository root.

However, Tarkana is transitioning from an exploratory beta into a commercially operated consumer product. The platform contains:
1. Proprietary procedural puzzle and question generators (`src/lib/server/challenge/generators/`).
2. Anti-cheat and anomaly detection heuristics (`src/lib/server/scoring/suspicious-session.ts`).
3. Competitive ELO-style ranking calibration and scoring curves (`src/lib/server/scoring/`).
4. Brand identity, domain logic, and proprietary design system.

Under a permissive MIT license:
- Any competitor or malicious actor can fork the repository, clone the puzzle generation algorithms and anti-cheat mitigations, and run a competing ranked service with zero attribution or revenue share.
- Anti-cheat mechanics and question seed formulas would be legally free for exploit developers to study and circumvent.

### Decision
1. Change the repository license from permissive **MIT** to **Proprietary / All Rights Reserved**.
2. Preserve source code visibility for internal collaborators and authorized auditors.
3. If public source code release is desired in future phases, adopt a **Business Source License (BSL 1.1)** or **AGPL-3.0 (Network Copyleft)** with an explicit exception structure, subject to a future ADR.

### Consequences
- `LICENSE` is updated to Proprietary / All Rights Reserved.
- Unambiguous legal protection for Tarkana's core algorithms, brand, and competitive integrity.
- Third parties cannot freely clone or commercialize Tarkana intellectual property without a written commercial license.
