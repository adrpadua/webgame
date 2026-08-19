# Research: Fixed Hero Powers, Command Zones, and the Price of Always-Available

Date: 2026-08-19
Method: Targeted web search across the five games that already carry the mechanism, plus one piece of **first-party, reproducible evidence** — a headless draw-availability simulation over the live 20-card Elian Voss deck (`web/prototypes/draw-availability.mjs`). Every wiki fetch was egress-blocked (`spiritislandwiki.com`, `aeonsend.wiki.gg`, `sentinelswiki.com`), the same limitation the [tank solo-ceiling note](2026-08-17-tank-solo-ceiling-design.md) recorded, so external claims are assembled from convergent search-index snippets and are marked **medium confidence**. The measurement is high confidence and reproducible.
Scope: Should this game add an always-accessible player capability that does not depend on the draw — and if so, is it *pre-set actions charged with cards*, or *a dedicated fixed power slot that does not expire*?

## Executive Summary

Five games solve this problem and **none of them solves it the way the question is usually framed**. The framing assumes a trade between "pre-set actions charged with cards" and "a fixed slot that never expires"; in practice the successful designs are *both at once* — a fixed, undrawable ability whose **rate** is bound to the turn's economy. Sentinels prints the power on the Hero and prices it at one power phase per turn. Spirit Island prints it on the Spirit panel, charges nothing, and gates it on the elements of the cards you played anyway. Aeon's End prints it on the mage mat and charges it over several turns. Magic puts the commander outside the deck entirely and prices repetition with an escalating tax. Only Hearthstone made the power genuinely free and unconditional, and the designers' own account of what that cost is the strongest cautionary finding here.

The second finding matters as much: **pre-set generic actions and a fixed signature power are different tools with different jobs.** Marvel Champions' basic powers are the pure pre-set-action answer — they reliably prevent a dead turn, and nobody's memorable turn is a basic attack. Pre-set actions are a *floor*; a fixed power is an *identity*. Deciding between them is a category error; deciding what each one is for is the real design work.

Locally, the premise checks out. In the live deck, **any 2-of card is in hand on only ~37% of Rounds, and 43% of 8-Round runs contain a stretch of four or more consecutive Rounds where it never appears.** "Hoping for the right card at the right time" is not a feeling; it is the measured behaviour of a 20-card deck with a 4-card hand.

## Findings

### 1. Hearthstone: "free and always available" buys consistency at the price of triviality (medium confidence)

Hearthstone's Hero Power is the purest form of the fixed power: 2 mana, once per turn, never drawn, never expires, unchanged all game. Ben Brode's account of designing them is an account of constraints, not of freedom. Because the power is always available, it had to be balanced to be *worse than any two-drop the player might otherwise play* — otherwise using it on turn two becomes the automatic line — and it had to be simple enough to read at a glance, because a paragraph of text attached to a permanently visible button is unacceptable for new players. His stated goal was that "gameplay be determined by the cards drawn, so every game feels different"; the Hero Power exists to be the *fallback* that keeps a dead hand playable, explicitly not the thing you build around. The result is a razor-thin balance band that every class's power must sit inside simultaneously.

The transferable warning is precise: **an unconditional per-turn effect must be tuned to be almost-not-worth-doing, or it flattens every turn into the same opening.** That is a hard place to design from, and it is the exact place a game with authored per-Round Boss pressure least wants to be.

