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

## 6. Charge lockout after activation: two docs disagree

`docs/rules/prototype-rules.md` (Action Bar Rules): "A charged Slot activates
once in its matching player window, then cannot receive more charges **until
its next matching window**" — read literally, a Quick Slot fired in Quick
cannot be charged during that round's Slow Window. `CONTEXT.md` ("Slot
Activation Limit") states the narrower rule: "A Slot cannot receive
additional charged cards **after activation in that window**", and the frozen
Godot engine implements the narrow reading (the activation flag clears when
the window ends).

**Interim ruling**: the TS engine keeps the CONTEXT.md / reference behavior —
charging a fired Quick Slot is legal again once Quick ends. A test pins this
(`engine.test.ts`, "allows charging a fired Quick Slot again once that window
has ended") so a future docs ruling changes it deliberately.

**Ruled (2026-08-16 grilling)**: the narrow rule stands. The
`prototype-rules.md` sentence now reads "cannot receive more charges for the
rest of that window", matching CONTEXT.md's Slot Activation Limit. The
engine and its pinning test were already correct; no code change.

## 7. `discard_for_stamina` is a translation artifact, held to Quick

The frozen reference exposes a bare DISCARD_FOR_STAMINA action with no phase
restriction and no effect beyond the discard; no documented rule defines it —
Stamina exists only as the Quick Window movement payment. The TS engine keeps
the action kind for one-to-one parity with the reference action catalog, but
its legality now requires the Quick Window. If the docs never grow a use for
a bare Stamina discard, the kind can be dropped in a later cleanup.

## 8. Boss-specific vocabulary in the generic state model — deferred

Embermaw's telegraph kinds (`breath`, `brood`) and `broodSpawnCandidates`
live in the shared engine state model, and the Boss Beat kinds are a fixed
enum resolved by one switch in `timeline.ts`. This mirrors the frozen
reference (the port is a translation, not a redesign, per ADR 0019). The
cost lands when a second Boss arrives: beat kinds, telegraph vocabulary, and
spawn configuration should then generalize into authored Boss-level content
rather than engine unions. Deliberately deferred until that Boss exists.

## 9. Hero route preview: press-and-hold implements the drag gesture

`docs/rules/prototype-rules.md` says "drag the Hero itself to preview legal
routes". The Workbench implements this as press-and-hold on the Hero's hex:
the preview shows from pointer-down until release, so a drag (press, move,
release) previews exactly as the doc describes, and a stationary press does
too. The gesture is a superset of the documented one, not a replacement;
recorded here because the wording differs.

## 10. Design finding: `boss_damage` has no range rule

Per the frozen engine and the rules docs, only `damage` (piece-targeting)
effects check `range_tiles`; a card's `boss_damage` resolves from anywhere
on the board. The M2 policy search found the dominant line immediately:
park at hex distance 3 (outside the range-2 Cinder Breath cone, where only
Raking Claw still lands), run two Steady Strike slot engines, and win in
Round 6 with 10 Health to spare (`data/scenarios/embermaw_victory_line.json`).
If ranged pressure on the Boss is meant to have a positional cost, the rules
docs need a range or engagement rule for `boss_damage`; until then the
engine keeps the documented behavior.

**Ruled (2026-08-16 grilling)**: range-free is ratified. `prototype-rules.md`
now states that `boss_damage` resolves without a range check and that
counter-pressure against distant play is authored encounter content, not a
card range rule. The counter-pressure work is filed as product-backlog
proposal 15 (`.scratch/product-backlog/issues/15-*.md`, `needs-triage`).

**Withdrawn (2026-08-19, D-067)**: the finding above was right and the ruling
was wrong. Reach is now a property of every card — `range_tiles` measured from
the firing Hero to whatever the card lands on, the Boss included — and the
melee vocabulary is authored at `1`. The counter-pressure D-017 shipped under
the old ruling stands; what changed is that camping is priced in the card too,
and every `far` policy in the sweep now deals exactly zero Boss damage.

## 11. Slot Replacement misfires: ruled a presentation problem

Playtesting on touch showed replacing an occupied Slot was too easy to do
when the player meant to charge it. Ruled (2026-08-16 grilling): the rules
stay as authored — Slot Replacement remains a free Loadout action regardless
of Charge Stack — and the fix is presentation: the replacement confirmation
modal (naming the discarded Top Card and charges) plus the animated
Prepare/Charge/Replace badges shown while a card is in hand. The rules
question reopens only if playtests show deliberate-but-regretted
replacements after this guidance.
