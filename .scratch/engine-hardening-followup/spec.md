# Engine Hardening Follow-up

Status: active

## Source and routing

[handoff.md](handoff.md) is the external reviewer's follow-up to the [engine-hardening handoff](../engine-hardening-handoff/spec.md), received 2026-08-21 after PRs #142 and #145 merged. It reviewed at `ea7d40c`, which predates PR #147 — so its P3 (legality modularization) and part of its documentation-cleanup item were already delivered when it arrived. The alignment assessment and this routing are the coordinator's, 2026-08-21.

## Baseline corrections for the reviewer

- **P3 is delivered** (PR #147, merge `29dd4cd`): `legality.ts` keeps the single seam with named per-command validators; the fire cluster lives in `fireLegality.ts` as one function because its targeting families are order-sensitive; `verdicts.ts` is the shared grammar. Zero test edits, mutation audit 115/115. The chosen structure differs from the handoff's six-file sketch but satisfies its constraints.
- **Absent GitHub check-runs are expected**: this repo gates locally (`verify:local` plus the mutation audit, run in isolation), and evidence is stamped into the issue files per delivery.

## Delivery sequence

1. **Issue 01 — P0, exhaustive fire-target enumeration** (this session): every schema target family enumerated; the target-family contract matrix; the same exhaustiveness pushed into every `FireTargeting.mode` consumer.
2. **Issue 02 — P4, direct resolver-level terminal tests** (open): real-tree mutual zero, detonation-mid-tree, phase-terminal-during-tree; then reconsider the `checkResolution` export, which exists only for the current mutual-zero unit test.
3. **Issue 03 — P1, the payment-enumeration contract** (open): decide complete-vs-representative and write it down. The reviewer recommends full enumeration with UI grouping above the engine; the EDOPro research note predicts the future resumable-resolution seam subsumes payment choice — whichever way this lands, record it as revisitable at that seam's trigger.
4. **Issue 04 — P2, the runtime trust boundary** (open, pre-multiplayer): a runtime-validated player-command entry point sharing the Scenario schema authority; raw system-action resolution stays on the internal seam.

The reviewer's deferred item (resumable resolution) keeps its existing trigger, recorded in the parent handoff's issue 04. Its documentation-cleanup item (the parent spec's stale status lines) is folded into issue 01's delivery.

## Non-goals

The handoff's own list stands: no reducer rewrite, no effect DSL, no competing legality predicates, no rules in UI components, no premature suspension stack, no replay breaks.

## Return protocol

Assignments and completion use the mandatory return packet in [the recovery kit](../../docs/agents/recovery-kit.md#mandatory-return-packet).
