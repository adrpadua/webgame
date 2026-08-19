# Design Proposal: The Signature Slot — the Hero's Engine, Given a Home

Date: 2026-08-19 (revised twice same day; design-settled the same day — see *Settled decisions*)
Status: Proposed, design-settled. No live rules change and no engine change yet. Adoption requires the formal `D-0xx` entry, then an ADR (this is the first exception to ADR 0008's full-charge cleanup and it retires D-015), then the deck-evaluation gate below.
Context: [Fixed hero powers and command zones research note](../research/2026-08-19-fixed-hero-powers-and-command-zones.md), [champion design note](../research/2026-08-16-lol-champion-design-lessons.md), [riposte deepening proposal](riposte-payoff-deepening.md), [ADR 0002](../../adr/0002-use-a-persistent-action-bar-with-charge-stacks.md), [ADR 0008](../../adr/0008-use-persistent-charge-stacks-and-full-charge-cleanup.md), [Character Design Bible](../../rules/character-design-bible.md), [tank solo-ceiling note](../research/2026-08-17-tank-solo-ceiling-design.md) (D-016).

## Settled decisions (designer-approved 2026-08-19)

1. **The Signature is the Hero's identity and engine**, not a floor. (The first draft's "floor, not a ceiling" rule is retracted.)
2. **Per Hero**, not per role.
3. **Everything authorable in `data/`** — that is where this project's rules and game components live, and a Hero's engine is a game component. No part of a Signature stays in TypeScript.
4. **Earned charge**: the activation can never be charged from hand; it charges only when the standing clause triggers.
5. **The earn is the charge directly** — the Riposte Ready Counter retires; the Signature's Charge Stack *is* the riposte count.
6. **Shield Slam retires.** Its job moved to the Hero, whole.
7. **D-015 retires**, superseded with its diagnosis intact: an earned proc that silently evaporates is the worst payoff failure mode, and banked charge cures evaporation at the root where the graded cash-out only priced it.
8. **Earned charges persist across Rounds** up to `max_charge: 2`, with no expiry. Overcap is the waste: a perfect block while full earns nothing.
9. **No repetition tax.** The authored Tank Hit cadence is the rate limiter.
10. **Migration numbers are Shield Slam's own**: base `3` Boss damage, `+2` per charge, Quick.
11. **`Iron Guard` fills Shield Slam's two slots** (×6 → ×8). Guard density *is* the earn rate — Armor sized to the incoming Tank Hit is what produces zero-loss blocks, so the same card now pays twice (survival + Charge) and the deck literally feeds the engine. Flagged honestly: more mitigation leans toward the stalemate wall, which Escalation exists to close; the cohort measures it. Raising `Sweeping Blow` instead was deliberately held out — it moves D-003's escalation acceleration, a lever that deserves its own change and cohort, not a rider on the migration.
12. **The bible revision is engine-centric**: the four-part machine loop stays but its payoff relocates to the Signature, the Card Family and Elian Application tables are rewritten under that framing, the Hero Design Contract gains a Signature row, and the authoring contract below ports into the bible — every changed section marked as contingent (⏳) on this proposal's formal adoption, since the bible is active canonical guidance and the engine change has not shipped.

Nothing remains open. The grilling session that produced decisions 1–12 closed its frontier on 2026-08-19.

## Problem

Two problems, and the second one only became visible while writing the first.

**The measured one.** The deck is the only source of capability, so every authored demand is answered by the shuffle first and the player second. Over the live 20-card list (research finding 7): each 2-of is in hand on **~37% of Rounds**, and **43%** of 8-Round runs contain a four-or-more-Round drought on a given answer. Escalation charges for standing demands, so a drought becomes lost time through no decision the player made. The controlled cohort saw the same thing from the play side: the Riposte payoff converted in one of three seeds because Shield Slam (2 of 20 cards) was its only spender.

