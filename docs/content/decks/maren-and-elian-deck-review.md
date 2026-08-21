# Maren and Elian: Deck Review, 2026-08-21

Status: review completed and its findings adopted as D-098 through D-102. This document is the reasoning; the decision log is the record and `data/` is the truth. Where the two disagree, `data/` wins and this file is stale.

A read of both shipped decks as lists — copy counts, window distribution, what each card can legally do in the Encounter its Hero is actually seated in — rather than as play. Nothing here needed a playtest to see, which is the point: these are defects a list review catches before a cohort spends seeds on them. The things a list review *cannot* answer are named at the bottom, unresolved.

## The lists as reviewed

| | Elian (`embermaw_prototype`) | Maren (`embermaw_attrition_trial`) |
| --- | --- | --- |
| Before | `4` Steady Strike, `8` Iron Guard, `2` Sweeping Blow, `2` Fortify, `2` Drive Back, `2` Quench | `3` Field Dressing, `3` Braced Recovery, `1` Full Certification, `3` Triage Line, `3` Surplus of Care, `2` Strike the Entry, `3` Ledger Review, `2` Braced Escort |
| After | `4` Steady Strike, `6` Iron Guard, `2` Sweeping Blow, `2` Fortify, `2` Unyielding Step, `2` Drive Back, `2` Quench | `2` Field Dressing, `2` Braced Recovery, `2` Full Certification, `3` Triage Line, `3` Surplus of Care, `3` Strike the Entry, `3` Ledger Review, `2` Braced Escort |

Elian's Brand-trial list is now authored on his seat rather than shared: `Sweeping Blow` ×2 out, `Fortify` and `Unyielding Step` to ×3.

## What was working

Worth stating first, because both decks are being changed and neither was broken.

**Elian's Charge Stack pays.** Both of his repeatable identities read it — `Steady Strike` on total Charge, `Iron Guard` on Guard-tagged Charge — so tucking is a decision with two different answers rather than a fee.

**`Fortify` is the sharpest card in either deck**, and it is sharp because of the round order rather than its number. The round runs `loadout → instant → quick → incoming → slow`, so Quick Armor covers an Incoming Beat but arrives too late for an Instant one. `Fortify`'s banked Armor is therefore the only answer to `Raking Claw`, and the only reliable Riposte feeder on hunt Rounds. One card carrying a real timing lesson is worth more than three carrying numbers.

**Maren uses both windows.** 7 Slow to 13 Quick, against Elian's 2 of 20 — and because Slow resolves *after* the Incoming Row, her big heals land after the blow, which is correct healer timing and a genuinely different rhythm from the Tank beside her.

**`Triage Line` is the best-designed card in either list.** Range 1, burst 1, on a `board_radius: 2` board: the one card in the game so far where standing somewhere is the decision. It also throws the rest into relief — every other card Maren owns is range 3 on a board whose maximum useful distance is about 4, which is "always in range" wearing a range statistic.

## The five findings

### 1. Maren's engine ran backwards (D-102)

Overflow converts only when the recipient is within the card's printed healing of full — `Surplus of Care` needs an ally missing less than 3. Overflow was her only damage, and `host_deals_damage` was her Signature's only earn. So both depended on the Party being healthy, in an Encounter whose entire premise is a debt that accumulates and never fades. She was a damage dealer in Round 1 and a Signature that never charged by Round 5: difficulty and engine moving in opposite directions.

The fix is a second standing clause on a new Grant event, `counter_spent`, raised where a `spend` Reader actually removes a Counter. Cleansing now charges her Signature. It runs the right way — Sear accrues, so the later the fight goes the more there is to strike — and it is the sentence her character document already printed: *cleansing is striking a false entry*.

### 2. And the escape hatch was worse than the problem (D-098)

`ally` legally includes self. For the overflow carrier that made self-targeting the *best* use of the card rather than the worse one the schema's own comment predicts: Maren at full Health, aiming `Surplus of Care` at herself, for the card's whole printed value in Boss damage plus a Charge, with no ally to read and no Beat to name. The highest-value and lowest-thought play in her deck, and the exact inverse of *every strong Maren play names a future event*.

Overflow now requires another Hero. Firing an `ally` card on yourself stays legal; it simply converts nothing.

### 3. She paid the Charge tax and bought nothing (D-100)

Not one of her eight identities carried a `charge_modifier` or read Charge in any form — while activation still requires at least one tucked card. Half the game's central decision layer was inert for her, and she was billed for it on every fire. `Ledger Review` ×3 reads, in hindsight, as the deck self-medicating.

