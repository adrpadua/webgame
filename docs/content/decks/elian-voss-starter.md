# Elian Voss Starter Deck

This is the approved live/default Elian Voss deck specification, matching the runnable encounter definition `data/encounters/embermaw_prototype.json` (ADR 0020) — which is the source of truth this doc follows, not the other way around. The first-pass Shield Wall kit proves the Action Bar and Charge Stack loop while giving the tank a defensive payoff, an adjacent-Minion answer, a Slow commitment, and a repositioning verb.

> **Revised (2026-08-19).** The [Signature Slot migration](../design-proposals/fixed-hero-power.md) (D-064, ADR 0032) shipped: `Shield Slam` retired — its payoff moved whole onto Elian's Signature, *Riposte*, together with D-015's cash-out rule — and `Iron Guard` rose to 8 copies. The list below is the live post-migration deck.

> **Correction (2026-08-19).** This doc had drifted from the JSON: it listed `Steady Strike` ×8 and omitted `Drive Back`, while the live encounter has carried `Steady Strike` ×6 and `Drive Back` ×2 since the repositioning-verb change. The list below is corrected to the live JSON.

Role:

- `Tank`

Hero:

- `Elian Voss`

## Deck Identity

The deck is a five-identity Shield Wall kit, fighting beside Elian's Signature, built to express:

- Guarded Front mitigation that feeds the Signature — a zero-loss Tank Hit on the Guarded Front earns *Riposte* a Charge
- adjacent Minion clearing
- Slow Window preparation
- Enemy displacement — answering telegraphed ground by moving the Enemy instead of the Hero
- persistent Slot and Charge Stack decisions

## Current List

20 cards total.

### 6x

- `Steady Strike`

### 8x

- `Iron Guard`

### 2x

- `Sweeping Blow`

### 2x

- `Fortify`

### 2x

- `Drive Back`

## Card Roles

- `Steady Strike`: quick baseline Boss pressure. It deals `2` damage to the Boss, plus `1` damage for each charged card.
- `Iron Guard`: quick Tank response. It grants `3` Armor, plus `1` Armor for each charged `Guard` card.
- `Sweeping Blow`: quick adjacent-Minon answer.
- `Fortify`: Slow Armor commitment for a future threat. Its `6` Armor lands at the next Round start — after the wipe — making it the one card that can pre-block the next Round's Instant Row (D-019).
- `Drive Back`: quick displacement — push a selected piece 2 hexes directly away from you, answering telegraphed ground by moving the Enemy instead of spending the Hero's own position.

Any card can charge either replaceable Top Card. `Steady Strike` rewards total Charge, while `Iron Guard` demonstrates a Keyword-specific Charge Modifier. The player chooses between maintaining front-line defense, cashing or banking the Signature's earned Charges, clearing a Minion, or committing to a Slow plan. Top Cards remain prepared at `0 Charge`, activate once after at least one card is tucked beneath them, and discard as a complete bundle only when activated at their Charge Value — except the Signature Slot, which hand cards can never reach and whose Top Card never discards (ADR 0032).

**The Signature — *Riposte* (D-064).** *Standing:* absorb a Tank Hit on the Guarded Front for zero Health loss and the Slot gains one Charge (max `2`; a block while full earns nothing; Charges bank across Rounds). *Activation (Quick):* spend all Charges for `3` Boss damage `+2` per Charge; spent `2`, the Boss is also **Sundered** after the Riposte's own damage resolves. One timing note the first cohort measured: the Tank Hit resolves in the Boss Instant row, before the Quick Window, so `Iron Guard`'s same-Round Armor arrives too late to produce the zero-loss block — `Fortify`'s banked Armor is what feeds the engine, and `Iron Guard`'s density pays in survival and Charge fuel instead.

## Notes

- This is the approved first-pass live/default class kit, not a final balance claim.
- The prior `10x Steady Strike` / `10x Iron Guard` list is historical baseline evidence only.
- Any play-feel or balance follow-up is evaluated separately; this default migration does not guarantee draws or change encounter pacing.

## Source Resources

The underlying card definitions live in [data/cards](../../../data/cards) (ADR 0020).

Player-card wording and presentation follow [Player Card Authoring Rules](../../rules/player-card-authoring.md).
