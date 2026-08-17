# Design Backlog

Status labels: `Now` means content/design work can begin after its stated proof; `Engineering` means a rules or UI extension is required; `Later` is intentionally held.

## Now

| Rank | Item | Owner | Blocking proof | Exit condition |
| --- | --- | --- | --- | --- |
| 1 | Establish deck-evaluation scorecard and measurement plan | Design/QA | [deck-evaluation-rubric.md](deck-evaluation-rubric.md) and [deck-evaluation-measurement-plan.md](../artifacts/deck-evaluation-measurement-plan.md) reviewed | Viability and Play-feel scores can be collected for the current Elian Voss deck before live deck expansion. |
| 2 | Add a Whelp-clearing card to the test deck | Design | `whelp_clear` probe | A new player can identify, select, and remove a Whelp. Also unblocks Escalation acceleration: Embermaw's Brood Call penalty is authored at `0` until this exists (D-003, ADR 0027). |
| 3 | Add a Slow Top Card to the test deck | Design | `slow_window_card` probe | Slow contains a meaningful, legal activation. |
| 4 | Run the first-three-Rounds teaching test | Design | ordered timeline probe plus three observed runs | Each Round teaches one answer before combination pressure. |
| 5 | Reconcile mobile labels and capture a fresh portrait baseline | Design/UI | mobile HUD capture | No visible `Tempo` meter or stale terminology remains. |

## Engineering

| Rank | Gap | Why it blocks content | Minimum extension |
| --- | --- | --- | --- |
| 1 | Deck-evaluation reporting facts | Deck quality cannot be compared repeatably without viability and play-feel evidence. | Scenario/run label, report aggregation for viability basics, and per-Round hand/Slot summaries listed in [deck-evaluation-measurement-plan.md](../artifacts/deck-evaluation-measurement-plan.md). |
| 2 | ~~Minion end-of-Round intent~~ Shipped 2026-08-17 (D-006): Whelps advance and bite at the end step; `minionIntents` is the visible projection awaiting board UI wiring. | Whelps cannot pressure or advance, so `Kill Adds` has no deadline. | Authored Minion behavior, deterministic move/attack resolver, visible intent projection. |
| 3 | Phase triggers and program swaps | Embermaw cannot enter the approved Conflagration package. | Encounter phase condition, post-Round transition, program selection, phase reveal UI. |
| 4 | Delayed markers and board-origin patterns | Ashen Brand and Cinderstorm cannot be represented honestly. | Marker state, delayed resolution trigger, origin/pattern schema, board overlay. |
| 5 | Rear arcs, displacement, and collision | Molten Tail and meaningful flanking are unavailable. | Rear-arc target query, forced movement action, deterministic collision policy. |
| 6 | Multi-Hero party model | Role-targeted raid content has no playable validation path. | Multiple Hero configs, committed intents, selector fallback/ties, Downed/Revive lifecycle, party HUD. |
| 7 | ~~Escalation as the single clock~~ Shipped 2026-08-17 (D-023, ADR 0027): counted `0`–`5` value, ticks from `Encounter Clock - 4`, authored per-Beat acceleration, four threshold effects, top threshold ends the fight. Remaining: an Escalation gauge on the HUD, and raising Embermaw's Brood Call penalty above `0` once a Whelp answer exists. | The stalemate wall rested on a health value that better play erodes, and Damage owned nothing structural. | Sweep and Scenarios regenerated; `checkpoint%` unchanged on all twelve prior policies; the new `turtle` policy measures the enrage wall. |
| 8 | ~~Forecast Row and staged Beat disclosure~~ Shipped 2026-08-17 (D-021, ADR 0026): `forecast()` projection, a third row on the strip, `consequence_tier` authored on every Beat with the ladder enforced by tests. Remaining: no `Severe` Beat exists yet, so that tier is unexercised, and the severe styling branch has no content to render. | The `Severe` consequence tier had nowhere to appear, so Telegraph Proportionality was unenforceable. | Engine tests cover the projection, rotation, looping, purity, and the ladder; the row was verified rendering in the built app at portrait width. |
| 9 | Commitments (D-028, D-035) | Nothing can bind to a named Beat, so D-027's Timeline conversion rate stays an observer's judgement instead of a count. Fortify is not a Commitment (retracted), so the concept has no implementing content. | Beat instance ids minted at Timeline entry, a card effect bound to one instance and resolving with it, visible to the Party. The ADR moment arrives with this work. Deferred deliberately while it has no consumer. |
| 10 | A live-deck card that applies a status to an Enemy (D-034) | The status vocabulary ships with no card using it, so Sundered and Weakened are authored but unapplied. | One authored card plus a focused scenario and the baseline cohort, per the deck-evaluation rubric — it changes the damage economy the D-016/D-017 walls were measured against. |
| 11 | Encounter Responsibilities (D-029) | Repeat clears have no social variation, and decision concentration has no structural lever beyond demand density. | An assignable transferable duty independent of Archetype, plus its handoff action. Needs the Party model. |
| 12 | Module Slot and Raid Seed (D-024) | Without bounded variation the Forecast Row carries no information for a returning player, and attempts cannot be compared across groups. | One authored slot per Boss Program, seed-driven module selection settled before Forecast, and a printed seed value. Selection must obey D-022. |

## Later

- Kessa Varn, the Vanguard second tank ([design](heroes/kessa-varn-design.md), D-014): held until her required engine seams exist — Momentum resource, card-granted movement, printed activation costs, and Boss facing manipulation with a `Braced` guard. Her `Breach` party window additionally waits on the multi-Hero model.
- Class-resource and tank Threat content after multi-Hero targeting exists.
- Raid-run rewards, branching nodes, and deck evolution after a single encounter has a proven card curve.
- Per-card art and final VFX after interaction and pattern readability pass mobile tests.
- Archive/Echo (D-030): a bounded per-Boss option held until a second Boss exists whose identity is memory. Embermaw does not take it.

## Probe Policy

Per ADR 0019, the web Encounter Engine is the rules source of truth and the Godot probe suite is frozen. Every new mechanic gets focused Vitest coverage in `web/src/engine`, and every encounter or balance change re-runs the evaluation sweep (`npm run evaluate`) and the Scenario generator (which exits red-flag on any solo victory, D-016). A content description alone is never a substitute for an executable test.
