# Mechanics Extension

Status: active

## Source and routing

[handoff.md](handoff.md) is an external mechanics-extensibility roadmap, received 2026-08-22 against post-#165 main (its engine inventory names the runtime-validated command boundary, so it reviewed current work). Its brief: widen the design space toward Spirit Island / Sentinels / Gloomhaven / Into the Breach-class mechanics by adding a small set of closed primitives — explicitly **not** a DSL, an ECS, a generic event bus, or arbitrary expressions. The goal-state question for any new mechanic becomes "which existing primitives compose into this?".

## Overlap assessment (coordinator, 2026-08-22)

- **Already the house philosophy**: §6's event rules are ADR 0041 verbatim; §5's closed-gate conditions are the Signature Grant grammar; the §Architectural Invariants list (determinism, one legality authority, complete enumeration, closed vocabularies, no silent partial support) is what the engine-hardening and deepening arcs just finished enforcing.
- **Already recorded elsewhere**: §12/§13 (resumable resolution, player reactions) defer to exactly the trigger recorded in the engine-hardening handoff's issue 04 and the EDOPro research note — reaction cards / interception / choose-one / multiplayer, as its own ADR. §10 (replacement/prevention) is explicitly deferred by the handoff itself.
- **The live gap §1 names is real**: the engine has parallel selection projections today — `fireTargeting`'s per-family enumerations, `selectBeatTarget`'s selector, `minionIntent`'s nearest-Hero — each deterministic alone, none sharing a vocabulary. P0 converges them on one seam.

## Delivery sequence

1. **Issue 01 — P0, the selector/query foundation** (this session): a closed, deterministic query vocabulary (`selectEntities`/`selectHexes`) with the handoff's seven acceptance demonstrations; consumers converge incrementally after.
2. **Issue 02 — P1, persistent modifiers** (open): temporary/ongoing rule changes as a first-class concept distinct from Counters; prove with the handoff's six acceptance points on a small real subset.
3. **Issue 03 — P2, board-space semantics** (open): authored terrain/tags/state on hexes, integrated with the selector vocabulary; Hazards and hex Counters keep working.
4. **Issue 04 — P3, event expansion policy** (open, content-driven): registry rows added only when real mechanics subscribe; the ADR 0041 rules restated as the bar.
5. **Issue 05 — P4, resources investigation** (open, trigger-gated): only if multiple character designs independently outgrow Charges/Counters/cards/Hero fields.
6. **Issue 06 — P5, delayed effects / objectives / transformations** (open, trigger-gated): first check Counters + durations suffice; objectives arrive with the first non-Boss-kill encounter.
7. **DEFER — resumable resolution & reactions**: stays on its recorded trigger (engine-hardening handoff issue 04); a dedicated ADR when crossed.

## Non-goals

The handoff's own list, adopted whole: no effect DSL, no arbitrary expression evaluation, no JSON programming, no ECS rewrite, no generic event bus outside the registry, no property paths, no boolean expression trees, no premature Magic-style stack.

## Return protocol

Assignments and completion use the mandatory return packet in [the recovery kit](../../docs/agents/recovery-kit.md#mandatory-return-packet).
