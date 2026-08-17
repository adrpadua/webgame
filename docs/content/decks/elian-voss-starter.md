# Elian Voss Starter Deck

This is the approved live/default Elian Voss deck specification. The runnable encounter definition `data/encounters/embermaw_prototype.json` (ADR 0020) now uses this exact list. The first-pass Shield Wall kit proves the Action Bar and Charge Stack loop while giving the tank a defensive payoff, an adjacent-Minion answer, and a Slow commitment.

Role:

- `Tank`

Hero:

- `Elian Voss`

## Deck Identity

The deck is a five-identity Shield Wall kit built to express:

- Guarded Front mitigation and Riposte Ready
- Shield Slam payoff after a zero-loss Tank Hit
- adjacent Minion clearing
- Slow Window preparation
- persistent Slot and Charge Stack decisions

## Current List

20 cards total.

### 8x

- `Steady Strike`

### 6x

- `Iron Guard`

### 2x

- `Sweeping Blow`

### 2x

- `Fortify`

### 2x

- `Shield Slam`

## Card Roles

- `Steady Strike`: quick baseline Boss pressure. It deals `2` damage to the Boss, plus `1` damage for each charged card.
- `Iron Guard`: quick Tank response. It grants `3` Armor, plus `1` Armor for each charged `Guard` card.
- `Sweeping Blow`: quick adjacent-Minon answer.
- `Fortify`: Slow Armor commitment for a future threat. Its `6` Armor lands at the next Round start — after the wipe — making it the one card that can pre-block the next Round's Instant Row (D-019).
- `Shield Slam`: quick Boss payoff that consumes Riposte Ready for the full `+2` Boss damage. Any other Boss-damage card cashes an active Riposte Ready for `+1`, so an earned opening is never wasted on a Slam-less hand; holding the window for the Slam is the stronger, riskier line.

Any card can charge either Top Card. `Steady Strike` rewards total Charge, while `Iron Guard` demonstrates a Keyword-specific Charge Modifier. The player chooses between maintaining front-line defense, cashing in a Riposte opening, clearing a Minion, or committing to a Slow plan. Top Cards remain prepared at `0 Charge`, activate once after at least one card is tucked beneath them, and discard as a complete bundle only when activated at their Charge Value.

## Notes

- This is the approved first-pass live/default class kit, not a final balance claim.
- The prior `10x Steady Strike` / `10x Iron Guard` list is historical baseline evidence only.
- Any play-feel or balance follow-up is evaluated separately; this default migration does not guarantee draws or change encounter pacing.

## Source Resources

The underlying card definitions live in [data/cards](../../../data/cards) (ADR 0020).

Player-card wording and presentation follow [Player Card Authoring Rules](../../rules/player-card-authoring.md).
