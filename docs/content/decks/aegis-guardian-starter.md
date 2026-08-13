# Aegis Guardian Starter Deck

This is the current dummy tank deck used by the playable prototype. It exists to prove the Action Bar and Charge Stack loop before a broader role kit is authored.

Role:

- `Tank`

Hero:

- `Aegis Guardian`

## Deck Identity

The deck is a minimal tank shell built to test:

- `Quick Window` basics
- `Slow Window` payoff cards
- slot persistence
- charge-stack decisions
- mitigation plus boss pressure

## Current List

20 cards total.

### 10x

- `Steady Strike`

### 10x

- `Iron Guard`

## Card Roles

- `Steady Strike`: quick basic attack. It deals `2` damage to the boss, plus `1` damage for each charged card.
- `Iron Guard`: quick tank response. It grants `3` Armor, plus `1` Armor for each charged card.

Any card can charge either Top Card. The two effects deliberately use the same simple printed charge rule so the prototype can answer whether holding a persistent Charge Stack feels valuable. They remain prepared at `0 Charge`, activate once after at least one card is tucked beneath them, and discard as a complete bundle only when activated at their Charge Value.

## Notes

- This is not a final class kit.
- It is intentionally repetitive so draws expose the charge mechanic often.
- The legacy tank cards remain as resources for future experiments but are not in the live deck.

## Source Resources

The underlying card resources live in [resources/cards/tank](D:/dev/webgame/resources/cards/tank).

Player-card wording and presentation follow [Player Card Authoring Rules](D:/dev/webgame/docs/rules/player-card-authoring.md).
