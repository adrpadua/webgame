# Embermaw: The Brand - Attrition Gate

Status: authored and passing its gate test. This Encounter exists to prove a problem, not to be fun yet. It is the prerequisite the Restorative Archetype is authored against (D-077).

## Why This Exists Before The Healer

A Role is only a Role if some problem needs it. The cheapest way to author a Healer nobody needs is to author her first and go looking for the problem afterwards — at which point the problem gets shaped to fit the Hero, and the fit proves nothing.

So the order is inverted. This Encounter authors the residual-attrition problem, and a test asserts that the Party as authored cannot answer it. When the Restorative arrives, her cleansing cards are the first thing that makes this Encounter clearable, and the test that fails at that moment is the evidence that she was needed.

## The Problem, Stated Mechanically

**Seared** (`data/counters/seared.json`) is a mark the Boss puts on a Hero.

| Field | Value | Why |
| --- | --- | --- |
| `host` | `combatant` | It rides the Hero, and leaves with them (D-045). |
| `max` | `2` | Capped, so the debt is a decision rather than a countdown. |
| `duration_rounds` | `0` | No clock. It sits until something removes it. |
| `readers` | `host_takes_damage` → `target_damage`, `per: 1` | Each Sear makes every later blow on that Hero land 1 harder. |

It is **Heat's mirror**. Heat is the Boss banking fire against the Party; Seared is the Boss banking fire *into* one Hero. A designer who has read `heat.json` has already read this one, which is the argument for Counters being a vocabulary rather than a pile of special cases.

The one thing that makes it a new problem: **Armor answers the blow and never the mark.** Every mitigation tool the Tank owns reduces the number that lands this Round. None of them reduces the number that will land next Round. That gap is the Healer-shaped hole.

## The Beats

`data/boss_programs/embermaw_branding.json` — *Brand Pattern*. Nothing in it is lethal; everything in it is permanent.

- **Read the Line** (`turn_toward_player`) — Embermaw faces the guardian.
- **Searing Brand** (`place_counter`, `counter_target: "hero"`, `target_selector: "tank"`) — lays one Sear on whoever holds the Tank Role. Consequence Tier `structural`. Answer tag: `cleanse`.
- **Test the Brand** (`targeted_hit`, `target_selector: "tank"`, range 1, damage 4, `tank_hit`) — the blow the mark prices. Answer tags: `mitigate`, `cleanse`.

The mark is aimed by Role, not by seat, so it keeps working when the second seat is filled.

## The New Answer Keyword

`cleanse` (`data/keywords/cleanse.json`, kind `answer`) — *answered by removing a Counter the Boss placed on a Hero.*

The four existing answer kinds are `interrupt`, `kill_adds`, `mitigate`, and `move`. None of them describes what removes a mark that is already there, so a Beat that placed one had to lie about how it is answered. Naming the answer is also how the gap is stated in content rather than in a comment: the Beat declares `cleanse`, and no authored card carries it.

Note that `cleanse` is a **taxonomy** term, not a card verb. Removal is already expressible — `cardReaderSchema` has `verb: "spend"`, and a card with `target_type: "ally"` and a `spend` reader on `target` is a Dispel. No engine change is needed to answer this Beat; only content.

## The Encounter

`data/encounters/embermaw_attrition_trial.json` — *Embermaw: The Brand*.

Reuses the `embermaw` Boss with its own Program list (`embermaw_hunt`, `embermaw_branding`), looping, 8-Round Clock, board radius 2, Boss health 48, seed 2141. Single-phase: a phase break would be a second variable in an experiment that has one question.

**Why a new Encounter rather than a new Program on `embermaw_prototype`:** each Encounter rolls its own program sequence from its own seed, and three Scenarios (`embermaw_brood_pressure`, `embermaw_enrage_defeat`, `embermaw_solo_ceiling`) replay the prototype action by action. Adding a Program there changes the rolled order and breaks the regression record.

**Why one seat, not two:** the second seat needs a second Hero, and the Restorative does not exist yet. The Encounter's own gate test is the claim that one seat cannot clear it. Adding the seat is a five-line edit when she lands.

## The Gate Test

`web/src/engine/attrition.test.ts`, seven tests against the real catalog rather than a fixture — the claim is about `data/`, not about what the engine could express.

1. The mark lands on a Hero, and not on the Boss.
2. It is aimed by Role selector.
3. It survives a Round boundary.
4. It adds 1 damage per stack, and caps at 2.
5. Armor absorbs the blow entirely and the mark is still there afterwards.
6. **The gate:** no card in the Encounter's authored deck, and no seated Hero's Signature, can `spend` it.
7. The Beat declares the `cleanse` answer, and no authored card in the whole catalog carries it.

Tests 6 and 7 are the ones that will start failing when the Restorative's cleansing cards are authored. That failure is the deliverable, not a regression: update them to assert that the answer now exists and that it is hers.

## What This Does Not Yet Prove

The gate is structural — it proves no card *can* remove the mark. It does not yet prove that a one-seat Party actually fails to clear inside the 8-Round limit. That is the no-healer-clear measurement, and it wants a played line the way `embermaw_solo_ceiling` is a played line. It is recorded as outstanding evidence on D-077.

## Related

- [../design-decision-log.md](../design-decision-log.md) — D-077
- [embermaw-ashen-trial-design.md](embermaw-ashen-trial-design.md) — the Boss's language, unchanged by this Encounter
- [../research/2026-08-20-healer-support-taxonomies-mmo-hero-shooter.md](../research/2026-08-20-healer-support-taxonomies-mmo-hero-shooter.md) — the taxonomy work that named residual attrition as the Healer's justification
