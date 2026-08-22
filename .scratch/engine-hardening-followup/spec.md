# Engine Hardening Follow-up

Status: active

## Source and routing

[handoff.md](handoff.md) is the external reviewer's follow-up to the [engine-hardening handoff](../engine-hardening-handoff/spec.md), received 2026-08-21 after PRs #142 and #145 merged. It reviewed at `ea7d40c`, which predates PR #147 — so its P3 (legality modularization) and part of its documentation-cleanup item were already delivered when it arrived. The alignment assessment and this routing are the coordinator's, 2026-08-21.

## Baseline corrections for the reviewer

- **P3 is delivered** (PR #147, merge `29dd4cd`): `legality.ts` keeps the single seam with named per-command validators; the fire cluster lives in `fireLegality.ts` as one function because its targeting families are order-sensitive; `verdicts.ts` is the shared grammar. Zero test edits, mutation audit 115/115. The chosen structure differs from the handoff's six-file sketch but satisfies its constraints.
- **Absent GitHub check-runs are expected**: this repo gates locally (`verify:local` plus the mutation audit, run in isolation), and evidence is stamped into the issue files per delivery.

## Review 2 (main at `046641e`, received 2026-08-21)

[review-2-main-046641e.md](review-2-main-046641e.md) confirms issues 01 (PR #152) and the P3 delivery, and adds three items: a P0 build-portability defect (case-colliding UI module names — invisible to this repo's case-sensitive gates), the `board_slot` command-shape decision (issue 06), and materializing the open issue files (done). One staleness to note for the reviewer: its P3 section describes the pre-#155 mutual-zero test; PR #155 (merged `8837916`) replaced it with the real-tree version and retracted the `checkResolution` export it asks about.

## Delivery sequence

1. **Issue 01 — P0, exhaustive fire-target enumeration** (delivered, PR #152): every schema target family enumerated; the target-family contract matrix; the same exhaustiveness pushed into every `FireTargeting.mode` consumer.
2. **Issue 02 — P4, direct resolver-level terminal tests** (delivered, PR #155): real-tree mutual zero, detonation-mid-tree, phase-terminal-during-script; the `checkResolution` export retracted.
3. **Issue 05 — review 2's P0, build-portability rename + casing guard** (this session): the four colliding pairs renamed, `check-module-casing.mjs` wired into `verify:local`.
4. **Issue 03 — P1, the payment-enumeration contract** (delivered, this session, D-107): complete enumeration adopted — every payment alternative offered, the representative `hand[0]` convention retired, revisitable at the resumable-resolution seam. No grouping helper: nothing outside the engine reads `legalActions`.
5. **Issue 04 — P2, the runtime trust boundary** (delivered, this session): a runtime-validated player-command entry point sharing the Scenario schema authority; raw system-action resolution stays on the internal seam.
6. **Issue 06 — review 2's P2, the board_slot command shape** (open): one Slot identity across every surface, decided before the family's first card ships.

The reviewer's deferred item (resumable resolution) keeps its existing trigger, recorded in the parent handoff's issue 04. Review 1's documentation-cleanup item (the parent spec's stale status lines) was folded into issue 01's delivery.

## Non-goals

The handoff's own list stands: no reducer rewrite, no effect DSL, no competing legality predicates, no rules in UI components, no premature suspension stack, no replay breaks.

## Return protocol

Assignments and completion use the mandatory return packet in [the recovery kit](../../docs/agents/recovery-kit.md#mandatory-return-packet).
