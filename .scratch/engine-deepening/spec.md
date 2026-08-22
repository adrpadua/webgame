# Engine Deepening

Status: active

## Source

An `/improve-codebase-architecture` review of `web/src/engine` (2026-08-21, main at `a86fd91`), built on a sub-agent friction survey plus co-change history. The full report with before/after diagrams is [architecture-review-20260821.html](architecture-review-20260821.html). Six candidates, in the report's order:

1. **Deepen the Fired Card into one module** (Strong) — issue 01, this session.
2. **Give the Round one seam** (Strong) — delivered, issue 02, this session. Directly serves the recorded intent to fold Loadout's job into Quick and Slow; `advancePhase.ts` has never committed without `resolve.ts` (13/13).
3. **State each content concept once** (Worth exploring) — delivered, issue 05, this session: seven concept modules, `schemas.ts` as the compatibility facade, `buildCatalog` down to composition.
4. **Let the board own the board** (Worth exploring) — first slice delivered (removePiece, issue 04, this session); facing and geometry slices remain. 107 direct `.board.*` accesses; no `removeEntity`; the host-liveness invariant implemented three times. First slice: `removeEntity`.
5. **One owner for the Beat kind vocabulary** (Worth exploring) — delivered, issue 03, this session. Included a live hazard worth taking alone: `escalation.ts` types Beat kinds as bare strings, so a renamed kind silently stops charging demands.
6. **Split engine.test.ts along its seams** (Worth exploring) — open. 5,532 lines, 97 hand-built state mutations vs 10 `runScenario` uses, three engine exports that exist only for tests.

## Ground rules

Every candidate is behavior-preserving: no rules change, no test-expectation change, no replay or fingerprint change. The evidence bar is the legality-modularization precedent (PR #147): zero test edits, mutation anchors re-pointed and verified, full isolated gate. Candidates touching `resolve.ts` land one at a time.

## Return protocol

Assignments and completion use the mandatory return packet in [the recovery kit](../../docs/agents/recovery-kit.md#mandatory-return-packet).
