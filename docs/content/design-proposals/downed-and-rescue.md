# Design Proposal: Downed is One State, and Rescue is a Card

Date: 2026-08-20
Status: **Settled by grilling 2026-08-20 (rounds 6–10, all five closed by designer acceptance). Adopted as D-074 (ADR 0039).** Supersedes D-070 / ADR 0036, **which shipped on main while this was being grilled** — so this is a migration of live code, not a greenfield build. See *[What contact with the shipped code changed](#what-contact-with-the-shipped-code-changed)*.
Context: [ADR 0036](../../adr/0036-give-zero-health-two-states-downed-then-incapacitated.md), [ADR 0035](../../adr/0035-field-a-party-of-heroes-and-let-cards-reach-allies.md), [ADR 0032](../../adr/0032-give-each-hero-a-fixed-signature-slot-with-earned-charges.md), [Character Design Bible](../../rules/character-design-bible.md), [healer/support research note](../research/2026-08-17-healer-support-design-lessons.md), [co-op boss repeatability note](../research/2026-08-17-coop-boss-design-repeatability.md).

## What changed, and why there is a second proposal at all

D-070 designed a two-state ladder: **Downed** for two Rounds, then **Incapacitated** forever. It was an MMO import — a rescue window with a battle-rez race inside it — and the designer rejected the import outright, twice. First the corpse run ("think D&D 5e or Baldur's Gate rules"), then the window itself:

> I don't think there should be a window anymore. Let's simplify it to if you're <1 HP, you're knocked out/incapacitated/downed/etc. Your healer (guaranteed to have 1 per game) can revive you with a card in their deck that allows such.

That deletes the two-Round window, the terminal state, and the charge pool that gated rescues — and replaces scarcity-by-charge with scarcity-by-card. It also left one case open in the designer's own words: *"If your healer dies, i'm not sure what to do."*

This was drafted believing D-070 was paper. It is not: `web/src/engine/downed.ts` shipped to main mid-grilling, complete with the window, the expiry, the `unanswered_rescue` charge and the three diminished actions. So the change is a **migration** — code comes out, not just prose — and the parts of ADR 0036 that were merely arguments before are now behaviour with tests behind them.

What follows is the collapsed design, plus the four defects the grilling found in it — three of them in recommendations this document's own author had made a round earlier — and then the two places where the shipped code changed the design rather than the other way round.

## The design

### One state

A Hero at `health <= 0` is **Downed**. It is derived from the number, not stored: every consumer already asks about health (`selectBeatTarget` filters `health > 0`), and a derived state cannot desynchronise from the value that defines it. Revive writes the health back; that is the entire transition, in one write.

Downed is **stable**. No timer, no window, no expiry, no second state. It ends by Revive or with the Encounter. `Incapacitated` is retired before it was ever built.

The body's behaviour is D-070's, unchanged, because none of it depended on the window:

- blocking, non-targetable, on its hex;
- keeps its Counters (D-045: a Counter never outlives its host, and the host is still on the board);
- satisfies neither a Beat's Role selector nor the proximity demand.

Two things are new, and both close resource leaks:

- **Slots and Charges freeze.** Loaded cards stay tucked, earned Charges stay counted, every action but the diminished one is refused. Same argument as the Counters, and it is what makes a rescue worth a card: a Hero returning at 1 health with empty Slots returns unable to act.
- **The hand does not refill.** The hand they fell with is their whole budget on the floor.

### Getting up

A **Revive** returns the Hero at the card's authored `revive_to`. Every card written today prints `1`.

The designer's ruling was a flat 1 health — "that's the cost". A flat 1 compiled into the resolver is exactly what ADR 0036 constraint 6 forbids: *"the number that decides how forgiving the whole game is, living where no designer can reach it."* Authoring it satisfies both: the game plays as ruled, and the lever stays reachable. It also gives Role superiority somewhere to live — the Healer's Revive may print a larger number than an off-role line, as authored content rather than as a special case.

**The Healer's Revive is their Signature** — D-064's fixed Slot, second consumer. Always present, always visible, costs the Round to fire, never touches the seeded deck, and charged by **allies taking damage**, so it fills precisely when the party is losing. That is the proactive-healing grammar the research argues for over the reactive one.

The designer's phrasing was "a card in their deck", and this is not literally that. The phrase is read as intent — the Healer owns it, it is theirs, firing it spends their Round. A shuffled deck delivers none of the three: `initial_deck_shuffle` and the discard reshuffle at `advancePhase.ts:189` mean "in the deck" is a probability, not a guarantee. A tutor was considered and rejected: any mechanism that moves the card either disturbs the seeded draw line ADR 0036 constraint 4 protects, or bypasses the Action Bar economy where every other card's cost lives — and an uncapped revive that costs nearly nothing is not the design its own price argument assumed.

**Rescue is not exclusive.** `character-design-bible.md` bans the alternative in as many words — *"never write a hard lock (`[HEALER ONLY]`) where a premium would do"* — and D-025's run-ending test names permanent Hero loss explicitly, which obliges at least one off-role line.

The off-role line already exists and already carries the premium: the shipped `revive_ally` is a universal action costing **adjacency, one card from hand, and the whole Round** — three of the four entries in D-025's fixed cost vocabulary, priced in `legality.ts:204`. It stays exactly as it is. What changes underneath it is only what a rescue returns.

The Healer is not undermined by this. A once-adjacent, one-card, whole-Round revive does not replace someone who does it at range, repeatably, off a Charge the fight itself supplies.

Off-role-ness needs no new field when authored rescue cards do arrive. Every card in a deck carries its owner's Role Keyword, so that says nothing about function; rescue becomes an **`answer` Keyword** beside `interrupt`, `kill_adds`, `mitigate`, `move` and `position`, and off-role reads as *this answer's suited Role is not this deck's Role*. That is the decision. Its *implementation* defers with the Healer, for the same reason the Grant `when` does — see below.

### If the Healer dies

The party falls back on the expensive lines. It is a severe blow, not a wall.

No rule says to save the Healer first. A printed discount for reviving a Healer was considered and rejected: it prints a Role name on a card, which is the same shape as the hard lock the bible bans, and D-025's cost vocabulary has four entries, all *costs* — there is no discount in it. The priority is emergent and already true, because the Healer holds the only repeatable revive. A rule mandating it would delete the decision it was meant to create.

This is the answer to the open question in the designer's message, and it is the answer the no-blame-sink principle requires. Under the alternative — nobody else can revive — one seat becomes the single point of failure for everyone else's recovery, and every wipe is traceable to one person.

### The player on the floor

Each Round, a Downed player takes **one of ADR 0036's three diminished actions** — `grant_ally_armor`, `ally_draws_card`, `reduce_escalation` — and **pays one card from hand** for it.

The set is kept exactly as ADR 0036 names it, including its rule that these are named for the mechanic and never for one Hero's flavour. What moves is where the set attaches: it belonged to `Incapacitated`, which no longer exists, so it attaches to Downed. That matters more here than it did there. Under a window the longest anyone waited was two Rounds; under a stable state a player can be down for the rest of the fight, so the action is load-bearing rather than consoling.

The card cost is new, and it is what makes the set survive the collapse. `reduce_escalation` is the only effect in the game that moves the clock backwards, and ADR 0036 already flags it as the set's one balance-relevant unknown. Free and repeatable against `ESCALATION_MAX = 5`, on a state with no expiry, it would be the strongest thing a Hero can do — achieved by being knocked out. Priced against a hand that never refills, it is a finite, shrinking resource: the fallen player holds the line for a few Rounds and then cannot.

This keeps ADR 0036 constraint 5 intact — none of the three touches the Boss's health — and it makes the fallen player a diminishing resource rather than a spectator, and never a debt.

### Pressure, and defeat

**No new Escalation source.** The three demands already in `escalation.ts`'s `DEMANDS` table bill more when bodies are on the floor, automatically, priced by the designer on the Beat: a Downed Hero answers no Role selector, cannot stand in reach for `demand_proximity`, and cannot strip a Counter before it reaches the cap `unanswered_counter` prices. `unanswered_rescue` is not built.

Defeat is **every seat Downed**. ADR 0036 needed an explicit clause — *"Downed requires a living ally, so a solo Hero at zero is still immediate defeat"* — because its Downed state had a window to enter. Under a stable state the clause is derived: a Party of one that falls has every seat Downed, so the Encounter ends immediately, with no special case and both authored solo Encounters unchanged. The Escalation ceiling remains the other, slower ending; both already exist in the engine.

## The four defects this design had, and where they came from

Three of these were in recommendations made one round earlier in the same grilling session, and the fourth was in canon. They are recorded because each one is a class of mistake, not a typo.

### 1. The free cancel

An earlier round gave the Downed player a one-card action that cancelled the Escalation their body generated. Hands refill to `refillTarget` at every Round start (`advancePhase.ts:184`), so the card spent was a card returned — the action was free, infinite, and the pressure it opposed never landed. **Class**: pricing an action without reading the economy that replenishes its cost.

### 2. The card battery

Replacing the cancel with a card handed to an ally moved the same leak one step: a Downed Hero refilling every Round gives the party a free card per Round for as long as they lie there, and falling becomes an advantage. That is `ally_draws_card`, which is one of the three actions ADR 0036 already names — so this is not a hypothetical about a rejected draft, it is the price of the set as it stands. Fixed by stopping the refill, which prices all three at once and also preserves the seeded draw line by the simplest available means: not consuming it. **Class**: the same leak, wearing a different action.

### 3. The drip against a five-point clock

`ESCALATION_MAX = 5` (`escalation.ts:12`), and the automatic tick already spends one point per Round. A per-Round `unanswered_rescue` charge that grows with time down kills a party about two Rounds after the first fall — restoring, through the back door, the terminal state the designer had just deleted. It also had no home: every entry in `DEMANDS` is keyed to a Beat kind with its price authored on that Beat, and a Hero falling is not a Beat. **Class**: adding a pressure source without checking the size of the budget it spends from.

### 4. The setup-era fallback, meeting attrition

`selectBeatTarget` falls back to `seats[0]` when no living Hero plays the requested Role, and the comment at `timeline.ts:73` justifies it for *an off-composition party* — a fact settled before Round 1. Under stable Downed, a party becomes off-composition **mid-fight**, every time someone falls: a Tank Hit authored against Tank armour lands on seat 0 at full damage, and seat order decides who dies. The same comment already calls seat order a placeholder for Threat.

This one is **kept as-is and measured**, not fixed. The fallback is already loud — the fact carries `target_selector_fell_back` precisely so this cannot become "a balance mystery three cohorts later" — and changing it before a single cohort has run with bodies on the floor would be tuning against imagination. The sweep gains a fallback count alongside the Hero-Rounds-lost metric.

## What contact with the shipped code changed

Two things, and in both the shipped code was right and this proposal was wrong.

**There is no Guardian rescue card to author.** The plan was a new off-role Revive card in the Guardian's deck. The shipped `revive_ally` is already that line, and better: it is universal, so *every* Role has the expensive answer without anyone spending a deck slot on a card they hope never to need. That is a stronger reading of "superiority, not exclusivity" than a per-deck card, because it removes the deckbuilding tax on the guarantee while leaving the Healer's advantage — range, repeatability, a Charge the fight supplies — completely intact. The card is not authored.

**The `rescue` answer Keyword defers with the Healer.** With no authored rescue card, no card would carry it. A keyword in the namespace that nothing references is dead content that reads as canon — the identical objection this proposal raises against shipping the ally-damage Grant `when` early, and it would be inconsistent to make it in one place and not the other. The decision stands as written; the JSON waits for a card.

**The revive amount moves but does not leave content.** It lives today as `revive_health_fraction` on the Encounter, defaulting to `0.25` — already reachable by a designer, which is what ADR 0036 constraint 6 asked for. It becomes `revive_to`, an absolute health value, authored `1`. Absolute rather than fractional because the ruling is about the *state you return in* — one hit from going back down — and a fraction of maximum health says something different for a Hero with 40 health than for one with 12. It stays on the Encounter until there is a card that wants to override it.

## Evidence

D-016 says any solo victory is a red flag, and ADR 0036 extended that to reduced-Party victories. Under a stable Downed state, playing short-handed stops being exceptional, and a binary end-state check now fires on a party that lost someone in the final Round and won anyway — a good fight, flagged as a decorative Hero.

It is replaced by a dose measure: **Hero-Rounds lost** — how many Hero-Rounds the party spent short-handed — with a threshold. That is what D-016 actually cares about: whether the missing Hero mattered. It ships in the same change, because a change that makes short-handed play ordinary is uninterpretable in its first cohort without the measure that says whether short-handed play is healthy.

## Deferred, deliberately

There is no Healer. `data/heroes/` holds exactly one Hero and it is `guardian.json`; `data/keywords/` holds exactly one `role` keyword and it is `tank`.

So the state and the mechanism ship first, with the Guardian's off-role premium line as the only consumer — D-064's own precedent, named in ADR 0036's accepted costs. Three things wait for the Hero:

- the `healer` Role Keyword;
- the Healer Hero and their deck — already specified as [issue 17, The First Healer Hero](../../../.scratch/product-backlog/issues/17-first-healer-hero.md), and already `ready-for-agent`;
- the ally-damage Grant `when`. D-071 widened `EVALUATED_GRANT_WHENS` from one value to four, and all four are host-facing: `host_takes_damage`, `host_deals_damage`, `slot_fired`, `round_start`. An ally-facing earn is a fifth, and `GATES_BY_WHEN` would need its row. The module treats that enum as a promise that the event is read where it resolves, so an entry with no consumer is dead code that reads as canon.

### One collision to resolve there, not here

The Healer's Revive claims the Signature Slot. So does the **Bond** — the Atonement-shaped ward that converts the Enchanter's Boss damage into ally healing, which issue 17 names as *"the researched Signature candidate"* and the healer research note argues for as the answer to green-DPS limbo. Both cannot be the Signature, because there is one fixed Slot per Hero.

This is recorded rather than resolved. Nothing here is built for a Healer that does not exist, and the question belongs to the change that authors her — with three shapes visible from this distance: the Bond takes the Slot and the Revive returns to the deck with its guarantee coming from the Bond's own Grant; the Revive takes the Slot and the Bond becomes the deck's engine; or the Enchanter yields the Revive to a later Healer and owns sustain without rescue. What must not happen is the collision being *discovered* during that change, which is why it is written down now.

The decision that stands regardless is narrower than it looks: **a guaranteed Revive is guaranteed by a fixed Slot, not by a deck.** Which card the Enchanter prints in hers is the open part.

Shipping the expensive line first is also the better measurement: it is the one most likely to be mispriced, and it means the Healer is authored against a rescue economy that already has numbers, rather than being shaped by a mechanism written the same week.

## Accepted costs

**Every Healer's Signature is the Revive.** One fixed Slot per Hero stays true, so a Healer cannot differentiate on the Signature's identity. They differentiate on the Grant and the full-charge rider, which is the shape D-064 built. "The Healer's signature power is that they bring you back" is an identity statement rather than a compromise — but it is a constraint on every future Healer, and it is being accepted with zero Healers authored, which is the cheapest moment to be wrong and the hardest moment to know.

**A Downed Hero can be down for the whole fight.** That is the direct cost of deleting the window, and the pass action is the whole mitigation. If a cohort shows long stays are common, the pass is the lever — not a timer, which is the thing that was removed.

**Seat order decides who takes a fallen Role's blow.** Defect 4, kept on purpose and measured rather than fixed.
