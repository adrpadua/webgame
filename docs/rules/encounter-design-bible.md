# Encounter Design Bible

Status: active content-authoring guidance for Bosses and encounters, adopted from the boss-design direction (D-020) and extended by the cooperative-boss research consolidation (D-021 through D-027; ADRs 0025, 0026, 0027). This document guides how encounters generate the raid experience; it does not create executable rules — the web Encounter Engine remains authoritative (ADR 0019). Its hero-side counterpart is the [Character Design Bible](character-design-bible.md).

## The Boss Is a Problem Generator

The game must feel like **a party fighting one shared raid Boss**, not several players playing card-game turns beside each other. Everyone reads the same Boss state, board, and Boss Timeline; roles are distinct responsibilities toward the same fight; one player's decisions change the problems the rest of the party must solve.

So the Boss is not simply an enemy with health.

> **The Boss is the system that generates shared, escalating problems for the party to solve together.**

Author every Beat, phase, and escalation from that sentence. A Beat that only subtracts health from one Hero, invisible to everyone else's plans, is filler.

## The Boss Timeline Is a Core System

The two-row Timeline is not presentation — it is the mechanism that makes counterplay, planning, and cooperation possible (the Clarity value made structural). Consequences follow:

- Bigger actions get longer warning: the [Telegraph Proportionality rules](../content/encounters/embermaw-ashen-trial-design.md) bind damage tier to telegraph lead, and every entry carries at least one counter tag.
- The target experience is **planned raid execution**, not surprise damage followed by recovery. If a playtest loss cannot be narrated as "we misplanned window X," the Timeline failed as a system.
- Hero kits should read the Timeline as their primary input: the Tank sizes mitigation to a named hit, the Healer covers a named future window, Damage heroes aim throughput at the visible clock.

## Three Horizons, Staged Disclosure

The Timeline has two horizons, and every Beat in either one discloses completely (ADR 0031):

| Horizon | What it shows | What the party does with it |
| --- | --- | --- |
| `Incoming` | Every parameter needed by resolution — target, magnitude, hexes, Resources. | Commits a precise answer inside the Quick Window. |
| `Instant` | The same complete parameters, already live this Round. | Answers what is happening now. |

Row names state **when**, never how much is known — and now that both rows are complete, the second half of that sentence is the whole story: a Beat is never legally incomplete.

There was a third horizon. `Forecast` previewed next Round's whole program at family level so a party could reserve resources for a *category* before it could answer a specific hit, and the staged-disclosure contract existed to serve it. ADR 0026 shipped it against an explicit acceptance gate — whether the row was actionable information or decorative UI — and ADR 0031 ran that gate: across 200 seeds per position, a policy that read the row and one blind to it finished in the same Round to two decimal places. The row is gone, the schedule is learned by playing it, and the catalogue of what a Boss can do belongs in a boss guide reached from the menus rather than on a 390×844 play surface.

**What replaced the ladder.** `Consequence Tier` no longer sets a Beat's earliest legal horizon, because there is only one horizon left to reach. It sets a fairness rule instead, and that rule is now load-bearing: any Beat that can add Escalation is `Severe`, because an Escalation Threshold crossing is one of the run-ending outcomes — and **the first program of every phase carries no `Severe` Beat**. Under a forecast this was a footnote about the one Round the row could not cover. Without one it is what makes a first attempt teach instead of kill: the opening Round is the Round nobody can have learned anything about yet.

**The Briefing is still the catalog, and there is no schedule surface at all.** The Briefing lists what the Boss can do, including its Module Slots and their candidate families, and never states rotation order. Nothing else publishes the order either, which is what makes meeting a Boss a second time worth something — see `programPredictability`, which measures how much of the order a perfect memory could recover.

## The Timeline Is Addressable

The Timeline is a zone the party can act on, not a readout it can only consult. A card may become a **Commitment**: an authored effect bound to one named Beat, visible to the Party, resolving when that Beat resolves (D-028).

