# Remove the Forecast Row and let the schedule be learned

The Boss Timeline loses its third horizon. `Forecast` — next Round's whole Boss Program shown at family level — is deleted, along with `forecast()`, the row that rendered it, and the matched sweep policies that measured it. `Incoming` and `Instant` are untouched: this Round's Beats still disclose completely, in the rows ADR 0024 fixed. What a Boss can do is learned by fighting it, the way a Guild Raid boss in *Tacticus* is learned, and the catalogue of its moves belongs in a boss guide reached from the menus rather than on the play surface.

This supersedes the row half of ADR 0026. It does not supersede ADR 0024 (row resolution order), ADR 0025 (randomize before the window that answers it), or ADR 0028 (draw the program order from the seed) — see below, because two of those were argued partly from the row and their reasoning has to be restated without it.

## The row failed its own acceptance gate

ADR 0026 shipped the Forecast Row with an explicit condition: acceptance is *"whether the row is actionable information or decorative UI."* That gate went unrun for a while because nothing in the sweep consulted the row — a fixed script cannot benefit from information it never reads — so a matched pair of policies was built to run it, identical but for whether they looked at the forecast before spending Fortify or holding a shove.

Measured across 200 seeds per position:

| position | reader | blind | delta |
| --- | --- | --- | --- |
| far | 5.14 | 5.14 | **+0.00** |
| dodge | 5.88 | 5.79 | +0.09 |
| stay | 4.79 | 4.79 | **+0.00** |

Round-4 checkpoint clear rates were identical to the percentage point in every pairing (100/100, 100/100, 50/50). A player who reads the future and a player who ignores it finish the fight in the same Round.

ADR 0026 anticipated a weaker version of this and answered it: it accepted that the row *"carries little information for an experienced player"* under a deterministic rotation, and argued the row should ship anyway because the audience is first-time players and because the `Severe` tier had no mechanism without it. Both halves have since been overtaken. The rotation was replaced with a seeded order (ADR 0028) — which was supposed to be the fix — and the row still measures at zero. The tier's mechanism is addressed below.

The deeper reason is structural, and it is the same law that has governed every other flat result in this slice: **a decision only matters if it is priced in the currency that ends the fight.** Escalation is that currency; 3,660 runs in the same sweep died to the Clock at zero Boss damage. Foreknowledge cashes out in Health and Boss damage, which decide almost nothing. Making the row matter would have meant giving foreknowledge an Escalation price, and no honest version of that exists: Escalation is driven by unanswered demands, and knowing about a demand a Round early does not answer it.

## What replaces it

Nothing on the play surface. That is the point of the change, not a gap in it.

The schedule becomes something a player infers across attempts, which is only worth doing because the order is drawn from the seed and is neither fixed nor uniform. That property now has a number and a purpose: `programPredictability` reports that a perfect counter is right 66% of the time against a 33% floor. Under ADR 0026 that number justified the row. Without the row it *is* the learning curve — at `1` a second attempt teaches nothing, at the floor experience buys nothing, and the design wants the middle. The metric survives the row it was built to defend and becomes the more load-bearing of the two.

The move catalogue moves to a boss guide outside the fight, when menus exist. Keeping it out of the HUD is the second half of the argument and stands on its own: the play surface is a 390×844 portrait contract where every enabled control already has to clear a 44px target, and a row that measures zero is the first thing that should give up its space.

## What survives of the Consequence Tier ladder

ADR 0026 stated that the ladder and the row *"stand or fall together"*. That was half right, and the half it got wrong matters.

The disclosure half falls. `Severe must appear in the Forecast Row first` is not a rule any more, because there is no such row, and the graduated-certainty pipeline the cooperative-boss research proposed is not something this slice implements.

The fairness half survives and is now doing more work than before: **the first program of every phase carries no `Severe` Beat** (D-036). Under a forecast that rule was a footnote about the one Round the row could not have covered. Under learn-by-playing it is the rule that makes a first attempt teach rather than simply kill — the opening Round is the one nobody can have learned anything about, and it must not be the Round that ends the run. `consequence_tier` is therefore kept as authored metadata, and the ladder tests are kept as the authoring discipline that rule depends on: a Beat that can end a run has to be labelled as one, or the opener rule has nothing to check against.

`forecast.ts` is renamed to `consequence.ts` and keeps `highestTier` and `programCounterTags`, which the opener rule and the program-distinctness tests (D-036) both read.

## Consequences for the ADRs that leaned on the row

**ADR 0025 (randomize before the window that answers it) stands, on restated grounds.** Its worked example was the Forecast Row showing next Round's program a Round early, which required the roll to have already happened. Remove the row and the rule still holds for a reason that was always the stronger one: a committed Scenario and a sealed Encounter Record both replay by re-running the seed, so a roll at a Round boundary would make replay depend on when that boundary was crossed. The engine test that pins this has had its comment rewritten accordingly, and it passes unchanged.

**ADR 0028 (draw the program order from the seed) stands, and matters more.** It was argued as the fix for a Forecast Row that disclosed nothing. Without a row the same defect is worse, not better: under a fixed rotation, learning the Boss would be memorising a cycle, and a second attempt would teach nothing new. The seeded order is what makes repeated attempts worth making.

**ADR 0024 is untouched.** The row never resolved, so removing it changes no event ordering. No committed Scenario or Encounter Record changes; all replay byte-identical.

## Accepted costs

A first-time player now has strictly less information during their first fight than they had before this change, and we are choosing that deliberately. The Encounter Briefing still publishes what the Boss can do before the pull; only the *when* is withheld. The mitigations are the opener rule above, and the fact that the pinned first program is authored rather than seeded, so Round 1 is the same teaching Round every time.

The second cost is that the sweep can no longer measure the ceiling of any decision whose payoff depends on knowing next Round — Fortify's banked Armor most of all. A fixed script cannot learn, so every policy now simply always spends, and the sweep measures the floor of that decision rather than its best play. This is recorded rather than solved: the honest instrument for it is a human playtest, not another policy.
