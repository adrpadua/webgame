# Make Downed one stable state, rescued by a card

A Hero at `health <= 0` is **Downed**: a blocking, non-targetable body on their hex, keeping the Counters they hold, with their Slots and earned Charges frozen and their hand no longer refilling. The state is **stable** — no window, no timer, no expiry, no second state — and ends only by a **Revive** or with the Encounter. A Revive is authored on a card and returns the Hero at that card's `revive_to`. Each Round, a Downed Hero's player may pass one card from their hand to an adjacent living ally. The Encounter is lost when every seated Hero is Downed at once.

`Downed` is derived from `health <= 0` rather than stored. `Incapacitated` is retired.

## What this supersedes

**ADR 0036 entirely.** That ADR gave zero health two states — Downed for a two-Round window, then Incapacitated forever — and it was designed and never built, so nothing ships broken and no migration is owed. Its structure came from the MMO battle-rez: a rescue race inside a bounded window, with a terminal state at the far end. The designer rejected that import in two steps, first the corpse run in favour of D&D 5e / Baldur's Gate rules, then the window itself. What replaces it is BG3's shape: down is stable, and what kills you is the action economy collapsing while the fight gets harder.

Four of ADR 0036's constraints survive unchanged and are not restated below: a body answers nothing, Counters need no new rule, the diminished action never touches the Boss's health, and the revive amount is content. Three are superseded: the charge for a failed rescue, the deck stopping, and the solo special case.

**ADR 0036's `unanswered_rescue` Escalation reason.** Not built. See "The pressure was already there".

**ADR 0036's solo clause.** *"Downed requires a living ally, so a solo Hero at zero is still immediate defeat"* existed because that Downed state had a window to enter. Under a stable state it is derived: a Party of one that falls has every seat Downed, so defeat is immediate by the general rule. Both authored solo Encounters are unaffected, and a rule is deleted rather than added.

**D-016's reduced-Party red flag, as ADR 0036 extended it.** Replaced by a dose measure — see "The evidence has to change with it".

## Why one state and not two

Two states existed to give a failed rescue somewhere to land. With no window there is no failure moment, so the second state has nothing to mean.

What the second state was *for* survives: keeping the **player** acting rather than keeping the **Hero** alive — the half of `Sentinels of the Multiverse` ADR 0036 correctly identified as worth importing. It now attaches to Downed itself, as one ally-facing action per Round. This matters more here than it did there. Under a window, the longest anyone waited was two Rounds; under a stable state a player can be down for the rest of the fight, so the action is load-bearing rather than consoling.

## Rescue is superiority, not exclusivity

The instruction was that the Healer revives with a card they own, guaranteed one per game. Taken literally as a deck card, it fails on three counts, and the fixes are what this ADR builds.

**"In their deck" is a probability.** Draws are shuffled (`initial_deck_shuffle`, and the discard reshuffle at `advancePhase.ts:189`), so a deck cannot promise a card on the Round someone falls. The Healer's Revive is therefore their **Signature** — D-064's fixed Slot, second consumer: always present, costing the Round to fire, charged by allies taking damage, and never touching the seeded draw line. A tutor was the alternative and was rejected twice over: moving the card disturbs the seeded line, and putting it outside the Action Bar removes the price that the rest of this design assumes it costs.

**Exclusivity is banned.** `character-design-bible.md` says *"never write a hard lock (`[HEALER ONLY]`) where a premium would do"*, and D-025's run-ending test names permanent Hero loss, which obliges at least one off-role line. So any Role may author a Revive at a premium from the fixed vocabulary — adjacent, one card discarded, the whole Round — and the Healer keeps superiority through range, repeatability, and a Charge the fight itself supplies. Scarcity for the off-role line is deck composition, one copy; there is no exhaust primitive in the schema and one card does not justify inventing a card lifecycle.

**Off-role needs no new field.** Every card in a deck carries its owner's Role Keyword, which distinguishes nothing about function. Rescue becomes an `answer` Keyword beside `interrupt`, `kill_adds`, `mitigate`, `move` and `position`, and off-role reads as *this answer's suited Role is not this deck's Role*.