- **Bind only to disclosed parameters.** A Commitment attaches in the `Incoming` or `Instant` row. Every visible Beat now qualifies, so the live constraint is different from the one first written: no surface names a *future* Beat any more, so a Commitment can only prepare for something already on the Timeline.
- **Prepare, do not rewrite.** Commitments answer a named future problem. They do not redirect its target — that is the Tank's identity mechanism, not a card effect — and they do not transform one mechanic into another.
- **The metric follows for free.** D-027 asks whether the party acted specifically to prepare for a named threat. With Commitments that stops being an observer's judgement and becomes a countable attachment.

The design goal, stated as the research does: **the Boss writes the first draft of the encounter, and the party edits it together.**

## Encounter Responsibilities

Beyond Role, an Encounter may assign a **Responsibility** — a duty like Relic Bearer, Anchor, or Conduit — that is transferable during the fight and never tied to an Archetype (D-029). Encounter roles need not equal classes.

Two rules keep it honest. A Responsibility's answers obey asymmetric efficiency like any other problem, so "only the Relic Bearer may…" never becomes a role lock in a new coat. And no Encounter is required to have one: forcing duties into fights that do not need them is the coloured-keys failure wearing a different label. What Responsibilities buy is repeat-clear variation — "I'll take the Relic this time" — and a natural way to spread decision concentration, since whoever holds one owns a decision.

## Optional: Failure That Changes The Fight

A Boss whose identity is memory may take the **Archive/Echo** option (D-030): unresolved mechanics go to an Archive rather than away, and at each phase transition the Boss schedules one of them again as an Echo. A wipe then reads as "we changed the future encounter," not "we lost 12 health."

It is an option and not a law, for two reasons. Every Boss doing it makes every Boss a death spiral, and it would give us two escalation systems competing to own the same feeling — Escalation counts, an Archive accumulates. Bound it: at most one Echo per phase transition, and every Echo obeys the fairness rule, so a `Severe` Echo may never open a phase. Failure may change the fight; it may not become untelegraphed punishment.

## The Role Contract

Tank, Healer, and Damage are three questions about the **same Boss problem**, never three parallel minigames:

| Role | The question it owns | Owns | Must not own |
| --- | --- | --- | --- |
| Tank | "How do we survive the hit?" | Mitigation, positioning, controlling where Boss pressure lands. | Sustain. Tank self-healing stays limited enough that the Healer keeps a real economic purpose (Tank Principle 1). |
| Healer | "How do we sustain the party?" | Making accumulated damage sustainable, proactively, against known future windows. | The Tank's spike conversion, or so much output that triage stops being a decision (Healer Principles). |
| Damage | "How do we beat the clock?" | The throughput that ends the fight before escalation overwhelms the party. | Enough self-sufficiency to ignore the board's spatial and add problems. |

The boundary sentence for the most important seam:

> **Tank owns mitigation. Healer owns sustain.**

