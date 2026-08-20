# Embermaw: The Brand - Attrition Gate

Status: the gate has flipped (D-083). Maren Tallis holds the second seat, and the two tests that proved no card could answer the mark now prove the answer exists and is hers alone. The Encounter is the Restorative's proving ground; the no-healer-clear *measurement* — a played line on this Encounter — is still owed.

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
| `readers` | `host_damage_incoming` → `target_damage`, `per: 1` | Each Sear makes every later blow on that Hero land 1 harder. |

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

## The Played Line

The composition measurement has been run twice (`npm run probe:attrition`, `web/scripts/attritionLine.ts`): both arms over the same 30 seeds, the same guardian sword-and-shield plan in each, with Maren's authored loop — clear, cover, bank — piloting the second seat in the duo arm only. The control arm is `embermaw_attrition_solo_probe`, an evaluation-only Encounter that is the trial with her seat removed.

The first run, against the shipped 48-health Embermaw, found the duo clearing 5 of 30 — a Tank and a Healer ending the fight with no Damage seat at the table. That is a composition failure, not a success: the Role Contract fields 1–2 Damage Heroes because ending the fight is *their* job. The trial now fields **`embermaw_branded`**, the same drake at two-seat scale (72 health) — the party-scaling rule applied as authored content: the walls rise with the Party, the Tank's numbers stay constant.

Against the wall, over the same 30 seeds:

| Arm | Clears | Loss shape | Avg guardian health at end | Avg boss health left | Cleanses / run |
| --- | --- | --- | --- | --- | --- |
| Solo — no Healer | **0 / 30** | Dead to attrition at avg Round 7.1, before the Clock | 0.1 | 49.0 of 72 | 0 |
| Duo — Maren playing | **0 / 30** | The Enrage Clock, both Heroes alive, Boss holding half its pool | 15.8 | 37.9 of 72 | 1.8 |

What the numbers say:

- **Both composition gates hold in play.** Without the Healer, the front line dies to the priced blows before the Clock matters — the loss names the missing Healer. With her, the Party survives the full fight and still cannot end it — the loss names the missing Damage seats. Each Role's absence produces its own legible failure, which is Principle 5's shape twice over.
- **The wall is sized for the seats that are missing.** The duo removes ~34 health across a full run; a single Damage Hero contributing ~5–8 per Round closes the remaining ~38, so a trio clears where a duo cannot and a full four-seat Party clears with room. Those forward numbers are assumptions until a Damage Hero exists to measure — the third arm this probe grows when one lands.
- **The pinned line** (`data/scenarios/brand_trial_duo_line.json`, seed 1002, 71 steps) is the survived loss: defeat by the Clock with both Heroes living and the Boss standing. `attrition.test.ts` replays it asserting exactly that shape plus her kit's attribution — a duo that clears here again means the Damage seats stopped being load-bearing.
- **These are policy floors, not ceilings** — the sweep's standing caveat. The floor-vs-ceiling gap is why the wall sits at 72 rather than snug against the measured 48: a human duo playing the ceiling (deliberate overheal, banked covers) beats these scripts and must still fall short.
- Two tuning reads carried forward unchanged: at the policy floor her overflow game barely fires (0.7 damage/run) so the Signature reached full bank in under a quarter of runs — Q23's cap and the earn rate still want a deliberate-overheal line before either number moves.

## Related

- [../design-decision-log.md](../design-decision-log.md) — D-082
- [embermaw-ashen-trial-design.md](embermaw-ashen-trial-design.md) — the Boss's language, unchanged by this Encounter
- [../research/2026-08-20-healer-support-taxonomies-mmo-hero-shooter.md](../research/2026-08-20-healer-support-taxonomies-mmo-hero-shooter.md) — the taxonomy work that named residual attrition as the Healer's justification