Her two repeatable Slow heals now read the Charge Stack. The scaling is deliberately kept off `Surplus of Care`: the overflow cap is the *printed* healing, so scaling the conversion carrier would have raised the heal without raising the conversion — a card that gets better in a way its own rules text cannot explain.

### 4. Elian's list answered his own Slot decisions (D-099)

Three list-level defects:

- `Iron Guard` at 8 was 40% of a twenty-card deck at `hand_refill_target: 4` — about 1.6 copies in every opening hand. "A meaningful Slot decision in most Rounds" is the rubric's bar, and draw weight was answering it for the player.
- Two Slow cards of twenty left one of the round's two windows served by 10% of the list — and the Slow Window is the one that resolves after the Incoming Row, so it is where reactive commitment belongs. `Unyielding Step` was already authored, already Tank-tagged, and unused.
- `Sweeping Blow` requires a Minion target. The Brand trial runs `embermaw_hunt` + `embermaw_branding`, neither of which spawns one. Two of his twenty cards had no legal target in that fight by construction — not a dead draw, a dead card.

### 5. Riposte's bank was a trap (D-101)

At `3` base `+2` per Charge, one Charge paid `5` and two paid `7` — so two single-Charge fires out-damaged one full bank `10` to `7`, leaving `Sundered` to make up three points alone when it is worth roughly `+2` across a two-seat party. Cashing on sight was simply efficient, and "a block while full earns nothing" punished holding on top of that. The decision the card is built around had already been settled by arithmetic.

`2 +3` puts one Charge at `5` and two at `8`, within a point of each other, which hands the choice back to the board.

## What the re-measurement said

30 seeds, both arms, `npm run probe:attrition`. Both composition gates hold and the thin half got thicker:

| | Before | After |
| --- | --- | --- |
| Solo clears / duo clears | 0 / 30, 0 / 30 | 0 / 30, 0 / 30 |
| Duo cleanses per run | 1.8 | 2.2 |
| Duo covers per run | — (Signature reached full bank in under a quarter of runs) | 0.5 |
| Elian health left (duo) | 15.8 | 19.0 |
| Boss health left (duo) | 37.9 of 72 | 37.5 of 72 |

The clear count is the number that had to *not* move, and did not: D-082's wall says a Tank and a Healer survive this fight and cannot end it, because ending it is the Damage Role's job. The solo ceiling was regenerated against the new Elian list and D-016's no-solo-clear wall holds there too.

## What a list review cannot settle

Named rather than quietly left out, because the rubric is explicit that automatic evidence must not claim the human half:

- **Whether `Unyielding Step` is an interesting Slow card or just a second one.** It fixes a distribution; whether it creates a decision against `Fortify` is a playtest question. The two are authored to answer different Rounds — one the Round coming, one the Round survived — and that is a claim, not a finding.
- **Whether the re-priced Riposte reads as a choice at the table.** The arithmetic is now close. Close arithmetic and a legible decision are not the same thing, and only a player can say whether they felt the second Charge was worth waiting for.
- **Whether Maren's cleansing earn crowds out her overflow game.** The scripted pilot does not play the deliberate-overheal line at all (0.5 conversion damage per run), so the sweep cannot tell a Healer who prefers cleansing from one who was never asked. Q23's cap still wants a human line before it moves.
- **Whether `Quench` is worth its two slots in the Brand trial.** It is legal there but reads no Heat, because neither program places any — so it is a flat 2-damage card where `Steady Strike` scales. Left alone deliberately: D-058 promoted it on prototype evidence and re-litigating that belongs with the cohort that measured it, not with this pass.
- **The three stale evaluation decks.** `aegis_heat_answer` and `aegis_staked_line` each describe themselves as "the live starter list with X traded", and neither has matched the live list for some time; `aegis_heat_answer` and `aegis_controlled_test_deck` also still carry `Shield Slam`, retired into the Signature by D-064. This pass moves the live list again and makes all three staler. They are out of scope here and need a decision either way: re-base them on the current list, or state on each that it is a frozen historical cohort and its "the live list with X traded" sentence is describing the list as it stood when the cohort ran.

## Related

- [../design-decision-log.md](../design-decision-log.md) — D-098 through D-102
- [elian-voss-starter.md](elian-voss-starter.md) — the live Elian list
- [../heroes/maren-tallis-design.md](../heroes/maren-tallis-design.md) — Maren's contracts and deck plan
- [../encounters/embermaw-brand-attrition-gate.md](../encounters/embermaw-brand-attrition-gate.md) — the re-measured composition gate
- [../deck-evaluation-rubric.md](../deck-evaluation-rubric.md) — the bar the findings are read against
