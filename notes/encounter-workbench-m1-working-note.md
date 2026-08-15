# Encounter Workbench M1/M2 — working note

Open questions found while implementing the docs as spec (ADR 0019), with the
interim choice taken. Each needs a docs ruling.

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

## 2. Boss Programs in the M1 encounter — resolved in M2

M1 shipped only `embermaw_hunt`. M2 ported `embermaw_embers` and
`embermaw_brood` and restored the three-program looping rotation in
`data/encounters/embermaw_prototype.json`, matching the `.tres` encounter.

## 3. Charge Value of cards without an authored `max_charge`

`CardData.gd` defaults `max_charge` to `2`, so `sweeping_blow`, `fortify`,
and `shield_slam` (which omit the field in `.tres`) have an effective Charge
Value of 2 — including Fortify, a slow card, which never reaches the derived
slow-card cap of 3 mentioned in the engine fallback. The JSON port writes the
effective value (`"max_charge": 2`) explicitly so the authored number is
visible; the engine keeps the derived fallback for a future `max_charge: 0`
author.

## 4. Interception and Downed/Revive — no behavioral reference to port

`CONTEXT.md` defines Interception (redirect an ally's hit to the Guardian)
and Downed/Revive (a `0`-Health Hero blocks its hex and can be revived by an
adjacent living Hero). Both presuppose a multi-Hero Party: the frozen Godot
engine implements neither, no authored card or Boss Beat grants Interception
(the `intercept` card is armor plus minion damage), and
`docs/rules/prototype-rules.md` states plainly that reducing Elian Voss to
`0` health is defeat in the one-player slice. The TS engine matches the
rules doc (immediate defeat) and defers Interception and Downed/Revive to
the multiplayer milestone, where they first become observable.

## 5. Resources not ported to data/

`resources/legacy/boss_actions/` (five superseded boss actions) stays
unported: the Boss Program model replaced it, and porting would resurrect a
dead schema. `resources/content_catalog.tres` is replaced structurally by
the `data/` directory plus the engine's load-time validation. Both freeze
with the Godot codebase as reference copies (ADR 0019/0020).

## 6. Design finding: `boss_damage` has no range rule

Per the frozen engine and the rules docs, only `damage` (piece-targeting)
effects check `range_tiles`; a card's `boss_damage` resolves from anywhere
on the board. The M2 policy search found the dominant line immediately:
park at hex distance 3 (outside the range-2 Cinder Breath cone, where only
Raking Claw still lands), run two Steady Strike slot engines, and win in
Round 6 with 10 Health to spare (`data/scenarios/embermaw_victory_line.json`).
If ranged pressure on the Boss is meant to have a positional cost, the rules
docs need a range or engagement rule for `boss_damage`; until then the
engine keeps the documented behavior.
