# Deck Evaluation Note: Elian Voss Controlled Cohort

Date: 2026-08-13  
Reviewer: Game Design, deterministic-record review  
Deck/resource: Evaluation-only `resources/decks/evaluation/aegis_controlled_test_deck.tres`, `8x Steady Strike`, `6x Iron Guard`, `2x Sweeping Blow`, `2x Fortify`, `2x Shield Slam`  
Encounter/resource: Live Embermaw prototype wrapped by the controlled evaluation resource  
Seed labels: `controlled-a` (`1337`), `controlled-b` (`7331`), `controlled-c` (`20260813`)  
Content fingerprint: `237b19af2602c7f42ed05a68c12bf2792a9047593eb0e8b73c9d254a68f9b7cf`  
Encounter Record report: [latest-report.md](../../../tmp/encounter-records/latest-report.md)

## Review Method And Boundary

This is a human Design reading of the QA-verified, fixed-seed controlled Evidence Cohort and its per-Round observations. It does not treat automatic useful-action counts as a play-feel score. The aggregate report contains exactly three valid controlled records under one fingerprint; each ends in defeat: `controlled-a` at Round 5, `controlled-b` at Round 4, and `controlled-c` at Round 6. This is a solo Tank diagnostic in a three-to-four-Hero game: the scored target is a living Guardian at the end of Round 4 plus Tank responsibilities, not defeat of Embermaw or post-checkpoint longevity. The unchanged Round-5 and Round-6 observations remain diagnostic only.

The controlled fixture is an evaluation-only, historical/reproducible resource. It is distinct from the former two-card baseline and from the separately promoted live/default starter-deck evidence. This note neither recommends a default-deck change nor infers tuning, seed, hand, or teaching-pacing changes.

## Scores

| Prompt | Score 1-5 | Evidence |
| --- | ---: | --- |
| Did you know what the deck was trying to do? | 3 | The three records expose a readable choice between Iron Guard mitigation, Shield Slam setup, Steady Strike progress, Fortify preparation, and a situational Sweeping Blow. The plan is broader than the historical two-card loop, and every record reaches the solo Tank teaching window. |
| Did the deck express its Hero identity? | 3 | `controlled-a` records the intended Shield Wall sequence: a qualifying Riposte Ready is consumed by Shield Slam for `requested=5`, `base_amount=3`, and `status_bonus=2`. `controlled-a` and `controlled-c` also record 11 and 14 prevented damage, respectively. |
| How often did you face a meaningful Slot decision? | 3 | Post-Loadout hands repeatedly contain competing jobs. `controlled-a` chooses between holding Shield Slam, charging Iron Guard, and later preparing Fortify; `controlled-c` holds a Sweeping Blow Slot while Shield Slam appears in hand. These are plausible differing plans, though the deterministic trace alone cannot prove that every listed legal alternative felt equally attractive. |
| Did dead draws feel acceptable? | 2 | The wider kit reduces pure repetition, but cards do become context-sensitive. In particular, Sweeping Blow appears while the general cohort does not establish a legal selected-Minion clear, and Fortify can be a delayed answer rather than an immediate rescue. That friction is potentially healthy, but its player comprehension needs hands-on confirmation. |
| Did charge decisions feel rewarding? | 3 | Charges configure different jobs rather than only adding a number: Iron Guard produces prevented damage, Shield Slam can carry the Riposte payoff, and Fortify is loaded/charged in Slow-capable positions. The records support a first-pass machine, but not yet a strong conclusion about Charge efficiency. |
| Did repeated runs feel fresh enough? | 3 | The same list yields three different visible states: a legal Riposte payoff in `controlled-a`, an unmitigated damage-heavy loss in `controlled-b`, and longer mitigation/Slot persistence in `controlled-c`. The outcomes are all defeats, so this is tolerable variety rather than a demonstrated satisfying three-run arc. |

## Required Notes

- Best decision of the run: `controlled-a` converts a fully prevented qualifying Tank Hit into the legal Shield Slam payoff. The Resolution Facts show 5 Boss damage with a 3 base amount and a 2 Riposte bonus, making the Guardian's damage feel earned from correct defense.
- Most confusing decision: The report can show that Fortify, Sweeping Blow, replacement, movement, and firing alternatives existed, but it cannot establish why a human rejected each one. That remains a hands-on playtest question rather than a metric result.
- Card that felt weakest: Sweeping Blow is not judged weak in general, but it is unsupported as a cohort role answer here because this full-encounter evidence does not show the focused selected-Minion Whelp clear.
- Card that best expressed the Hero: Shield Slam in `controlled-a`, because its recorded `+2` payoff follows mitigation rather than a generic damage rotation. Iron Guard is the supporting half of that role moment.

## Supporting Contract Context

The focused Whelp Clear and Fortify Slow Top Card contracts are supporting acceptance context only. They demonstrate their own legal mechanic boundaries; they do not prove this cohort supplied a live Minion-clear decision or a satisfying Slow commitment. Conversely, this full-encounter cohort does not replace those focused contracts.

## Summary

Viability score: **3/5**. Every seed reaches the end-of-Round-4 solo Tank checkpoint. The cohort demonstrates mitigation and one legal Riposte payoff; later defeat and post-checkpoint longevity are not part of this solo score because Boss defeat and sustained survival depend on a future Party and Healer.

Play-feel score: **3/5, provisional**. The controlled list creates a readable first-pass Shield Wall machine with distinct Slot jobs and one earned Riposte-to-Shield Slam moment. It does not show an always-Shield-Slam line: the status payoff occurs in `controlled-a`, while the other two seed traces do not establish the same payoff. The score remains limited by deterministic-record review, losses in every seed, and the absence of direct player-comprehension evidence.

Recommendation: **PASS the evaluation-only cohort as evidence that the controlled list can express the intended Riposte-to-Shield Slam loop without a demonstrated dominant Shield Slam sequence. Do not promote, tune, or alter any live/default content from this note.** Use a separately authorized hands-on playtest and the focused Whelp/Fortify evidence before making a broader deck or Party-level raid recommendation.
