# Design Backlog

Status labels: `Now` means content/design work can begin after its stated proof; `Engineering` means a rules or UI extension is required; `Later` is intentionally held.

## Now

| Rank | Item | Owner | Blocking proof | Exit condition |
| --- | --- | --- | --- | --- |
| 1 | Establish deck-evaluation scorecard and measurement plan | Design/QA | [deck-evaluation-rubric.md](deck-evaluation-rubric.md) and [deck-evaluation-measurement-plan.md](../artifacts/deck-evaluation-measurement-plan.md) reviewed | Viability and Play-feel scores can be collected for the current Elian Voss deck before live deck expansion. |
| 2 | Add a Whelp-clearing card to the test deck | Design | `whelp_clear` probe | A new player can identify, select, and remove a Whelp. |
| 3 | Add a Slow Top Card to the test deck | Design | `slow_window_card` probe | Slow contains a meaningful, legal activation. |
| 4 | Run the first-three-Rounds teaching test | Design | ordered timeline probe plus three observed runs | Each Round teaches one answer before combination pressure. |
| 5 | Reconcile mobile labels and capture a fresh portrait baseline | Design/UI | mobile HUD capture | No visible `Tempo` meter or stale terminology remains. |

## Engineering

| Rank | Gap | Why it blocks content | Minimum extension |
| --- | --- | --- | --- |
| 1 | Deck-evaluation reporting facts | Deck quality cannot be compared repeatably without viability and play-feel evidence. | Scenario/run label, report aggregation for viability basics, and per-Round hand/Slot summaries listed in [deck-evaluation-measurement-plan.md](../artifacts/deck-evaluation-measurement-plan.md). |
| 2 | Minion end-of-Round intent | Whelps cannot pressure or advance, so `Kill Adds` has no deadline. | Authored Minion behavior, deterministic move/attack resolver, visible intent projection. |
| 3 | Phase triggers and program swaps | Embermaw cannot enter the approved Conflagration package. | Encounter phase condition, post-Round transition, program selection, phase reveal UI. |
| 4 | Delayed markers and board-origin patterns | Ashen Brand and Cinderstorm cannot be represented honestly. | Marker state, delayed resolution trigger, origin/pattern schema, board overlay. |
| 5 | Rear arcs, displacement, and collision | Molten Tail and meaningful flanking are unavailable. | Rear-arc target query, forced movement action, deterministic collision policy. |
| 6 | Multi-Hero party model | Role-targeted raid content has no playable validation path. | Multiple Hero configs, committed intents, selector fallback/ties, Downed/Revive lifecycle, party HUD. |

## Later

- Kessa Varn, the Vanguard second tank ([design](heroes/kessa-varn-design.md), D-014): held until her required engine seams exist — Momentum resource, card-granted movement, printed activation costs, and Boss facing manipulation with a `Braced` guard. Her `Breach` party window additionally waits on the multi-Hero model.
- Class-resource and tank Threat content after multi-Hero targeting exists.
- Raid-run rewards, branching nodes, and deck evolution after a single encounter has a proven card curve.
- Per-card art and final VFX after interaction and pattern readability pass mobile tests.

## Probe Policy

The existing nine-probe suite remains required for every batch. Each new mechanic gets one focused headless probe and, where it changes player comprehension, one scene/mobile parity check. A content description alone is never a substitute for an executable probe.