**The structural one.** *Elian already has a fixed hero power. It is Riposte Ready, and it lives in the rules engine rather than in the game.* `createRiposteReady()` hard-codes his constants in TypeScript — `consumeOnCardId: SHIELD_SLAM`, `+2`/`+1`, one Round, Quick expiry — and the grant predicate is a branch in `resolve.ts`. D-033 left it there deliberately, and rightly for its day. But the consequence is that **the one thing that most defines how Elian plays has no home**: invisible on the bar, unauthorable in `data/`, and needing a fresh code branch for every future Hero (Kessa's Momentum would be the next).

The champion note already named it: "Riposte Ready **is** an Ashe R." An Ashe R is not a fallback — it is the ability the champion is built around. The Signature Slot is the place that ability becomes visible, authorable, and per-Hero. Solving the drought falls out as a side effect, because an engine you always have is an engine the shuffle cannot take away.

## The framing correction

The question was posed as a choice: *pre-set actions charged with cards*, **or** *a dedicated fixed slot that does not expire*. The research says these are not alternatives — every game that ships a fixed power ships both halves at once, a permanent undrawable ability whose *rate* is bound to the turn's economy. ADR 0008 already split a Slot into installed module (Top Card) and configuration (Charge Stack), so a fixed power here is a Top Card that was never in the deck and never leaves.

The split that *is* real: **generic pre-set verbs guarantee a floor and carry no identity** (Marvel Champions' basic powers are the same four verbs for every hero), while **a signature power carries identity**. This proposal builds only the second. The floor already exists — paid movement is a pre-set action, printed on the Hero, always offered in the Quick Window, charged by a discarded hand card.

## Rejected shapes (kept for the record)

- **Option A — free hero power, Hearthstone shape.** Rejected. An unconditional per-Round effect is a *numeric* addition to the solo ceiling (D-016), and it imports Brode's trap: the power must be tuned to be almost-not-worth-pressing or it flattens every Round into the same opening — fatal for something meant to be an identity.
- **Option B — generic pre-set verbs for every Hero.** Rejected. Marvel Champions is the evidence that they prevent dead turns and carry no identity; a shared menu also flattens role superiority (D-025) and is disqualified outright by the identity direction.
- **Option C2 — threshold Signature reading the other Slots' stacks** (Spirit Island shape: elements checked, never spent). Held as the second experiment. Attractive as an engine, but free at the point of use — Option A's trap in a better hat.
- **Option D — Gloomhaven default faces on every card.** Held. Solves the drought with no new object, but makes cards partly interchangeable, eroding the card-family vocabulary — and it is a floor, so it never answers the identity question.
- **Rising-Charge-Value repetition tax** (the commander-tax knob, part of the first two drafts). Dropped. It priced repetition *from hand*; under earned charge the earn rate is already limited by authored Tank Hit cadence, and a tax on top would double-limit the engine. If evaluation shows the engine too rich, tune the earn conditions, not a meta-counter.

## The settled shape

A third Action Bar Slot, always present, whose Top Card is printed on the Hero and carries **two clauses**.

| Clause | Shape | Precedent |
| --- | --- | --- |
| **Standing** | Always on, never charged, cannot be turned off. Watches for one authored event and, when its gates pass, **grants this Slot one Charge**. | LoL passive; Sentinels innate power |
| **Activation** | Fires in its printed window like any Slot — at least one Charge required, once per window. On firing it **spends its whole Charge Stack and its Top Card stays**. | Aeon's End charge ability; LoL ultimate |

Slot properties:

| Property | Rule |
| --- | --- |
| Origin | Authored on the Hero, never in the deck, never drawn, never discarded |
| Persistence | Never replaceable at Loadout; survives its own firing |
| Charging | **Earned only.** Hand cards can never be tucked here; the standing clause is the sole source of Charge |
| Banking | Earned Charges persist across Rounds up to `max_charge`; a trigger while full earns nothing |
| Rate | The authored encounter is the limiter: the Boss decides how often the standing clause can possibly fire |

**Why two clauses.** An engine is a conversion, not a button. The standing clause makes the Hero *play* differently every Round without being pressed; the activation makes the conversion pay. Riposte Ready already had exactly this shape — a grant condition plus a spend — which is the strongest evidence the container is right.

**Why earned charge solves the battery problem by construction.** The prior drafts' largest risk was the other two Slots decaying into charge fuel for the Signature, deleting the Slot Tension ADR 0002 names as the main player pressure. Hand cards physically cannot flow into the Signature, so the normal Slots keep their fuel and their tension. It also flips the D-016 risk back down: the engine's rate is bound to the authored Tank Hit cadence — a *structural* bound, the kind the tank research says holds where numeric ones erode.

**Where the decision lives.** Fire at one Charge for tempo, or ride to the cap for the big hit — knowing that a perfect block while capped is wasted, and the Boss Timeline shows you the next Tank Hit. Overcap avoidance is a mastery read off the Timeline, with zero added rules text. This is the builder/spender loop the [riposte deepening proposal](riposte-payoff-deepening.md) named as Option B, arrived at structurally.

## What the standing clause is

A standing clause is a **Grant**: the mirror of a Counter Reader.

| | Answers | Produces |
| --- | --- | --- |
| **Reader** (shipped) | an event from a closed `when` set | a number — `effect` × `per`, once per Counter held |
| **Grant** (new) | an event from *the same* closed `when` set | one Charge on the Signature Slot, if its gates pass |

Riposte's event is already in the shipped vocabulary: `host_takes_damage` narrowed by `event_keyword: "tank_hit"` — the same D-049 mechanism Readers use. Gates follow the `cardReader` rule verbatim: a closed enumerated set, every gate must pass, no boolean combination — *"the moment this wants `or`, what is being written is an interpreter."* The first Grant needs **no new engine predicates**: `resolve.ts` already computes `health_loss` and `isGuardedFront()` when the Tank Hit resolves. Authoring them is exposure, not new rules.

### The authored form

The Signature is a **card** — not a new component kind — so it inherits `speed`, `max_charge`, `boss_damage`, `target_type`, and Charge Modifiers unchanged. With decisions 5–10 settled, the activation is **entirely shipped vocabulary**: `Charged Assault` (`each_charge_boss_damage`) is already the keyword-less per-charge scaling Steady Strike uses. The card schema gains exactly two things: `fixed: true` and the `standing` array.

```jsonc
// data/cards/elian_riposte.json
{
  "id": "elian_riposte",
  "title": "Riposte",
  "fixed": true,
  "speed": "quick",
  "max_charge": 2,
  "target_type": "none",
  "boss_damage": 3,
  "tags": ["tank", "attack"],
  "charge_modifiers": ["riposte_payback"],   // effect: boss_damage, amount_per_match: 2
  "standing": [
    {
      "when": "host_takes_damage",
      "event_keyword": "tank_hit",
      "gates": ["health_loss_zero", "guarded_front"],
      "grants_charge": 1
    }
  ]
}
```

No `data/counters/riposte_ready.json` is needed — the Counter retires entirely (decision 5). The Grant and its gate list are the only new schema in the proposal.

### What gets deleted

The migration is a net removal from the engine:

- `createRiposteReady()` and the `RIPOSTE_READY` entry in `ENGINE_COUNTERS` (`counters.ts`);
- the `SHIELD_SLAM` card-id constant hard-coded in the rules engine (`counters.ts:9`) — `shield_slam.json` carries no Riposte behaviour at all today; the interaction is prose in its `rules_text` and a card id inside the engine, the same disease one card over;
- the grant branch in `resolve.ts` (replaced by generic Grant evaluation);
- the four D-033 engine-only fields on `CounterInstance` (`bonusBossDamageOnSlotFired`, `bonusBossDamageOffPayoff`, `consumeOnCardId`, `expiresAtWindowEnd`), once nothing constructs them.

## The first increment: migrate Riposte, author nothing new

> **Elian Voss — Signature: *Riposte***
> *Standing:* When you absorb a Tank Hit on the Guarded Front for zero Health loss, this Slot gains one Charge (max `2`; a block while full earns nothing).
> *Activation (Quick):* Spend all Charges: deal `3` damage to the Boss, `+2` per Charge spent.

Why this is the right first increment:

- **It is measurable against a known baseline.** The Riposte engine is already tuned and has an evaluation cohort; before/after is a real comparison.
- **It proves the container before any content.** If the two-clause form cannot express the engine already shipped, the form is wrong and we learn that cheaply.
- **It removes hard-coded special cases** and unblocks the seam Kessa Varn's Momentum needs.
- **It makes the Second Hero Of A Role rule enforceable** — the Signature is exactly where a Warden and a Vanguard should differ, and now there is somewhere for the difference to live.

**One honest caveat on "identical numbers."** The per-charge rate is Shield Slam's own, but banking to the cap creates a `7`-damage ceiling (`3 + 2×2`) where today's is `5` — partly offset by retiring D-015's `+1` on every other Boss-damage card. The net damage economy shift is exactly what the cohort exists to measure; it is flagged here so it cannot masquerade as a zero-surface change.

## What this settles about Shield Slam and D-015

**Shield Slam retires** (decision 6). The case for keeping it was whiff insurance and a second spend route; earned charge deletes both — the earn banks itself on the Signature, and a second spender would need the graded-consumption plumbing back, the exact thing the per-Hero decision dissolved. Kept, it would compete with the Signature for the same identity while being strictly less reliable. The kit's five identities become four plus the Signature; what fills its two deck slots is the remaining open decision.

**D-015 retires with it** (decision 7), recorded as superseded, not as a mistake: its diagnosis (the whiffing proc) was correct, and its cure was the best available before a guaranteed spender existed. Retiring it also removes an anti-synergy trap the guaranteed spender would have created — firing Steady Strike in the same window silently eating the riposte you were saving.

**Why the D-033 blocker dissolves.** D-033 left Riposte Ready in code because graded consumption (`+2` from the payoff card, `+1` from anything else) authored badly. That grading existed *only because* two different things could spend one Counter at two values. Per-Hero Signature + earned charge leaves one payoff route and no Counter at all — nothing graded remains to author. D-033 was right about the vocabulary of its day; these decisions change its premise.

## What the identity-and-engine framing still costs

1. **D-016 vigilance stays mandatory.** Earned charge bounds the engine structurally, but the ceiling caveat above is a real damage-economy change, and the standing rules hold: the Signature produces **no Health income** and **no free tempo** (Elian's stated price is low personal tempo — an engine that repairs it deletes him). Every number scales with Charges earned, never a flat printed value alone.
2. **The deck's card-family shape changes.** With the payoff on the Hero, the deck's job becomes setup, converters, and fuel — and under earned charge, specifically the cards that *cause* perfect blocks: Armor sizing is now literally the earn rate. The Character Design Bible's Card Family table (its Payoff row above all) is written for a deck that owns its own payoffs; it needs a revision pass, being worked in-session.

## Authoring contract for a Signature

1. **No Health income and no free tempo** — the Signature may not repair what the tank principles reserve for the Healer, or the price that defines the Hero's pattern.
2. **Earned, never bought** — the standing clause is the only source of Charge; if a Hero's Signature wants hand-charging, it is not a Signature, it is a third deck slot.
3. **The spine of a good hand, not the fallback in a bad one** — if a well-drawn hand routinely ignores the Signature, the design has failed.
4. **Two clauses, one idea** — the Complexity Budget allows one signature interaction per Hero; a Signature needing two unrelated paragraphs has become two Heroes.
5. **Permanently visible means permanently short** — Brode's readability constraint applies with full force to a card that never leaves the screen.
6. **The earn condition is the Hero's job, stated as a rule** — Elian's is the Warden sentence (*absorb the intended hit on the Guarded Front*). A Signature whose earn condition a new player cannot connect to the Hero's raid job fails the Recognition test.

## Canon this touches

| Canon | Interaction |
| --- | --- |
| ADR 0008 | Full-charge cleanup discards the Top Card unconditionally, and activation never consumes the stack. The Signature inverts both: **its Top Card never discards, and firing always spends its whole stack.** First exception; needs the new ADR. |
| ADR 0002 | A third Slot is reserved for progression; the Signature must be a separate, always-present Slot or progression re-planned. Earned charge protects the Slot Tension ADR 0002 depends on. |
| D-015 | Retired by decision 7, superseded with rationale. |
| D-033 | Revisited: its premise (two graded spenders) no longer exists. Riposte Ready leaves `ENGINE_COUNTERS`. |
| D-016 | The evaluation cohort is mandatory; the `7`-ceiling caveat is the number to watch. |
| D-046 / D-049 | The Grant reuses the Keyword namespace and the `event_keyword` narrowing; no second tag namespace. |
| D-048 | A Slot is already a legal Counter host, so if a future card needs to *read* Elian's earn-state, the door reopens without re-plumbing — this is what made retiring the Counter safe. |

## Implementation seam

`HeroState.actionBar: SlotState[]` plus the deletions above:

- `types.ts` — `fixed` flag on `SlotState`; earned charges need a token representation (today `charges: CardInstance[]` assumes a tucked card — the one genuinely new engine structure);
- `setup.ts` — install the Signature Slot at encounter creation;
- `legality.ts` / `legalActions.ts` — refuse `prepare`/`replace`/`charge_slot` against a fixed Slot;
- `resolve.ts` — generic Grant evaluation where the hard-coded Riposte branch sits; on a fixed Slot's fire, spend the stack and keep the Top Card;
- `content/schemas.ts` — the `standing` array (Grant: `when`, `event_keyword`, `gates`, `grants_charge`) and `fixed`; catalog validation that only a Hero-referenced card may be `fixed`;
- `data/` — `elian_riposte.json`, the `riposte_payback` Charge Modifier, and the deck-list change in `embermaw_prototype.json`: `Shield Slam` out, `Iron Guard` to 8 (decision 11).

UI: a permanent Slot must read as different from two replaceable ones on a portrait phone, and the standing clause needs a visible surface — the earn moment should be Board Feedback, not a silent state change (the failure mode Riposte Ready has today).

## Evaluation gate (before any live change)

1. Formal `D-0xx` entry, then the ADR (ADR 0008 exception, D-015 retirement, D-033 revisit).
2. Throwaway prototype of the earned-charge loop against the scripted Embermaw cadence: does banking versus cashing feel like a read of the Timeline, or does one line dominate?
3. **Engine test:** a well-drawn hand still wants the Signature; if good hands route around it, it is a floor wearing an engine's name.
4. **Battery verification:** earned charge should protect the normal Slots by construction — verify the cohort shows their fire rate unchanged anyway.
5. `npm run evaluate` against the existing Riposte baseline, watching the `7`-ceiling caveat, with D-016's rule: **any solo Boss kill is a red-flag finding.**
6. **Earn-rate honesty:** if the cohort shows the standing clause triggering so rarely the Signature never fires (the "too tight" risk), the fallback is loosening the earn gates — never reopening hand-charging.

## Execution record (2026-08-19, same session)

Landed alongside this proposal, all guidance-side (no rules or engine change):

- The [Character Design Bible](../../rules/character-design-bible.md) revised per decision 12, with ⏳ contingency markers on every changed section.
- [elian-voss-starter.md](../decks/elian-voss-starter.md) corrected to the live JSON (it had drifted: `Steady Strike` ×8 with no `Drive Back`, while `46d2a61` had shipped ×6 plus `Drive Back` ×2), and given a pending-revision note for the Signature migration.
- The same stale list fixed in [prototype-rules.md](../../rules/prototype-rules.md).
