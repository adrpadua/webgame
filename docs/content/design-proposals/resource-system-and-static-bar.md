# Design Proposal: The Resource System and the Static Ability Bar

Date: 2026-08-22

Status: **Exploratory. Nothing here is adopted.** No decision-log row claims any of it, no `data/` file expresses any of it, and no engine work is authorized by it. This document exists so the pivot is written down accurately rather than living in a chat log — including the parts that are already known to be wrong. Treat every number as illustrative: **not one figure below has been through the sweep, a probe, or a cohort.** The live game is unchanged and remains the 20-card deck system.

Context: [Character Design Bible](../../rules/character-design-bible.md), [player card authoring rules](../../rules/player-card-authoring.md) (D-110, whose working-name discipline this document follows), [the Signature Slot proposal](fixed-hero-power.md) (D-064, ADR 0032), [card economy proposal](card-economy-draw2.md), [MMO rotation research](#appendix-what-the-mmo-rotations-actually-say).

---

## Why this exists

The complaint that started it: *the design doesn't feel fun, the cards don't feel useful, and there is no sense of the "machine" that Yu-Gi-Oh has.*

The diagnosis that followed is the load-bearing part, and it survives independently of everything proposed below:

> **Every card is worth exactly `+1` as Charge, so the deck is fuel rather than a toolbox.** Cards are not weak; they are *interchangeable*. The economy also runs card-negative where the games being envied run card-positive.

A second problem surfaced while stating the first: cards currently do two fighting jobs — they are both your abilities and your variance. A static bar splits them cleanly, **bar = your job, cards = your build**, which is also truer to the MMO raid fantasy the game is built on.

Everything below is one candidate answer to that diagnosis. The diagnosis is worth keeping even if the answer is discarded.

---

## The system as drafted

### The round

Loadout has no job once the bar is static — there is nothing to load. A draft takes its place, placed *after* the Instant row so you pick with full information.

```
INSTANT  →  DRAFT  →  QUICK  →  INCOMING  →  SLOW
 boss       pick      build      boss        spend
 acts       pips    & prepare    acts     for impact
```

The Incoming row sits between the builder window and the spender window: you brace in Quick, the Boss's blow converts your preparation into resource, you cash it in Slow. The Boss's turn becomes a step in your loop rather than an interruption to it.

### Resources

Three, named for the mechanic rather than the flavour: **`ward`**, **`mend`**, **`break`**. They persist across rounds, cap at **4**, and gaining at the cap is wasted.

| | Faucet |
|---|---|
| `ward` | **+1** when a Beat damages you. **+1/+2/+3** more if you took zero Health loss, scaled by the Beat's `consequence_tier` (chip / structural / severe). |
| `mend` | At round end: **+1** per Hero who was struck this round and ended no lower than they started. **+1** per authored demand answered. *(This faucet is broken — see [Known defects](#known-defects).)* |
| `break` | **+1** per Enemy removed. **+1** for damaging an Enemy that carries any Counter. |

Two rules behind the faucets:

- **The faucet never closes when you are behind.** Every faucet has a floor you get for showing up and a ceiling you get for doing it well.
- **Your own colour comes from your faucet; off-colour comes from the draft.** That is what makes the draft contested without making anyone colour-screwed.

**Seeding:** every Hero starts with 2 of their own resource, and state faucets do not pay at round 1's upkeep — the seed *is* that payment.

**Why cap 4.** It is exactly one full round's maximum spend, so you can execute your best round and not two of them. It sits above the largest single tier (2), so a spend never empties you. Own-colour income runs ~2/round, so you refill in two rounds. And a clean block on a `severe` Beat pays +3 above the floor, which overflows from a base of 2 — creating a pre-spend decision (*spend down before the big blow so the reward fits*) that arrives on its own rather than being imposed.

**Overcap wastes; there is no conversion.** Letting overflow convert at a loss was floated and dropped: the waste *is* the tension, and it is already an authored, tested rule shape (D-064 decision 8, "a block while full earns nothing").

### The draft

`players + 2` pips in a shared pool, two picks each in seat order. The surplus is what stops the last picker having no choice.

The pool composition is **one pip of each Hero's own colour, plus 2 wild pips drawn only from colours the party generates.** A Tank + Healer duo therefore sees four pips and never sees `break`. (See [The role contract as economics](#the-role-contract-as-economics).)

An earlier version guaranteed one of each resource in the pool. That is wrong for exactly this reason — it hands a duo a free `break` every round, which is the leak the whole scheme exists to close.

**Unresolved and load-bearing:** a visible shared pool is a quarterbacking surface, and D-026 already ruled out the usual fix (face-down commitment). This has no answer yet.

### Actions

**Resource is the action budget.** Fire as long as you can pay: no slot count, no once-per-window rule.

| MMO | Ours |
|---|---|
| GCD | one resource pip |
| Off-GCD | costs nothing, once per round |
| Class cooldown | the Signature — own currency, never touches pips |

**Off-GCD is reserved for table stakes, not choices:** movement, and each role's baseline floor. If you would not be happy seeing it every round forever, it is not free.

### Abilities

Four per Hero, printed on the Hero, always available, plus a Signature.

- **Tiers gate power.** More resource, bigger effect. A tier ladder must be *more of one thing* (D-110).
- **Most top tiers cost an off-colour pip.** That is what manufactures draft contest by construction. The Tank's own mitigation button is the deliberate exception: a Hero's core job is never taxed on somebody else's colour.
- **Legality never depends on Boss-specific content. Value may.** `Sweeping Blow` having no legal target in the Brand trial is the shipped bug this closes.

### The Signature

The capstone — the last payoff of playing the machine correctly.

> A Signature charges only from the loop having been executed correctly. Never from a timer, never from raw resource spent.

Its effect must be **distinct, not incremental** — it should change what the fight allows for a round, not add 15%. Charges stay capped at 2. Pips are the action budget; Charges are the payoff clock, and the two must never be conflated. At roughly one charge a round against a cap of 2, a Signature fires about every other round; anything faster has quietly become a rotation button.

This part is the least novel and the most secure: **the Signature Slot already has this shape.** The pivot extends D-064 rather than replacing it.

---

## The two kits

Written in working names per D-110. Flavour names are deliberately absent — several of the ones used during drafting (`Redoubt`, `Toll`, `Settlement`) were doing work the mechanics had not earned.

### Elian — the Tank

| Ability | Window | Tiers |
|---|---|---|
| **Armor up** | Quick | Free, once/round: 3 Armor · `1 ward`: 5 · `2 ward`: 7 |
| **Take a hit for someone** | Quick | `2 ward`: the next Beat aimed at a chosen ally within 2 hits you instead · `2 ward + 1 mend`: as above, and it counts as a Tank Hit on you |
| **Deal back what you blocked** | Slow | `1 ward`: ¼ of what your Armor absorbed · `2 ward`: ½ · `2 ward + 1 break`: all of it, split among adjacent Enemies |
| **Keep your leftover Armor** | Slow | `1 ward`: half survives the wipe · `2 ward`: all of it · `2 ward + 1 mend`: all of it, plus 2 to allies within 2 that also survives · *ceiling: 4 Armor kept* |
| **Cash in clean blocks** | Signature | Earn +1 when you absorb a blow at zero Health lost on the Guarded Front (cap 2). Fire: 2 damage, +3 per Charge; at 2 Charges the target is Sundered. |

### Maren — the Healer

| Ability | Window | Tiers |
|---|---|---|
| **Heal an ally** | Quick, ≤3 | `1 mend`: 2 · `2 mend`: 3 · `3 mend`: 5, everyone within 1 of them. Always: healing past a maximum becomes Boss damage instead, capped at printed, never off herself (D-103). |
| **Remove a mark** | Quick, ≤3 | `1 mend`: remove 1 Counter the Boss placed; if none, they gain 2 Armor · `2 mend`: remove 2 · `2 mend + 1 ward`: remove 2, no new marks this round |
| **Heal next round, automatically** | Slow | `1 mend`: name an ally, the first Health they lose next round heals 2 · `2 mend`: heals 4 · `2 mend + 1 ward`: triggers for whichever ally is hit first, not one you named |
| **Damage for every full-health ally** | Slow, Enemy ≤3 | `1 mend`: 1 damage per two Heroes at full · `2 mend`: 1 per Hero at full · `2 mend + 1 break`: 2 per Hero at full |
| **Turn someone's next hit into healing** | Signature | Earn +1 when she answers an authored demand (cap 2). Fire: cover an ally, their next blow heals them instead; two allies at full bank. |

### Why each Hero has two Slow abilities

A first draft gave each Hero two builders and one spender. That is backwards for a design whose headline rhythm is builder/spender: all the choice sat in the builder window and the impact window was a tier lookup on the only pressable thing. The MMO evidence says the decision lives among *competing spenders* — Prot Paladin's is Shield of the Righteous versus Word of Glory on the same Holy Power.

Each Hero's two spenders draw on the same currency and are strongest at opposite times:

| | Elian | Maren |
|---|---|---|
| Spender A | Deal back what you blocked — needs Armor that **was absorbed** | Damage for every full-health ally — needs the party **healthy** |
| Spender B | Keep your leftover Armor — needs Armor **still standing** | Heal next round — earns its keep when trouble **is coming** |

Elian's fork is mechanically exclusive: every point of Armor either got absorbed or is still standing, so the round decides which button is live. Read the telegraph exactly and A is maximal; the Boss names someone else and B is maximal; overbuy and both are partial — which turns overbuying from pure waste into a hedge without removing the read.

Maren's fork is not exclusive, and that difference is deliberate: **Elian's choice is settled by what already happened; Maren's is settled by what she thinks is coming.** One Hero reacts, one forecasts.

### The role contract as economics

D-016 makes a solo Boss kill a tuning-defect signal. Today that is enforced by a health number — `embermaw_branded` at 72 — which has to be re-derived for every future Boss.

Under this system it is enforced by composition instead. `break` means *"I can finish"*:

> **Anyone can chip without `break`. Nobody converts efficiently without it.**

A Tank + Healer duo generates no `break` and never sees one in the pool, so the full-conversion tiers of both damage abilities are permanently out of reach. Rough arithmetic put a duo around 32 damage over 8 rounds against 72 — under half, with no rule anywhere saying "a duo may not win."

Two consequences worth keeping even if the rest is discarded:

- **A Damage seat upgrades everyone.** Bringing one does not only add their damage; it adds `break` to the shared pool, switching on other people's top tiers. Party composition changes what *other people* can do.
- **The missing seat is legible.** The duo sees the top tier greyed with a `break` icon on it, every round, for the whole fight.

---

## Known defects

These are not open questions. They are things already established to be wrong.

**1. The `mend` faucet is broken in both readings.** *"+1 per Hero who was struck this round and ended no lower than they started"* was written to teach *keep the party near full rather than heal a lot*. It does not:

- If "struck" means a Beat targeted them and Armor absorbed it → **Maren is paid maximally when Elian blocks perfectly and she does nothing.**
- If "struck" means they lost Health → she is **paid for allies taking damage**, the exact perverse incentive the Restorative design removed.

It needs a third definition, probably keyed on damage she actually prevented or restored. Note that *Damage for every full-health ally* now carries the "keep them topped" lesson as a payoff, which frees the faucet to stop trying to teach it.

**2. Damage conversion couples the Tank's output to the Boss's damage numbers.** *Deal back what you blocked* scales on what was absorbed, and what can be absorbed is set by how hard the Boss hits. Tuning a Boss harder silently buffs the Tank on every future encounter — the kit author stops controlling the Tank's damage and the encounter author starts. It is also near-dead early: absorb 5, take a quarter, round to 1.

**3. The first draft of the Healer's damage ability broke D-016 outright.** At `2 mend` → 3 damage +2 per full-health ally, a duo reached ~9 damage/round × 8 rounds = 72, killing the Boss exactly. Re-tiering so `break` gates the **conversion rate** rather than the spread fixed it, which is the same correction the Tank's conversion needed. Both are evidence that per-ally flat bonuses are the dangerous shape here.

**4. The Armor-persistence ceiling is an invented number.** Without a cap, 7 Armor a round plus persistence ratchets to 14, 21, 28. The ceiling of 4 was chosen to match the resource cap so there is one number to remember — not because anything measured it. It is the single point of failure for the whole ratchet.

**5. Persistence indirectly feeds the Signature.** Carried Armor makes zero-loss blocks likelier, which makes Charges likelier, which is damage arriving through the back door. The Charge cap bounds it; nothing else does.

**6. The Healer's heal ladder may break D-110's own rule.** Folding the group heal in as *Heal an ally*'s top tier makes that tier both bigger and wider. Magnitude and breadth are arguably both "more healing," but this is the first tier in either kit where the top step changes two things at once, and the rule was written to catch exactly that. Flagged rather than resolved.

## What this would supersede

A reference list, so a future reader knows what conflicts rather than discovering it mid-implementation.

| Shipped | What happens to it |
|---|---|
| The Loadout Step and every hand-routing rule in *Action Bar Semantics* | Gone. A static bar has nothing to load, and the press *is* the commitment. |
| The 20-card decks, the deck-evaluation rubric's subject, and the [draw-2 economy proposal](card-economy-draw2.md) | All lose their subject unless cards return as timing permissions. |
| D-102 (`counter_spent` charges Maren's Signature) | Superseded. Her earn moves to *answering an authored demand*, which is the more Boss-agnostic condition: every Boss declares answers, not every Boss writes marks on people. |
| D-016's enforcement | Unchanged as a rule; its mechanism moves from a per-Boss health number to `break` scarcity, which scales to future Bosses for free. |
| D-064 / ADR 0032 (the Signature Slot) | **Extended, not replaced.** The Signature already has exactly this shape — earned charge, banked to a cap, waste at the cap, fired for a distinct effect. |

---

## What the pivot costs

**The deck disappears, and this went unremarked for most of the drafting.** The pivot was proposed as *"static bars, and the cards we draw modify the static abilities."* By the time the rules above were written there was no deck, no hand, and no card: the draft is of pips, and the tier ladders had absorbed the modifiers that were supposed to be cards. Three of the twelve drafted permissions became tiers (persistent Armor, ally Armor, the AoE spread); the other nine are homeless.

The consequence is **player-side variance**. Boss program order is still a shuffled bag — `predictability.ts` exists to measure that band — so run-to-run variance survives on the Boss side. What is gone is *my hand is different this run, so I play differently*: the bar is fixed, the tiers are fixed, and the pool is fully determined by party composition. Every run of an encounter with a given party presents an identical toolkit reacting to a different Boss order.

That may be the correct trade for a rotation game. It should be chosen rather than arrived at.

**If cards come back, there is exactly one job left for them.** Tiers now own *magnitude and breadth*, so the remaining card-shaped space is **timing and sequencing permissions**: fire twice this round, fire inside the Boss's Instant row, chain on a kill, fire again while the target is Sundered.

That also resolves the complaint that started this. Yu-Gi-Oh's machine is a **chain** — A enables B enables C within one turn, card-positive. What this system delivers is a **loop** — build, get cranked, spend. The loop is good and it is what an MMO rotation feels like, but nothing here chains, and the only drafted vocabulary that would is the timing permissions.

The catch, and it has not improved: **the timing permissions are precisely the expensive ones.** Firing inside a Boss row, re-arming a fired slot, and conditional second fires all touch the round order, which is the engine's most load-bearing structure. The cheap half of the twelve is the half the tiers already ate. A prototype that shipped only the affordable permissions would test a weaker idea than the one being asked about.

---

## Open questions

1. **Round 1 is a guaranteed losing round for Maren.** The seed fixed Elian's; hers is unaddressed.
2. **The Damage Hero does not exist**, and `break` is the resource nobody currently generates. That is the role contract working, but it means every `break` tier is untested by construction.
3. **`mend`'s income scales with party size** (up to +4 in a four-seat party, plus demands) against a flat cap of 4, so it may over-cap systematically in large groups. Her spend scales too, so it may self-balance. Not tunable against content that does not exist.
4. **The shared pool is a quarterbacking surface** and D-026 closed the usual escape hatch.
5. **Tiers are invisible until pressed.** A player who has never used an ability cannot learn its ladder from the screen; that wants a hold-to-preview.
6. **Health left the tokens** in the interface sketch. "State Stays In The Stat Panel" was decided for two or three pieces; a four-seat party may need health back on the token.

## Authoring rules this would create

Surfaced by stress-testing the kits against Bosses built to break them, and worth recording even if the system is dropped:

- **Every Boss Program must place at least one damage Beat in the Incoming row.** Otherwise the telegraph is empty and the entire Quick window is dead content.
- **A split-the-party mechanic deletes the cross-Hero layer.** Range 2 protection, range 3 healing and a burst-1 group heal all stop reaching. Legitimate as a deliberate Boss, catastrophic as an accident.
- **An encounter needs at least 5 rounds for these kits to express themselves.** Every banking line degrades to filler below that.
- **Legality never depends on Boss-specific content; value may.**

## What would have to be true to adopt this

Falsifiable, in rough dependency order. None of it has been run.

1. The `mend` faucet has a definition that pays for preservation without paying for allies being hurt, and without paying out when the Healer does nothing.
2. A four-seat trace exists, because `break`, the pool, and `mend`'s scaling are all unmeasured without one.
3. The Tank's damage conversion is bounded by something the kit author controls rather than by Boss tuning.
4. A duo's total damage over a full fight lands materially short of a Boss's health across **more than one** Boss — otherwise composition-as-contract is just the 72 wall wearing a costume.
5. The Armor-persistence ceiling is measured rather than asserted.
6. Someone decides, explicitly, whether losing player-side variance is acceptable — and if not, whether the timing permissions are worth the round-order engine work.

---

## Appendix: what the MMO rotations actually say

Three specs were pulled deliberately, as three different rotation philosophies: Protection Paladin (builder/spender, never overcap), Discipline Priest (ramp — Atonement before damage), Blood Death Knight (reactive — Death Strike after damage).

Two findings transferred and one did not.

**Density does not transfer.** MMO rotations are near-100% uptime; this game runs 3–5 actions a round. What transfers is the priority-list structure and the never-overcap discipline, not the tempo.

**A solved rotation is not a design failure.** An earlier claim in the drafting — *a line that is always correct is not a decision* — is partly refuted by the evidence. Prot Paladin's priority list is public and solved, and the spec is still fun, because executing it *while the Boss interrupts you* is the game. The sharper version: the rotation may be solved; what must not be solved is **which rotation you are running and when you break it for a mechanic.** That is the argument for the two-window split — the ramp list and the reactive list are different, and the Boss decides which one you are in.

Sources: Icy Veins ([Protection Paladin](https://www.icy-veins.com/wow/protection-paladin-pve-tank-rotation-cooldowns-abilities), [Discipline Priest](https://www.icy-veins.com/wow/discipline-priest-pve-healing-rotation-cooldowns-abilities), [Blood Death Knight](https://www.icy-veins.com/wow/blood-death-knight-pve-tank-rotation-cooldowns-abilities)); Method ([Protection Paladin](https://www.method.gg/guides/protection-paladin/playstyle-and-rotation), [Discipline Priest](https://www.method.gg/guides/discipline-priest/playstyle-and-rotation)).