For solo-Tank evaluation both failure walls stay live (Tank Principle 2, enforced by D-017's sweep gates): the stalemate wall (survives but cannot kill before enrage) and the race wall (deals damage but loses to attrition). **A healthy party breaks these ceilings through cooperation — that is what the party is *for*.**

## Prefer Structural Cooperation Over Role Locks

Role dependency must not rest on numeric tuning alone: numbers get optimized around (the Rextroy lesson), structure holds.

> **No stat total occupies two hexes.**

Role-specific counter tags may exist, but the stronger pattern is a problem another role is **structurally suited** to solve rather than one everyone else is arbitrarily forbidden from touching. The authoring catalog:

- Multiple dangerous locations requiring simultaneous occupation (hex towers).
- Adds creating more demands than one Hero's action economy covers (Whelp intent, D-006).
- Simultaneous positioning and mitigation problems (hold the Guarded Front *and* someone answers the cone).
- Raid-wide attrition that mitigation alone cannot sustain — sized for a Healer's economy, not a role-locked immunity.
- Escalation that adds concurrent problems over time.

Test for any cooperation mechanism: "would doubling one Hero's stats break it?" If yes, it is numeric and will erode.

### Role Superiority, Not Role Locks

Structure decides who is *suited* to a problem; it does not decide that everyone else is forbidden. Overusing absolute locks (`[HEALER ONLY] Dispel`) turns an encounter into matching coloured keys to coloured locks, and it lets one exhausted or Downed player convert every mistake into deterministic failure. The pattern is **asymmetric efficiency**: one role answers cheapest, others retain an expensive line (D-025).

A problem is **run-ending** if leaving it unanswered for one full Round causes unavoidable defeat, permanent Hero loss, or an Escalation Threshold crossing. Run-ending problems **must** carry at least one off-role answer at a stated premium. For everything else it is optional — universal application triples authoring cost on Beats where nobody would ever pay the premium anyway. Off-role answers draw their cost from the [fixed vocabulary in the Character Design Bible](character-design-bible.md), so players learn the *shape* of an off-role answer once rather than reading each Beat fresh.

### Fight Quarterbacking Structurally, Not With Silence Rules

Committed destinations and selected abilities stay visible to the Party (D-026). Face-down simultaneous commitment is rejected: it would break Committed Movement's collision rule, and it costs the shared-planning feel that makes the Timeline a party object rather than four private ones. Quarterbacking is instead designed out — when the answer needs more actions than any one player controls, no single player can drive the fight, which is exactly what demand density and role superiority already produce. The accountability for that bet is measurement, not assertion: **decision concentration** is a required metric, and if one player proposes nearly every response, the fix is more demand density, never a rule forbidding conversation.

## Escalate Demand Density, Not Just Numbers

Boss pressure grows past one actor's action economy by adding **concurrent problems**, not only larger damage values:

| Stage | Demand shape |
| --- | --- |
| Early | One obvious problem — teach the answer. |
| Middle | Two overlapping problems — force a priority choice. |
| Late | Several simultaneous problems — force division of responsibility. |

The Boss produces problems faster than a single Hero can solve them; the raid feeling lives exactly there. In solo evaluation this appears as Tank Principle 4's test: by the Round-4 checkpoint, at least one live demand the solo Tank had no economy to answer.

## Escalation Is The Only Clock

A Boss has no separate round-limit timer. It has `Escalation`: one fixed `0`–`5` scale, `+1` automatically each Round end once automatic escalation begins, plus authored acceleration when a demand goes unanswered, with the threshold at `5` as the hard wipe (ADR 0027, D-023). Authoring rules:

- **The scale never varies between Bosses.** Escalation is a literacy surface — feeling a clock requires reading it without arithmetic. Boss identity lives in the *effects* at thresholds `1` through `4`, where there is unlimited room, not in the length of the bar.
- **Automatic ticks start late, by derivation.** They begin at `Encounter Clock - 4`, so ticks alone reach the top threshold exactly when the clock expires — a `0`–`5` scale ticking from Round 1 would silently be a five-Round clock. It also leaves the teaching Rounds unescalated and puts the collapse in the late fight, where the phase model wants it.
- **Acceleration is authored per Beat, never global.** A global "any live Minion adds 1" would make every add package equally punishing and flatten Boss identity into one attrition formula. Each Beat says what it costs to ignore it.
- **Never price a demand the party cannot answer.** Acceleration ignores a demand that arrived too late to act on — a Minion spawned this Round has had no player window — and a Beat's penalty stays at `0` until the deck holds an executable answer (D-003). Acceleration the party cannot avoid is not a consequence; it is a second automatic tick wearing a costume. Embermaw's Brood Call sits at `0` today for exactly that reason.
- **A Beat that can add Escalation is `Severe`, and so never opens a phase.** That is what keeps per-Beat authoring legible instead of requiring players to memorize a table.
- **Prefer structural thresholds to numeric ones.** A threshold that permanently closes part of the arena is felt; a threshold that adds `+1` damage is arithmetic, and it is the same inflation the Difficulty Layer test forbids one section down. Embermaw's thresholds `1` and `4` were `+1` damage each until D-031 replaced them with permanent Scorch that closes the ground away from the Boss.
- **A structural threshold may never remove a role's own answer.** No authored Scorch hex sits adjacent to the Boss, because burning the Guarded Front would leave the Tank unable to reach the place their kit is built to hold. Same defect as pricing an unanswerable demand, arriving from the other direction.
- **Damage owns the acceleration, not the base tick.** The automatic tick guarantees the fight terminates; the acceleration is where throughput becomes a strategic responsibility — how much of the encounter's worst state ever happens at all.

This is also the structural form of the stalemate wall. D-016 requires that a solo Hero cannot kill a Boss, and a health value holding that line is a number that better play erodes (the Rextroy lesson). Under Escalation, indefinite defense fails because the encounter's economic assumptions become impossible, which optimization cannot repair. The solo sweep now shows it directly: the survival-biased policy reaches Round 8 on most seeds, dies to Escalation on roughly half of them, and deals `0.00` Boss damage doing it. Apply the same test here as for cooperation: *would doubling one Hero's stats break it?* For a health-based ceiling, eventually yes. For Escalation, no.

## Boss Core, Modules, and Difficulty Layers

An encounter is authored in three separable layers, so variation and difficulty stop competing with learnability (D-024):

| Layer | What it is | Rule |
| --- | --- | --- |
| **Boss Core** | The authored, learnable spine — the Boss Program sequence the glossary already names. | Always learnable. Mastery of the Core must transfer between attempts. |
| **Encounter Module** | A Beat group filling a Program's one `Module Slot`. | Bounded, authored, seed-selected, and settled at setup so replay stays deterministic. |
| **Difficulty Layer** | A named set of changes stacked on Core plus Modules. | Must change a mechanic or requirement. Name the new decision it creates, or it is inflation. |

Three laws bind the layers:

- **Validate modules in combination, never independently.** Difficulty is usually caused by mechanic *overlap*, not by the sum of individual mechanic values — the clearest transferable warning from Spirit Island's own designer guidance.
- **The Raid Seed is printed and shareable.** One value determines module selection and any random target stream, so two parties can face the same permutation. That is what makes attempts comparable between groups and makes the metrics below mean anything. The sharing surface itself is Later; the commitment is now.
- **Practice Mode is not a Difficulty Layer.** It grants economic tolerance — more maximum health after repeated defeats — and may never remove, soften, or delay a failure condition. Keeping it out of the layer vocabulary is the point: if a practice mode counted as a layer, "easier numbers" would have a legal route back through the door the layer test just closed.

Anti-patterns this section exists to forbid: difficulty that only multiplies health; mechanics that get harder by getting less legible; boss decks random enough that learning cannot transfer; and modules balanced alone and shipped together.

## The Healer Reads the Timeline

The visible Timeline makes unusually proactive healing possible, and the healer design must take it:

- Not: Boss hits → HP drops → Healer restores.
- But: **Boss telegraphs pressure → Healer predicts who needs coverage → the party executes → the protection pays off.**

The Bond mechanic (pre-place protection; offensive actions convert into healing/Armor through it) fits this model and keeps the Healer offensively active — their damage engine *is* their support engine, closing the health-bar-janitor failure mode documented in the [healer research](../content/research/2026-08-17-healer-support-design-lessons.md).

## Design North Star

A successful encounter makes each player feel:

> **"I handled my part, but we won because everyone handled theirs."**

The Tank is never weak for failing to solo the Boss (D-016): they are visibly excellent on the axis they own while unresolved demands labeled for other roles accumulate. The Healer and Damage heroes have identifiable responsibilities whose execution visibly changes the shared battlefield.

Playtest question for every party session: can each player name their part *and* someone else's contribution in the same sentence about how the fight was won or lost? If a player narrates the fight without mentioning another role, the encounter was three minigames.

The north star is measured rather than asserted. Four metrics are required of every encounter session, each backed by one of the laws above — Timeline conversion rate, failure attribution, decision concentration, and role counterfactual value — and they are defined in the [deck-evaluation rubric](../content/deck-evaluation-rubric.md) (D-027). The target that governs all of them: **attempt one asks what this Boss does; attempt twenty asks how cleanly our party solves what this version of the Boss is asking.** Knowledge should change the nature of play without eliminating it.
