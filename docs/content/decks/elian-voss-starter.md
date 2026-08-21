# Elian Voss Starter Deck

This is the approved live/default Elian Voss deck specification, matching the runnable encounter definition `data/encounters/embermaw_prototype.json` (ADR 0020) — which is the source of truth this doc follows, not the other way around. The first-pass Shield Wall kit proves the Action Bar and Charge Stack loop while giving the tank a defensive payoff, an adjacent-Minion answer, a Slow commitment, and a repositioning verb.

> **Revised (2026-08-19).** The [Signature Slot migration](../design-proposals/fixed-hero-power.md) (D-064, ADR 0032) shipped: `Shield Slam` retired — its payoff moved whole onto Elian's Signature, *Riposte*, together with D-015's cash-out rule — and `Iron Guard` rose to 8 copies. The list below is the live post-migration deck.

> **Correction (2026-08-19).** This doc had drifted from the JSON: it listed `Steady Strike` ×8 and omitted `Drive Back`, while the live encounter has carried `Steady Strike` ×6 and `Drive Back` ×2 since the repositioning-verb change. The list below is corrected to the live JSON.

> **Correction (2026-08-21).** It drifted a third time, in the same direction and for the same reason: D-058 promoted `Quench` into the live list by trading two `Steady Strike` for it, and this file was not touched. It has claimed `Steady Strike` ×6 and no `Quench` ever since. Three drifts on one file is a process finding, not three clerical ones — a prose list beside a JSON list will keep losing, and this one only ever gets corrected when somebody reads both. The engine test that names the deck card-by-card (`engine.test.ts`, "the live Shield Wall list, named rather than counted") is the guard that actually holds; treat this section as commentary on that assertion rather than as a second source.

> **Revised (2026-08-21).** The deck-shape pass (D-104) landed with it: `Iron Guard` 8 → 6, and `Unyielding Step` ×2 in as a second Slow identity. Two reasons, both measured off the list rather than off play. `Iron Guard` at 8 was 40% of a twenty-card deck at `hand_refill_target: 4` — about 1.6 copies in every opening hand — which is a Slot decision the deck answers for the player. And with only `Fortify` ×2 Slow, one of the round's two player windows was served by 10% of the list, in a round order (`loadout → instant → quick → incoming → slow`) where the Slow Window is the one that resolves *after* the Incoming Row and is therefore where reactive commitment belongs.

Role:

- `Tank`

Hero:

- `Elian Voss`

## Deck Identity

The deck is a six-identity Shield Wall kit, fighting beside Elian's Signature, built to express:

- Guarded Front mitigation that feeds the Signature — a zero-loss Tank Hit on the Guarded Front earns *Riposte* a Charge
- adjacent Minion clearing
- Slow Window commitment, in two shapes rather than one — banked Armor and a committed swing
- Enemy displacement — answering telegraphed ground by moving the Enemy instead of the Hero
- a Counter read, answering a stack the Boss builds rather than a blow it throws
- persistent Slot and Charge Stack decisions

## Current List

20 cards total.

### 6x

- `Iron Guard`

### 4x

- `Steady Strike`

### 2x

- `Sweeping Blow`
- `Fortify`
- `Unyielding Step`
- `Drive Back`
- `Quench`

## Card Roles

- `Iron Guard`: quick Tank response. It grants `3` Armor, plus `1` Armor for each charged `Guard` card.
- `Steady Strike`: quick baseline Boss pressure. It deals `2` damage to the Boss, plus `1` damage for each charged card.
- `Sweeping Blow`: quick adjacent-Minion answer.
- `Fortify`: Slow Armor commitment for a future threat. Its `6` Armor lands at the next Round start — after the wipe — making it the one card that can pre-block the next Round's Instant Row (D-019).
- `Unyielding Step`: the second Slow identity (D-104). `2` Armor and `2` Boss damage, committed in the window that resolves after the Incoming Row — the Slow plan for a Round already survived, where `Fortify` is the Slow plan for the Round coming.
- `Drive Back`: quick displacement — push a selected piece 2 hexes directly away from you, answering telegraphed ground by moving the Enemy instead of spending the Hero's own position.
- `Quench`: quick Counter read (D-052, promoted by D-058). `2` Boss damage plus `1` per `Heat` Embermaw carries, then `2` of that Heat drawn off — the card that answers a bank rather than a blow.

Any card can charge either replaceable Top Card. `Steady Strike` rewards total Charge, while `Iron Guard` demonstrates a Keyword-specific Charge Modifier. The player chooses between maintaining front-line defense, cashing or banking the Signature's earned Charges, clearing a Minion, or committing to a Slow plan. Top Cards remain prepared at `0 Charge`, activate once after at least one card is tucked beneath them, and discard as a complete bundle only when activated at their Charge Value — except the Signature Slot, which hand cards can never reach and whose Top Card never discards (ADR 0032).

**The Signature — *Riposte* (D-064, re-priced by D-101).** *Standing:* absorb a Tank Hit on the Guarded Front for zero Health loss and the Slot gains one Charge (max `2`; a block while full earns nothing; Charges bank across Rounds). *Activation (Quick):* spend all Charges for `2` Boss damage `+3` per Charge; spent `2`, the Boss is also **Sundered** after the Riposte's own damage resolves.

Two notes on that activation, both about where the value sits rather than how much of it there is:

- **Why the base moved onto the Charge (D-101).** At the original `3 +2`, one Charge paid `5` and two paid `7`, so two single-Charge fires out-damaged one full bank `10` to `7` and `Sundered` — a Counter worth about `+2` across a two-seat party's damage instances — had to make up the difference alone. Cashing on sight was the efficient line, and "a block while full earns nothing" punished holding on top of that, so the bank the card is built around was a trap. At `2 +3` one Charge pays `5` and two pay `8`, which puts the two lines within a point of each other and hands the choice back to the board: cash for tempo, bank when follow-up hits are queued to land through the wound.
- **The timing the first cohort measured.** In the Ashen Trial the qualifying Tank Hit (`Raking Claw`) resolves in the Boss Instant row, before the Quick Window, so `Iron Guard`'s same-Round Armor arrives too late to produce a zero-loss block; `Fortify`'s banked Armor is what feeds the engine there. In the Brand trial it is different, and worth knowing: `Test the Brand` is an **Incoming** Beat, which the Quick Window precedes, so `Iron Guard` reaches it and the Signature has a working engine on branding Rounds without spending a Slow slot.

## Notes

- This is the approved first-pass live/default class kit, not a final balance claim.
- The prior `10x Steady Strike` / `10x Iron Guard` list is historical baseline evidence only.
- The Brand trial (`embermaw_attrition_trial`) fields a **different** Elian list, authored on its seat rather than shared through `player_deck`: `Sweeping Blow` ×2 out, `Fortify` and `Unyielding Step` to ×3 each. That fight runs `embermaw_hunt` + `embermaw_branding`, neither of which spawns a Minion, and a piece-damage card with no Minion on the board has no legal target at all — two cards of the twenty were unplayable there by construction (D-104).
- Any play-feel or balance follow-up is evaluated separately; this default migration does not guarantee draws or change encounter pacing.

## Source Resources

The underlying card definitions live in [data/cards](../../../data/cards) (ADR 0020).

Player-card wording and presentation follow [Player Card Authoring Rules](../../rules/player-card-authoring.md).
