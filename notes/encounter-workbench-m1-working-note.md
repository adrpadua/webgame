# Encounter Workbench M1 — working note

Open questions found while implementing the docs as spec (ADR 0019), with the
interim choice taken. Each needs a docs ruling before or during M2.

## 1. Tank starter deck list

`docs/rules/prototype-rules.md` ("Current Tank Starter Deck") lists
`Steady Strike` (10 copies) and `Iron Guard` (10 copies). The authored
encounter resource (`resources/encounters/embermaw_prototype.tres`) ships a
20-card deck of 8 Steady Strike, 6 Iron Guard, 2 Sweeping Blow, 2 Fortify,
and 2 Shield Slam.

**Interim choice**: port the authored encounter deck. ADR 0020 governs the
content port ("the existing resource files are ported by hand once"), and the
Riposte Ready rules in `CONTEXT.md` presuppose Shield Slam in the deck. The
rules-doc deck section reads as stale; it should be updated or the deck
re-authored.

## 2. Boss Programs in the M1 encounter

The `.tres` encounter sequences three looping Boss Programs (Hunt, Ember,
Brood). M1 scope is one Boss Program, so `data/encounters/embermaw_prototype.json`
lists only `embermaw_hunt`, looping. M2 (Embermaw parity) restores the other
two programs by porting `embermaw_embers` and `embermaw_brood` and extending
the `boss_programs` list.

## 3. Charge Value of cards without an authored `max_charge`

`CardData.gd` defaults `max_charge` to `2`, so `sweeping_blow`, `fortify`,
and `shield_slam` (which omit the field in `.tres`) have an effective Charge
Value of 2 — including Fortify, a slow card, which never reaches the derived
slow-card cap of 3 mentioned in the engine fallback. The JSON port writes the
effective value (`"max_charge": 2`) explicitly so the authored number is
visible; the engine keeps the derived fallback for a future `max_charge: 0`
author.
