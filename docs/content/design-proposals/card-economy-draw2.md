# Design Proposal: Flat-Draw Card Economy (Draw-2)

Date: 2026-08-17
Status: Proposed. No live rules change. Requires hands-on feel confirmation and a controlled evaluation under real engine rules before any adoption decision.
Method: throwaway logic prototype (`web/prototypes/draw1-economy-prototype.html`, pure reducer over a faithful-enough round model) plus a headless simulation harness (`web/prototypes/draw1-economy-sim.cjs`) — one fixed heuristic bot played identically across four economies and two deck sizes, 300 seeds per configuration. Both files are throwaway prototype artifacts, kept as the primary source for this proposal.

## Question

Should the card economy move from elastic refill ("draw back up to 4 at round end") to flat income ("draw exactly N per round"), possibly with a smaller deck?

## Team-Game Ground Rule (evaluation lens)

**This game is a team game. A solo Tank killing the Boss is a negative signal, not an achievement.** The solo slice's success criteria are the Round-4 checkpoint and demonstrated Tank role moments; encounter-design intent says a solo Guardian should not outlast the encounter substantially beyond its halfway checkpoint without a Healer. Any economy that lets a competent solo player defeat Embermaw is over-rich or under-pressured by definition, and every number below is read through that lens. (User-stated principle, recorded as D-016; also now explicit in the deck-evaluation rubric.)

## Simulation Results

300 seeds per row; fixed dodge-policy bot with full script knowledge; prototype rules (two-position board, chip-damage Whelps, Slow-Armor carry). Reproduce with `node web/prototypes/draw1-economy-sim.cjs`.

| Economy | Deck | Alive @ R4 | Solo victory (⚠ negative) | Enrage survival | HP death | Boss dmg (of 36) | Ripostes earned | Cards drawn | End hand |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Draw 1 | tiny 12 | 100% | 0% | 62% | 38% | 26.0 | 1.3 | 11.9 | 1.0 |
| Draw 1 | full 20 | 100% | 0% | 71% | 29% | 27.7 | 1.7 | 11.9 | 0.8 |
| Draw 2 | tiny 12 | 100% | **12%** | 70% | 17% | 32.9 | 3.7 | 18.3 | 4.6 |
| Draw 2 | full 20 | 100% | **19%** | 75% | 5% | 33.4 | 4.2 | 19.0 | 5.5 |
| Refill 3 | tiny 12 | 100% | 0% | 41% | 59% | 22.8 | 1.7 | 14.2 | 2.4 |
| Refill 3 | full 20 | 100% | 0% | 57% | 43% | 25.8 | 2.8 | 14.8 | 2.1 |
| Refill 4 (live) | tiny 12 | 100% | 0% | 64% | 36% | 30.3 | 3.4 | 16.2 | 3.1 |
| Refill 4 (live) | full 20 | 100% | 0% | 84% | 16% | 30.9 | 3.9 | 16.4 | 3.0 |

## Findings

1. **Draw-1 is falsified.** Total income (~12 cards) cannot feed the machine: the fixed movement tax (6 cards per run under the dodge policy) consumes half of it, the Riposte engine collapses (1.3–1.7 earned vs 3.4–3.9 under live rules), and Boss pressure drops to worst-in-class. It is starvation, not tension.
2. **Refill-3 is falsified.** Worst HP-death rate of all four (43–59%) despite drawing more than draw-1: a small elastic buffer plus a 3-card opening hand loses to the authored attrition.
3. **The structural finding (survives the team-game lens): elastic refill punishes saving; flat income rewards planning.** Under refill, a player who ends the round holding cards draws fewer — the economy taxes exactly the behavior (banking for the telegraphed Round-7 claw) that the visible timeline invites. Under flat draw, banked cards are kept, and end-hand grows (~5 under draw-2). Flat income creates a hold-versus-spend decision that the current economy mathematically deletes. This is the proposal's core insight, independent of any specific N.
4. **Draw-2 at current costs is over-rich.** It posts the best survival, damage, and Riposte numbers — and a 12–19% solo kill rate, which under the ground rule disqualifies it as-is. The bot's full script knowledge inflates this somewhat, but the direction is unambiguous: flat-2 income plus current card costs exceeds the solo ceiling.
5. **Deck size is second-order.** Economy dominates every metric; the full deck's small edge is partly a Guard-density confound (40% Guard cards vs the tiny deck's 33%). Deck size remains a consistency knob, not a scarcity knob.

## Recommendation

Pursue the **flat-income shape, tuned back under the solo ceiling** — not draw-2 at current numbers. The candidate is draw-2 with compensating pressure so that solo victory returns to 0% at competent play and solo enrage-survival does not become comfortable, via one or more of:

- pricing (e.g., a second Stamina cost tier, or charge caps),
- authored attrition (the Ashen Trial's escalating Tank Hits are already the intended lever: "regular Targeted Tank Hits should create enough attrition that he cannot outlast the encounter substantially beyond its halfway checkpoint"),
- Boss health scaled by party size, with the solo configuration explicitly unwinnable.

The prize justifying the work is finding 3: an economy that stops punishing the planning play-pattern the telegraphed timeline exists to teach.

## Evaluation Gate (before any live change)

1. Hands-on feel pass in the prototype (`Draw 2` knob) — does banking feel like planning or hoarding?
2. If feel confirms, an engine seam for flat draw behind an evaluation-only encounter resource (the `aegis_controlled_test_deck` pattern), then a fixed-seed controlled cohort under real rules.
3. Scorecard reads per the rubric, with the amended rule: **any solo Boss kill in the cohort is a red flag finding**, scored as a tuning defect regardless of other metrics.
4. No dominant line: banking must not always be correct; the enrage clock must still pressure early spends.

## Caveats

- One scripted bot with full boss-script knowledge; human play will earn fewer Ripostes and fewer kills everywhere.
- Prototype rules diverge from the engine (two-position board, chip Whelps, Slow-Armor carry knob, immediate cleanup); absolute numbers are directional only. The comparison between rows is the evidence, not any single cell.
- The solo slice is one Hero; a Party changes both income demand (more roles spending) and the solo ceiling entirely. Flat-income adoption should be re-simulated at Party scale when that model exists.