Source: [Ben Brode interview, GosuGamers](https://www.gosugamers.net/hearthstone/features/38103-senior-game-designer-ben-brode-talks-hearthstone).

### 2. Both of this repo's primary pillars already carry a fixed power — and neither made it free (medium confidence)

**Sentinels of the Multiverse** prints an Innate Power on the front of every Hero character card, alongside HP; the flip side carries the incapacitated abilities. It is used in the Power Phase of the Hero's turn, and each power may be activated only once per turn — the rate limit *is* the turn structure, not a cost. This is the "dedicated fixed slot that does not expire" in its cleanest form, and it is inseparable from why Sentinels heroes feel authored: the innate power is the one line of text that is true about the Hero in every game, whatever the deck does.

**Spirit Island** is the more interesting one, because it is the closest structural analogue to this repo's Action Bar. Innate Powers sit on the Spirit panel, **cost no Energy and no Card Play**, and are gated by Elemental Thresholds. Crucially, elements are *checked, never spent*: you have an element from the moment you pay for a Power Card, and each threshold line resolves independently, top to bottom, for every threshold you meet. So the fixed power **reads your card play instead of consuming it** — the cards you were going to play anyway decide how much of the innate power fires.

That is a design this repo is one small step away from, because the Charge Stack already puts a readable set of cards underneath an installed ability, and Charge Modifiers already read their Keywords.

Sources: [Sentinels glossary](https://sentinelswiki.com/index.php?title=Glossary), [Dized: SotM card types and terms](https://rules.dized.com/game/t5Aef3TwTXuA8DkV7q5UEQ/izSQNYv1T_KxW9w41tdgOA/card-types-keywords-and-terms), [Dized: Spirit Island innate powers](https://rules.dized.com/game/zuxKPAGpQWaqnMZgld8YBg/0gvoGdTSQiK-ez_YFpHhPQ/innate-powers), [Spirit Island wiki: Powers](https://spiritislandwiki.com/index.php?title=Powers), [Spirit Island FAQ: elements and thresholds](https://querki.net/raw/darker/spirit-island-faq/Elements+and+Elemental+Thresholds).

### 3. Aeon's End: the charge model is the closest existing twin to our Charge Stack (medium confidence)

Each Aeon's End mage has one unique, powerful ability printed on their mat. It is charged over time — 2 Aether per charge during the main phase, or from cards that grant charge — up to the number of charge spaces on the mat. The ability activates only when every space is filled, may be used on the turn the final charge lands, and **all charge tokens are removed on activation**. Some mages carry variable-cost abilities: Cairna's costs a minimum of three charges and may be paid up to six for a stronger result.

This is "a fixed power slot that does not expire" and "charge it with your economy" as one object, shipped and load-bearing in a co-op deckbuilder. Two details are worth stealing outright: the **full-charge activation** (which this repo already has, in ADR 0008's full-charge cleanup), and the **variable cost band**, which converts a fixed power from a button into a decision about *when it is worth enough*.

Sources: [Aeon's End wiki: Breach Mage](https://aeonsend.wiki.gg/wiki/Breach_Mage), [Aeon's End wiki: Charge](https://aeonsend.fandom.com/wiki/Charge), [Aeon's End: Cairna](https://aeonsend.fandom.com/wiki/Cairna).

### 4. The Commander Zone's real lesson is the tax, not the zone (medium confidence)

The commander lives in the command zone rather than the deck, so it never has to be drawn — that is the consistency half, and it is the half everyone quotes. The design half is the balancing lever: rule 903.8 charges an additional 2 generic mana for each previous time you have cast it from the command zone this game. The commonly stated rationale is that *because* the commander is always available, repetition needs a price — the tax gives the rest of the table breathing room and keeps recasting a risk/reward decision rather than a formality. The tax has never moved off 2 since implementation.

The transferable idea is not "put a card outside the deck." It is: **guaranteed availability and flat repetition cost are a bad pair; guaranteed availability and escalating repetition cost are a good one.** A fixed power that costs the same on Round 8 as on Round 1 will be pressed on Round 1 through 8.

Sources: [CoolStuffInc on commander tax](https://www.coolstuffinc.com/a/what-is-commander-tax-rules-06252026), [Draftsim on commander tax](https://draftsim.com/mtg-commander-tax-edh/), [MTGRocks](https://mtgrocks.com/what-is-commander-tax-in-edh/).

### 5. Marvel Champions: pre-set generic actions guarantee a floor and carry no identity (medium confidence)

Marvel Champions is the pure "pre-set actions" answer, and it is co-op with a scripted villain, so it is the nearest genre neighbour. Basic powers are printed on the two-sided identity card: the hero side carries basic Attack, basic Thwart, and basic Defense; the alter-ego side carries basic Recovery. Each costs only exhaustion — no card, no resource — and each is usable only in the form that prints it. Their value is exactly the floor: a hand of unplayable cards still produces a legal, useful action every turn.

But that is *all* they are. Basic powers are the same four verbs for every hero in the game; hero identity lives entirely in the hero's own Hero Ability and deck. This is the clearest available evidence for the split: **pre-set generic actions solve the dead-turn problem and cannot solve the identity problem.** A game that wants both needs both, and should not try to make one object do both jobs.

Sources: [Marvel Champions rules, UltraBoardGames](https://ultraboardgames.com/marvel-champions/game-rules.php), [Marvel Champions rulebook, RulesPal](https://www.rulespal.com/marvel-champions/rulebook).

### 6. Gloomhaven: the floor can live on the cards instead of beside them (medium confidence)

Gloomhaven puts the floor inside the card itself: any top action may instead be played as Attack 2, and any bottom action as Move 2. The player never has a dead card, because every card carries the generic baseline as an alternative face. Search did not surface designer commentary on the rationale, so this is recorded as a mechanism, not as an argued design position.

It is worth naming because it is a **third structural answer** the original question did not contain: the guaranteed floor need not be a separate object at all. It can be a default face on every card. The cost is that it makes every card partly identical, which is a real price in a game whose card families are the identity vocabulary.

Source: [Gloomhaven rules summary, OfficialGameRules](https://officialgamerules.org/game-rules/gloomhaven/).

### 7. First-party measurement: the variance the question is reacting to is real and large (high confidence — reproducible)

The live encounter deck (`data/encounters/embermaw_prototype.json`) is 20 cards: `steady_strike` ×6, `iron_guard` ×6, `sweeping_blow` ×2, `fortify` ×2, `shield_slam` ×2, `drive_back` ×2, with a 4-card opening hand and refill-to-4 at Round end.

Simulating the card economy alone — no board, no Boss — over 40,000 8-Round runs, discarding uniformly at random to avoid favouring or protecting any identity:

| Cards spent / Round | 6-of in hand at Loadout | 2-of in hand at Loadout | Runs with a 4+ Round drought on a given 2-of |
| --- | ---: | ---: | ---: |
| 2 | 79.3% | 36.8–37.0% | 59.2–59.7% |
| 3 | 79.3–79.4% | 36.8–36.9% | 43.3–43.7% |

The 2-of columns are ranges because all four 2-ofs are measured independently; they agree to within a third of a point, which is the sanity check that the model is not favouring any identity.

Reproduce with `node web/prototypes/draw-availability.mjs`.

Three readings:

1. **The 2-ofs are the whole problem.** Four of the deck's six identities — the Minion answer, the delayed Armor, the Riposte payoff, and the only push effect — are each present on roughly **one Round in three**. Every authored demand answered by a 2-of is a demand the player answers by luck first and skill second.
2. **Droughts cluster.** Nearly half of runs contain four or more consecutive Rounds in which a specific answer never appears. On an 8-Round clock that is half the encounter, and it lands wherever the shuffle puts it, not where the Boss Timeline puts the pressure.
3. **Spending harder barely helps.** Going from 2 to 3 cards spent per Round moves the 2-of availability by 0.1 points, because refill-to-4 replaces exactly what was spent. Drawing more is not a fix for variance of this shape; it only shortens droughts (59% → 43%). This is consistent with the [flat-draw economy proposal](../design-proposals/card-economy-draw2.md), which found economy shape, not economy size, to be the lever.

This is also a second, independent measurement of the failure the [Riposte deepening proposal](../design-proposals/riposte-payoff-deepening.md) already recorded from play: the payoff "converted in one of three seeds" because Shield Slam was not in hand. Same cause.

### 8. Local precedent: this game already ships a pre-set action charged with cards (high confidence)

Paid movement is exactly the mechanism under discussion, already live and already proven on the touch surface. It is not in the deck, never expires, is always offered during the Quick Window, and is charged by discarding a hand card for `1 Stamina`. Its rules text is on the Hero, not on a card.

Whatever shape a fixed power takes, it should be recognisably the *same* offer as movement — an always-there action the Hand pays for — rather than a new sub-system with its own vocabulary.

## What Transfers, and What Does Not

| Source | Take | Leave |
| --- | --- | --- |
| Hearthstone | The dead-hand floor is a real, load-bearing job | Free and unconditional: it forces the power to be tuned to almost-not-worth-doing |
| Sentinels | The fixed power is printed on the Hero and is the one line true in every game | Rate-limiting purely by turn structure — this game's Rounds are shared windows, not per-Hero turns |
| Spirit Island | The fixed power **reads** the cards you played rather than consuming extra resources | Eight-element vocabulary; this repo already has Keywords and does not need a second tag namespace (D-046) |
| Aeon's End | Charge it over Rounds; a variable cost band turns the button into a decision | The Aether economy — charging must ride the existing hand-card gesture |
| Commander | Escalating cost per use within the encounter | The zone-as-mechanism framing; the zone is the boring half |
| Marvel Champions | Generic pre-set actions guarantee a floor | Expecting them to carry identity — they demonstrably do not |
| Gloomhaven | A floor can live on every card as a default face | Making cards partly interchangeable, which erodes the card-family vocabulary |

## Open Questions For Design

1. Does the fixed power occupy a third Action Bar Slot, or sit outside the bar? ADR 0002 already reserves a third Slot for progression; the two must not silently collide.
2. Is the fixed power one per Hero (identity) or a small shared set of verbs (floor)? Finding 5 says these are different tools; the repo may want both, and should not conflate them.
3. What stops a fixed power from becoming the same button every Round? Finding 4 says a flat cost will not.
4. How does a fixed power interact with D-016? Any capability whose rate is not bound to card income is a **numeric** addition to the solo ceiling, and the tank note's finding 3 says numeric ceilings erode under optimisation.
5. ADR 0008 discards a Top Card at full-charge cleanup unconditionally. A power that "does not expire" is the first exception, and needs to be recorded as one rather than implied.

## Incidental Finding

[`docs/rules/prototype-rules.md`](../../rules/prototype-rules.md) documents the tank starter deck as `Steady Strike` ×8 with no `Drive Back`. The live encounter JSON carries `Steady Strike` ×6 and `Drive Back` ×2. The doc is stale; the totals still come to 20. Flagged, not fixed — the deck list is canon-adjacent content and correcting it belongs to whoever owns the Shield Wall list.
