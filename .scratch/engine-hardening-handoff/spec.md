# Engine Hardening Handoff

Status: closed — every routed issue delivered (issues 01–03 via PRs #142, #145, #147; issue 04 deferred to its recorded trigger). Follow-up review received 2026-08-21 and routed as [engine-hardening-followup](../engine-hardening-followup/spec.md).

## Source and routing

[handoff.md](handoff.md) is an external architecture review of `web/src/engine`, received 2026-08-21 and routed by the user. Its seven priorities were assessed against the delivered event-registry work (ADR 0041, D-085–D-092) before routing; the overlap assessment is recorded here so nobody re-litigates delivered ground.

## Overlap assessment (coordinator, 2026-08-21)

- **Already delivered before the review landed**: P4's triggers/readers quarter (the event registry extracted exactly that from `fire_slot`); P5's subscriber-ordering half (ADR 0041's ordering rule, the Elian+Maren test, sealed-replay scaffolding).
- **Standing invariants we already meet**: P6 (the phase engine is untouched and stays explicit) and P7 (determinism — ADR 0012/0019, Records, sweeps). One clarification for the record: P6/P7's non-goal "no generic event bus" does not indict `EVENT_REGISTRY`, which is a closed, catalog-validated, load-guarded table — the structural opposite of a generic bus.
- **Converging with the EDOPro research note** (`docs/content/research/2026-08-20-edopro-engine-modernization-lessons.md`): P1 is the static half of the resumable-resolution seam's command boundary; P4's future-card list is that seam's trigger list; P2 doubles down on enumeration where the note predicts questions — resolved by doing P2 now without investing in making enumeration clever, since the suspension seam later subsumes it.

## Delivery sequence

1. **Issue 01 — P2 + P1, the command space** (delivered this session): the declared player-command vocabulary, the completed enumeration, the guarded external seam.
2. **Issue 02 — P5, terminal-state formalization** (delivered, PR #145, D-096): the consequence-tree vs terminal-state ordering rule, simultaneous victory/defeat, tested rather than incidental.
3. **Issue 03 — P3, legality modularization** (delivered, PR #147): focused validators behind the single `legality` seam. Housekeeping; no rules change.
4. **Issue 04 — P4, the fire_slot audit** (deferred to trigger): folds into the resumable-resolution ADR when interception, reaction cards, or true multiplayer enters the backlog; auditing it twice would be waste.

## Non-goals

The handoff's own: no reducer rewrite, no DSL, no generic ECS/event bus, no data-driven phases, no replay breaks. Plus ours: no pre-emptive suspension seam (issue 04's trigger owns that).

## Return protocol

Assignments and completion use the mandatory return packet in [the recovery kit](../../docs/agents/recovery-kit.md#mandatory-return-packet).
