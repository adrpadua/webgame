# Design Proposal: The Signature Slot — a Fixed Hero Power That Does Not Expire

Date: 2026-08-19
Status: Proposed. No live rules change, no engine change, no ADR yet. Requires a product decision, then an ADR (this is the first exception to ADR 0008's full-charge cleanup), then the deck-evaluation gate.
Context: [Fixed hero powers and command zones research note](../research/2026-08-19-fixed-hero-powers-and-command-zones.md), [ADR 0002](../../adr/0002-use-a-persistent-action-bar-with-charge-stacks.md), [ADR 0008](../../adr/0008-use-persistent-charge-stacks-and-full-charge-cleanup.md), [Character Design Bible](../../rules/character-design-bible.md) (the Recovery row of the Hero Design Contract), [tank solo-ceiling note](../research/2026-08-17-tank-solo-ceiling-design.md) (D-016).

## Problem

The deck is the only source of capability, so every authored demand is answered by the shuffle first and the player second. Measured over the live 20-card list (research finding 7):

- each 2-of — the Minion answer, the delayed Armor, the Riposte payoff, the push — is in hand on **~37% of Rounds**;
- **43%** of 8-Round runs contain four or more consecutive Rounds where a given 2-of never appears;
- drawing more barely helps: 2 → 3 cards spent per Round moves availability by 0.1 points.

Escalation makes this expensive rather than merely annoying. A standing demand at a Round's end can accelerate the encounter's only clock, so a `Sweeping Blow` drought converts directly into lost time through no decision the player made. The Hero Design Contract's **Recovery** row asks that "a setback delays the plan; it does not make the Hero nonfunctional." Today Elian's recovery answer is "replace a Slot, or discard for Stamina" — which is re-arranging cards he does not have.

## The framing correction

The question was posed as a choice: *pre-set actions charged with cards*, **or** *a dedicated fixed slot that does not expire*. The research says these are not alternatives.

Every game that ships a fixed power ships both halves at once — a permanent, undrawable ability whose **rate** is bound to the turn's economy. Sentinels prints it on the Hero and rate-limits it to one power phase. Spirit Island prints it on the panel and gates it on the elements of cards you played anyway. Aeon's End prints it on the mat and charges it over turns. Only Hearthstone made it genuinely free, and paid for that by tuning every hero power to be *worse than any two-drop* so it never becomes the automatic line.

This repo is already most of the way there, because ADR 0008 split a Slot into an **installed module** (the Top Card, which owns timing, targeting, and base effect) and its **configuration** (the Charge Stack). A fixed power is simply a Top Card that was never in the deck and never leaves. **The two options in the question are the same object.**

The one genuine split the research found is different: **generic pre-set verbs guarantee a floor and carry no identity** (Marvel Champions' basic Attack/Thwart/Defend/Recover are the same four verbs for every hero in the game), while **a signature power carries identity**. Those are different tools. This proposal recommends building only the second — because the first already exists here: paid movement is a pre-set action, printed on the Hero, always offered in the Quick Window, charged by discarding a hand card.

## Options

### Option A — Free hero power, Hearthstone shape

A per-Round button costing nothing. **Rejected.** It fails D-016 structurally: an unconditional per-Round effect is a *numeric* addition to the solo ceiling, and the tank note's finding 3 is that numeric ceilings erode under optimisation while structural ones hold. It also imports Brode's balance trap — the power must be tuned to be almost-not-worth-pressing or it flattens every Round into the same opening, which is the opposite of what a telegraphed Boss Timeline is for.

### Option B — Generic pre-set verbs for every Hero

A shared menu (strike / guard / step) available to all Heroes. **Rejected for now.** Marvel Champions is the evidence: basic powers reliably prevent a dead turn and are the least memorable thing in the game. Adding a shared verb menu would also flatten the role-superiority principle (D-025) by giving every Hero the same off-role answer for free. The floor job it does is already covered by paid movement.

### Option C — The Signature Slot (RECOMMENDED)

A third Action Bar Slot, always present, whose Top Card is printed on the Hero.

| Property | Rule |
| --- | --- |
| Origin | Authored on the Hero, never in the deck, never drawn, never discarded to the discard pile |
| Persistence | Never replaceable at Loadout; survives its own firing — on activation the **Charge Stack discards and the Top Card stays** |
| Cost | Charged from hand with the existing gesture, obeying the existing Charge rules and Charge Modifiers |
| Rate | Fires once in its printed window, exactly like any other Slot |
| Repetition price | Its Charge Value rises by `1` each time it fires this encounter (the commander-tax knob) |

This is the smallest change that answers the question, because it is *the existing Slot with two flags*: `fixed` (cannot be replaced) and `persistent` (survives cleanup).

Why it holds up against this repo's own constraints:

- **It adds consistency without adding throughput.** Charges come out of the same hand that pays for Stamina and feeds the other two Slots. Total actions per Round are unchanged; only their *reliability* changes. That is precisely the right knob, because the measured problem is variance, not quantity.
- **The solo ceiling stays structural.** The power's rate is bounded by card income, which is bounded by the economy; it cannot be optimised into an extra action. It must still be authored to add no Health income (tank principle 1) and no tempo.
- **Repetition is priced.** Rising Charge Value means the Signature is a dependable floor early and a considered investment late — it never becomes the same button every Round, which finding 4 says a flat cost guarantees.
- **It reuses every seam.** Prepare/charge/fire legality, the Detail Popup, Board Feedback from Resolution Facts, Charge Modifiers reading Keywords, and Counters hosted on `board_slot` (D-048) all apply unchanged.

### Option C2 — Threshold Signature, Spirit Island shape (the alternative worth measuring)

Same fixed Slot, but it takes **no charges of its own**. It reads the Charge Stacks already sitting in the other Slots and resolves each threshold line whose Keywords are present — elements checked, never spent.

This is more elegant, costs no hand cards, and makes the Signature a payoff for a configuration the player was building anyway. It is not recommended as the first build for one reason: it is *free*, which lands it back in Option A's balance trap and in D-016's numeric-ceiling problem, and it is much harder to price. It is the right second experiment if C1 measures as too hand-expensive.

### Option D — Gloomhaven default faces

Give every card a generic alternative face (deal 1 / gain 1 Armor). **Held.** It is a real third answer to the dead-hand problem and needs no new object, but it makes every card partly interchangeable, which directly erodes the card-family vocabulary the Character Design Bible is built on. Worth revisiting only if the Signature Slot measures as insufficient.

## Authoring contract for a Signature

Any Signature must satisfy all of these, in addition to the Hero Design Contract:

1. **No Health income** and **no free tempo** — it may not repair the two things the tank principles reserve for the Healer and for the Vanguard pattern.
2. **Bounded by charges** — every number it produces scales with cards spent, never with a flat printed value alone.
3. **A floor, not a ceiling** — it should be the third-best line in a good hand and the best line in a bad one. If a hand with the right cards still prefers the Signature, it is over-priced upward.
4. **One line of text** — it is permanently visible, so Brode's readability constraint applies with full force.
5. **Answers the Hero's own drought** — it should overlap the demand the Hero's rare cards answer, without replacing them.

### Illustrative candidate for Elian Voss — *not* a proposal to author yet

`Shield Bash` — Quick, Charge Value `2` (rising `1` per firing this encounter): deal `1` damage to an adjacent Enemy per charged card, and gain `1` Armor.

It is Warden-shaped: it reaches the Whelp that `Sweeping Blow` is not in hand to answer, it pays in the currency Elian already spends, it adds no burst and no repositioning (preserving his stated signature weakness of low tempo), and its output is entirely a function of cards committed. Whether these are the right numbers is exactly what the evaluation gate is for.

## Canon this touches

| Canon | Interaction |
| --- | --- |
| ADR 0008 | Full-charge cleanup currently discards the Top Card **unconditionally**. The Signature is the first exception and must be recorded in a new ADR, not implied by content. |
| ADR 0002 | A third Slot is already reserved for progression. The Signature must be a **separate, always-present** Slot, or progression must be explicitly re-planned. These must not silently collide. |
| D-016 | The Signature must not move a solo run's Health trend off monotonically downward, and must not produce a solo Boss kill in any evaluation cohort. |
| D-046 | The Signature reads Keywords through existing Charge Modifiers. It must not introduce a second tag namespace. |
| D-048 | Counters already host on `board_slot`; a Signature Slot inherits this, which is a capability to check rather than build. |

## Implementation seam

`HeroState.actionBar: SlotState[]` is the whole seam. A Signature is `SlotState` plus two booleans, so the change is concentrated:

- `types.ts` — two flags on `SlotState`, and a Signature card reference on the Hero's authored content;
- `setup.ts` — install the Signature Slot at encounter creation instead of leaving it empty;
- `legality.ts` / `legalActions.ts` — refuse `prepare`/`replace` against a fixed Slot;
- `resolve.ts` — at full-charge cleanup, discard the Charge Stack but retain the Top Card, and raise its Charge Value;
- content — a Signature card per Hero, schema-validated in `data/` under ADR 0020.

There are 36 non-test references to `actionBar` across the app; most are rendering that will pick the Slot up for free. The UI question that is *not* free is making a permanent Slot read as different from two replaceable ones on a portrait phone without adding chrome.

## Evaluation gate (before any live change)

1. Product decision recorded as a `D-0xx` entry, then an ADR for the ADR 0008 exception.
2. Hands-on feel pass in a throwaway prototype: does the Signature relieve the drought, or does it become the automatic Round-1 play?
3. Instrumented rerun of `web/prototypes/draw-availability.mjs`'s question against the real engine: the target is that a 4+ Round drought stops being a *capability* drought, not that it stops occurring.
4. `npm run evaluate` cohort under the deck-evaluation rubric, with D-016's amended rule: **any solo Boss kill is a red-flag finding.**
5. No dominant line: firing the Signature must not always beat charging a normal Slot, at any Round.

## Open question for the designer

Should the Signature Slot be **per Hero** (Elian's is not Kessa's) or **per role**? Per Hero is the Sentinels answer and the one this repo's authorship culture points at. Per role would be cheaper to author and would make the Second Hero Of A Role rule harder to satisfy, since the Signature is exactly the kind of thing that should differ between a Warden and a Vanguard.
