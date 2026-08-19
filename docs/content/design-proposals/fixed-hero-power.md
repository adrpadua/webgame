# Design Proposal: The Signature Slot — the Hero's Engine, Given a Home

Date: 2026-08-19 (revised same day — see *Revision* below)
Status: Proposed. No live rules change, no engine change, no ADR yet. Requires a product decision, then an ADR (this is the first exception to ADR 0008's full-charge cleanup), then the deck-evaluation gate.
Context: [Fixed hero powers and command zones research note](../research/2026-08-19-fixed-hero-powers-and-command-zones.md), [champion design note](../research/2026-08-16-lol-champion-design-lessons.md), [ADR 0002](../../adr/0002-use-a-persistent-action-bar-with-charge-stacks.md), [ADR 0008](../../adr/0008-use-persistent-charge-stacks-and-full-charge-cleanup.md), [Character Design Bible](../../rules/character-design-bible.md), [tank solo-ceiling note](../research/2026-08-17-tank-solo-ceiling-design.md) (D-016).

**Revision.** The first draft recommended the Signature as a *floor* — "the third-best line in a good hand and the best line in a bad one." That is retracted on designer direction: **the Signature is the Hero's identity and engine**, so it should be the spine of a good hand, not its fallback. The rejected options below are unchanged; Option C is rewritten, the risk analysis is materially different, and the recommended first increment changed from "author a new power" to "migrate the engine that already exists."

## Problem

Two problems, and the second one only became visible while writing the first.

**The measured one.** The deck is the only source of capability, so every authored demand is answered by the shuffle first and the player second. Over the live 20-card list (research finding 7): each 2-of is in hand on **~37% of Rounds**, and **43%** of 8-Round runs contain a four-or-more-Round drought on a given answer. Escalation charges for standing demands, so a `Sweeping Blow` drought becomes lost time through no decision the player made.

**The structural one.** *Elian already has a fixed hero power. It is Riposte Ready, and it lives in the rules engine rather than in the game.* `counters.ts` declares it an engine Counter alongside Fortified, and `createRiposteReady()` hard-codes Elian's constants in TypeScript: `consumeOnCardId: SHIELD_SLAM`, `bonusBossDamageOnSlotFired: 2`, `bonusBossDamageOffPayoff: 1`, a one-Round duration, expiry at the Quick Window's end. The grant predicate is a hard-coded branch in `resolve.ts`. D-033 left it there deliberately, because the Counter authoring vocabulary models graded consumption badly — and that was the right call for a Counter. But the consequence is that **the one thing that most defines how Elian plays has no home**: it is not on a card, not in `data/`, not on the Action Bar, and not authorable for a second Hero.

The champion note already named this without drawing the conclusion: "Riposte Ready **is** an Ashe R — the payoff is gated on the strictest execution in the kit." An Ashe R is not a fallback. It is the ability the champion is built around.

So the Signature Slot is not a new capability. It is **the place a Hero's engine becomes visible, authorable, and per-Hero** — and giving it that place happens to solve the drought as a side effect, because an engine you always have is an engine the shuffle cannot take away.

## The framing correction

The question was posed as a choice: *pre-set actions charged with cards*, **or** *a dedicated fixed slot that does not expire*. The research says these are not alternatives — every game that ships a fixed power ships both halves at once, a permanent undrawable ability whose *rate* is bound to the turn's economy. ADR 0008 already split a Slot into installed module (Top Card) and configuration (Charge Stack), so a fixed power here is simply a Top Card that was never in the deck and never leaves.

The split that *is* real: **generic pre-set verbs guarantee a floor and carry no identity** (Marvel Champions' basic Attack/Thwart/Defend/Recover are the same four verbs for every hero in the game), while **a signature power carries identity**. This proposal builds only the second. The floor already exists here — paid movement is a pre-set action, printed on the Hero, always offered in the Quick Window, charged by discarding a hand card.

## Options

### Option A — Free hero power, Hearthstone shape

A per-Round button costing nothing. **Rejected.** It fails D-016 structurally: an unconditional per-Round effect is a *numeric* addition to the solo ceiling, and the tank note's finding 3 is that numeric ceilings erode under optimisation while structural ones hold. It also imports Brode's balance trap — the power must be tuned to be almost-not-worth-pressing or it flattens every Round into the same opening. That trap is *worse* under the identity-and-engine framing, not better: an engine tuned to be barely worth using is not an identity.

### Option B — Generic pre-set verbs for every Hero

A shared menu (strike / guard / step) available to all Heroes. **Rejected.** Marvel Champions is the evidence: basic powers reliably prevent a dead turn and are the least memorable thing in the game. It would also flatten role superiority (D-025) by giving every Hero the same off-role answer for free. And it is disqualified outright by the designer's direction — a menu shared by every Hero is the one shape that cannot be an identity.

### Option C — The Signature Slot (RECOMMENDED)

A third Action Bar Slot, always present, whose Top Card is printed on the Hero and carries **two clauses**.

| Clause | Shape | Precedent |
| --- | --- | --- |
| **Standing** | Always on. Never charged, never fired, cannot be turned off. States the conversion that defines the Hero — the condition it watches for and what that grants. | LoL passive; Sentinels innate power |
| **Activation** | Charged from hand with the existing gesture, fires in its printed window, resolves the payoff. On firing, the **Charge Stack discards and the Top Card stays**. | Aeon's End charge ability; LoL ultimate |

Slot properties:

| Property | Rule |
| --- | --- |
| Origin | Authored on the Hero, never in the deck, never drawn, never discarded to the discard pile |
| Persistence | Never replaceable at Loadout; survives its own firing |
| Cost | Activation charges obey the existing Charge rules and Charge Modifiers |
| Rate | Fires once in its printed window, like any other Slot |
| Repetition price | Activation Charge Value rises by `1` each time it fires this encounter (the commander-tax knob) |

**Why two clauses.** An engine is a conversion, not a button. The standing clause is what makes the Hero *play* differently every Round without being pressed; the activation is what makes that conversion pay. One clause alone gives you either a passive with no decision, or a button with no identity. Riposte Ready is already exactly this shape — a standing grant condition plus a graded spend — which is the strongest evidence that the two-clause form is the right container.

**Where variety comes from.** Not availability — the engine is always there, which is the point. Variety comes from **configuration**: which Keywords the player charges into the activation, and what the board and Timeline make worth converting this Round. That is the Spirit Island answer (elements checked, never spent) expressed in this repo's existing Keyword and Charge Modifier vocabulary, with no second tag namespace (D-046).

### Option C2 — Threshold Signature, reading the other Slots

Same fixed Slot, but the activation takes no charges of its own: it reads the Charge Stacks already sitting in the other two Slots and resolves each clause whose Keywords are present.

**Promoted from "alternative" to "the variant to test second."** Under the identity-and-engine framing it is more attractive than it was as a floor, because "reads the configuration you built anyway" is precisely an engine that is fixed but never identical. It is still not the first build, for two reasons: it is free at the point of use, which is Option A's trap wearing a better hat; and it makes the Signature's output a function of the *other* Slots, which deepens the battery problem below rather than answering it.

### Option D — Gloomhaven default faces

Give every card a generic alternative face. **Held.** It solves the drought with no new object, but it makes every card partly interchangeable, eroding the card-family vocabulary the Character Design Bible is built on — and it is a floor, so it does not answer the identity question at all.

## What the identity-and-engine framing costs

These are the consequences of the direction, stated plainly. None is a reason not to do it; all three need answers before build.

### 1. The deck's job changes

If the payoff lives on the Hero, the deck becomes setup, converters, and fuel. The Character Design Bible's Card Family table — particularly the **Payoff** row ("resolves a class-relevant raid problem", "fewer copies than foundation") — is written for a deck that owns its own payoffs. That guidance needs a revision pass, not a footnote: a deck feeding a Hero engine has a different healthy shape than a deck that is the engine.

This is an edit to active authoring guidance and therefore a decision, not an implementation detail.

### 2. D-016 risk goes up, not down

The first draft argued the Signature "adds consistency without adding throughput," because charges come out of the same hand that pays Stamina and feeds the other Slots. **That argument only held while the Signature was a floor.** An engine is a rate multiplier by construction; if it is the Hero's best line, its output *is* throughput.

The bound must therefore be structural and explicit:

- the Signature produces **no Health income** (tank principle 1) and **no free tempo** (Elian's stated signature weakness is low personal tempo — an engine that repairs it deletes his price);
- every number it produces scales with cards committed, never from a flat printed value alone;
- the evaluation cohort is **mandatory**, not prudent, and a solo Boss kill in it is a red-flag finding under D-016.

### 3. The battery problem — the largest design risk

If the Signature is the best payoff and it is always available, the rational player charges it every Round and the other two Slots decay into charge batteries. The Action Bar collapses from three meaningful Slots to one, which would delete the Slot Tension that ADR 0002 names as the main source of player pressure.

Candidate answers, none yet chosen, all measurable:

1. **Steep repetition tax** — Charge Value rising `1` per firing makes back-to-back Signature Rounds progressively unaffordable, forcing normal Slots to carry the intervening Rounds.
2. **Window exclusivity** — the Signature charges only in one named window, so a Signature Round costs the other window's flexibility.
3. **Earned charge** — the activation cannot be charged from hand at all; it charges only when the *standing clause* triggers. The engine then literally runs on doing the job correctly, which is the most identity-expressing option and the most restrictive.
4. **Conversion, not addition** — the Signature's charges come from another Slot's spent stack rather than from hand.

Option 3 is the most attractive under this framing and the most likely to be too tight; it is the one to prototype first, with 1 as the fallback.

## Authoring contract for a Signature

1. **No Health income and no free tempo** — the Signature may not repair what the tank principles reserve for the Healer, or the price that defines the Hero's pattern.
2. **Bounded by charges** — every number scales with cards committed.
3. **The spine of a good hand, not the fallback in a bad one** — if a well-drawn hand routinely ignores the Signature, it is not the engine and the design has failed. (This replaces the retracted "floor, not a ceiling" rule.)
4. **Two clauses, one subsystem** — the standing clause and its activation must read as one idea. The Complexity Budget allows one signature interaction per Hero; a Signature that needs two unrelated paragraphs has become two Heroes.
5. **Permanently visible means permanently short** — Brode's readability constraint applies with full force to a card that never leaves the screen.

### First increment: migrate Riposte Ready, do not author something new

The recommended first build authors **no new balance surface at all**:

> **Elian Voss — Signature: *Riposte***
> *Standing:* A Tank Hit absorbed on the Guarded Front for zero Health loss grants Riposte Ready.
> *Activation (Quick, Charge Value 2, +1 per firing this encounter):* consume Riposte Ready to deal `3` damage, `+1` per charged card.

This is the rule that exists today, moved from `resolve.ts` and `counters.ts` onto a visible, authorable surface — with the activation taking over the job that `Shield Slam`'s two copies do now and whiff at 63%.

Why this is the right first increment for this repo:

- **It is measurable against a known baseline.** The Riposte engine is already tuned and already has an evaluation cohort. Before/after is a real comparison, not a new tuning problem.
- **It removes a hard-coded special case** rather than adding one, and unblocks the same seam Kessa Varn's Momentum would otherwise need its own TypeScript branch for.
- **It proves the container before it proves any content.** If the two-clause form cannot express the engine we already shipped, the form is wrong and we learn that cheaply.
- **It makes the Second Hero Of A Role rule enforceable**, because the Signature is exactly where a Warden and a Vanguard should differ, and today there is nowhere for that difference to live.

Open question this raises: if the Signature owns the Riposte payoff, what happens to `Shield Slam` and to D-015's widened spender rule? Options are retiring the card, keeping it as the off-Signature line at reduced value, or keeping D-015's `+1` on all Boss-damage cards and giving the Signature only the graded `+2`. This needs a design answer, not a default.

## Canon this touches

| Canon | Interaction |
| --- | --- |
| ADR 0008 | Full-charge cleanup discards the Top Card **unconditionally**. The Signature is the first exception and needs a new ADR, not an implied content rule. |
| ADR 0002 | A third Slot is already reserved for progression, and Slot Tension is named as the main player pressure. The Signature must be a **separate, always-present** Slot, and the battery problem is a direct threat to the pressure ADR 0002 depends on. |
| D-033 / D-015 | Riposte Ready was deliberately left in code because Counter authoring models graded consumption badly. A Signature card is the alternative home that did not exist when D-033 was decided — this proposal asks to revisit it on those grounds, not to overturn it. |
| D-016 | Risk increases under this framing (see above). The evaluation cohort becomes mandatory. |
| Character Design Bible | The Card Family table assumes the deck owns its payoffs. Needs a revision pass. |
| D-046 | The Signature reads Keywords through existing Charge Modifiers; no second tag namespace. |
| D-048 | Counters already host on `board_slot`, so a Signature Slot inherits Counter hosting — a capability to check rather than build. |

## Implementation seam

`HeroState.actionBar: SlotState[]` is the whole seam, plus the Riposte migration:

- `types.ts` — `fixed` and `persistent` flags on `SlotState`; a Signature reference on the Hero's authored content;
- `setup.ts` — install the Signature Slot at encounter creation rather than leaving it empty;
- `legality.ts` / `legalActions.ts` — refuse `prepare`/`replace` against a fixed Slot;
- `resolve.ts` — at full-charge cleanup discard the Charge Stack but retain the Top Card and raise its Charge Value; move the hard-coded Riposte grant branch behind the standing-clause evaluation;
- `counters.ts` — `createRiposteReady()`'s Elian-specific constants become authored Signature content; `ENGINE_COUNTERS` loses an entry;
- `data/` — a Signature schema and one Signature per Hero, under ADR 0020.

36 non-test references to `actionBar` exist across the app; most are rendering that picks the Slot up for free. The two things that are *not* free: making a permanent Slot read as different from two replaceable ones on a portrait phone without adding chrome, and giving the standing clause a visible surface — a passive that fires invisibly is the failure mode Riposte Ready has today.

## Evaluation gate (before any live change)

1. Product decision recorded as a `D-0xx` entry, then an ADR for the ADR 0008 exception and the D-033 revisit.
2. Throwaway prototype of the two-clause form carrying the Riposte migration, testing the battery answers (earned charge first, steep tax as fallback).
3. **Battery test:** across the cohort, the two normal Slots must keep firing at a rate comparable to today. If Signature Rounds crowd them out, Slot Tension has been deleted and the design fails regardless of its other numbers.
4. **Engine test:** a well-drawn hand should still want the Signature. If good hands route around it, it is a floor wearing an engine's name.
5. `npm run evaluate` cohort against the existing Riposte baseline, with D-016's rule: **any solo Boss kill is a red-flag finding.**
6. No dominant line: firing the Signature must not always beat charging a normal Slot, at any Round.

## Open questions for the designer

1. **Per Hero or per role?** Per Hero is the Sentinels answer and the one this repo's authorship culture points at; per role is cheaper to author and would make the Second Hero Of A Role rule harder to satisfy, since the Signature is exactly where a Warden and a Vanguard should differ.
2. **Which battery answer?** Earned charge (option 3) expresses identity best and is most likely to be too tight.
3. **What happens to `Shield Slam` and D-015** if the Signature owns the Riposte payoff?
4. **Does the standing clause need to be authorable in `data/`, or may it stay code** with only the activation authored? D-033's original reasoning survives for the standing half, and a partial migration is a legitimate smaller first step.
