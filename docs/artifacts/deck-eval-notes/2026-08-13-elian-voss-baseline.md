# Deck Evaluation Note: Elian Voss Live Baseline

Date: 2026-08-13  
Reviewer: Game Design, deterministic-record review  
Deck/resource: Live Elian Voss starter deck, `10x Steady Strike` and `10x Iron Guard`  
Encounter/resource: `resources/encounters/embermaw_prototype.tres`  
Seed labels: `baseline-a` (`1337`), `baseline-b` (`7331`), `baseline-c` (`20260813`)  
Content fingerprint: `b6e02c7931b56fe22492b1313e1ed64dc32daf2cd190bfa8f48272caa0ef4733`  
Encounter Record report: [latest-report.md](../../../tmp/encounter-records/latest-report.md)

## Review Method And Boundary

This review used the QA-verified fixed-seed Evidence Cohort and its phase observations. It is a human Design review of the three records, not an automatic play-feel score. All runs share one fingerprint, one evaluation purpose, and the required labels.

The live baseline intentionally contains no `Shield Slam`, `Sweeping Blow`, or `Fortify`. It can therefore test whether Elian reaches and recognizes the defensive half of Riposte Ready, but it cannot test the Riposte payoff, Whelp answer, Slow anchor, or the controlled five-identity deck's Slot Tension.

## Scores

| Prompt | Score 1-5 | Evidence |
| --- | ---: | --- |
| Did you know what the deck was trying to do? | 3 | Across all three runs, Iron Guard is repeatedly prepared before visible Tank Hits; the records show 20, 24, and 23 prevented damage. The role's defensive intent is readable, though its offensive follow-through is absent. |
| Did the deck express its Hero identity? | 3 | `baseline-a` and `baseline-b` each record a qualifying Incoming Raking Claw prevented for 4 with 0 Health loss and a Riposte Ready grant. That is a genuine Shield Wall moment, but no equipped card can convert the opening into Shield Slam. |
| How often did you face a meaningful Slot decision? | 1 | Every Quick window follows the same charge-and-fire pattern. The report lists movement alternatives, but none of the three runs selects one, and the two-card deck supplies no competing role answer or payoff plan. |
| Did dead draws feel acceptable? | 3 | No draw is inert: both cards can be loaded or charged. This is functional rather than interesting; the absence of dead draws comes from a highly repetitive card pool. |
| Did charge decisions feel rewarding? | 2 | Charges consistently produce damage or Armor, but their pattern is largely predetermined. The records show 12 successful Slot fires in each run and no evidence that a charged card changes the next plan beyond its numeric contribution. |
| Did repeated runs feel fresh enough? | 1 | All three runs end in defeat and select the same core actions. Seed order changes, but the role expression and action sequence do not meaningfully change. |

## Required Notes

- Best decision of the run: In `baseline-a` and `baseline-b`, charging Iron Guard for the Ember Pattern's Incoming Raking Claw prevents all 4 damage and grants Riposte Ready. This is the clearest observed Shield Wall role moment.
- Most confusing decision: After the grant, the live deck has no Shield Slam. The player can see that the defensive condition succeeded but has no authored payoff to choose.
- Card that felt weakest: Steady Strike is necessary baseline pressure but is interchangeable filler in this two-card shell; it does not create a new role decision.
- Card that best expressed the Hero: Iron Guard. Its Guard charge modifier and prevention against the visible Tank Hit make Elian's front-line responsibility legible.

## Supporting Contract Context

The Whelp Clear and Slow Top Card contracts are supporting acceptance context, not deck-impact evidence here. This live baseline contains neither Sweeping Blow nor Fortify, so their focused coverage cannot establish that this cohort has meaningful add-control or Slow-commitment Slot choices.

## Summary

Viability score: **2/5**. All three records end in defeat, though each reaches beyond Round 4 and demonstrates real mitigation. The current deck does not provide a repeatable path to the teaching endpoint in this cohort.

Play-feel score: **1/5**. The records show a repeated charge-and-fire sequence rather than competing useful Slot plans.

Riposte finding: **the defensive trigger is demonstrated, but the payoff is not evaluable.** `Shield Slam` appears zero times because the live baseline contains zero copies. "No dominant always-Shield-Slam line" is therefore **not a pass condition**; it is untested.

Recommendation: **FAIL the deck-impact evaluation for promotion or tuning purposes.** Keep the live two-card list as a mechanics shell only. Do not infer a card, seed, hand, encounter, or pacing change from this result. A future, separately authorized controlled-deck cohort must include a legal Shield Slam payoff before Design can judge whether Riposte Ready improves Slot Tension without producing a dominant Shield Slam line.