Together these answer the question the instruction left open — *what happens if the Healer dies*. The party falls back on the expensive lines: a severe blow, not a wall. No rule tells them to save the Healer first, and none should. Reviving the Healer first is already correct play because the Healer holds the only repeatable revive, and a printed Role discount would be the hard lock again in friendlier clothes while deleting the decision it was meant to create.

## The pressure was already there

ADR 0036 billed one Escalation at the window's expiry. With no expiry, the obvious move was a per-Round drip. It does not survive contact with two facts.

`ESCALATION_MAX` is **5** (`escalation.ts:12`), and the automatic tick already spends one point per Round. A growing per-Round charge kills a party roughly two Rounds after the first fall, which restores the terminal state this change deleted, by the back door — and a flat charge halves the clock while anyone is down. Second, it has no home: every entry in the `DEMANDS` table is keyed to a Beat kind with its price authored on that Beat, and a Hero falling is not a Beat. `unanswered_rescue` would have been the first Beat-less demand, breaking the invariant that makes demand pricing reachable by designers.

So no new source is added. The three demands already in the table bill more with bodies on the floor, without a line of new code: a Downed Hero answers no Role selector, cannot stand in reach for `demand_proximity`, and cannot strip a Counter before it reaches the cap `unanswered_counter` prices. The pressure is priced on the Beat, by the designer, where every other demand's price lives.

## The constraints that keep it honest

- **Slots and Charges freeze; the hand does not refill.** Both are leak repairs found by reading the economy rather than the design. Hands refill to `refillTarget` every Round (`advancePhase.ts:184`), so any per-Round action a Downed Hero pays for with a card is free unless the refill stops — which made an earlier draft's Escalation-cancel infinite, and then made its replacement, the card pass, a resource engine that rewarded falling. Stopping the refill prices the pass, and preserves the seeded draw line by not consuming it. Freezing the Slots is D-045's argument for Counters applied to the Action Bar: the host is on the board, so what rides on them survives — and a Hero returning at 1 health with empty Slots returns unable to act, which converts a rescue into a formality.
- **Downed is derived, never stored.** `selectBeatTarget` already filters on `health > 0`. A second field recording what a number already says is a desynchronisation waiting to happen, and Revive is then one write.
- **The revive amount is authored.** The ruling was a flat `1`, and every card written today prints `1`. Compiling it would be the mistake ADR 0036 constraint 6 names — the number that decides how forgiving the game is, out of a designer's reach — and authoring it is also where Role superiority becomes expressible without a special case.
- **The Role-selector fallback is measured, not changed.** `selectBeatTarget` falls back to `seats[0]`, justified in comment for an off-composition party settled before Round 1. A party now becomes off-composition mid-fight, so a Tank Hit authored against Tank armour can land on seat 0 at full damage and seat order decides who dies. It is left alone deliberately: the fallback is already recorded on the fact as `target_selector_fell_back` so that it cannot become a balance mystery later, and no cohort has yet run with bodies on the floor. The sweep gains the count; tuning waits for numbers.

## The evidence has to change with it

D-016 treats a solo victory as a red flag and ADR 0036 extended that to reduced-Party victories. A stable Downed state makes short-handed play ordinary, and a binary end-state check now fires on a party that lost someone in the final Round and won anyway.

It is replaced by **Hero-Rounds lost** — how many Hero-Rounds the party spent short-handed — with a threshold, shipping in this change rather than after it. That is the fact D-016 actually wants, and without it the first cohort run under this design cannot be read at all.

## Accepted costs

**Every Healer's Signature is the Revive.** One fixed Slot per Hero is kept, so Healers differentiate on the Grant and the full-charge rider rather than on the Signature's identity. This is being fixed with zero Healers authored: the cheapest moment to be wrong about it, and the hardest moment to know that we are.

**A Hero can be Downed for the rest of the fight.** The direct cost of deleting the window. The pass action is the entire mitigation, and it is the lever to pull if cohorts show long stays are common — not a timer, which is the thing that was removed.

**The Healer is a structural dependency the game cannot yet field.** The state ships with the Guardian's off-role premium line as its only consumer, on D-064's precedent of shipping the container with one. The `healer` Role Keyword, the Hero, and the ally-damage Grant `when` all wait for that Hero, because an enum entry no card consumes is dead code that reads as canon.
