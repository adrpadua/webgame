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

The Timeline has three horizons, and a Beat discloses itself in stages across them (ADR 0026, D-021):

| Horizon | What it shows | What the party does with it |
| --- | --- | --- |
| `Forecast` | Next Round's whole Boss Program at family level: title plus the union of its counter tags. | Reserves resources for a *category* of problem. |
| `Incoming` | Every parameter needed by resolution — target, magnitude, hexes, Resources. | Commits a precise answer inside the Quick Window. |
| `Instant` | The same complete parameters, already live this Round. | Answers what is happening now. |

Row names state **when**, never how much is known. Completeness is the Beat's property, not the row's: a Beat is legally incomplete in the Forecast Row and complete everywhere else. This is what gives the party surprise without gotchas — they do not know every parameter in advance, but they always know what kind of resource they may need to hold back.

Two authoring consequences follow. First, **consequence tier sets the earliest legal horizon**, and the [Telegraph Proportionality tiers](../content/encounters/embermaw-ashen-trial-design.md) bind it: `Chip` anywhere, `Structural` no later than Incoming, `Severe` in the Forecast Row first, with no justification clause. Second, **the Briefing is the catalog and the Forecast Row is the schedule** — the Briefing lists what the Boss can do, including its Module Slots and their candidate families, and never states rotation order. Defined that way the two surfaces cannot drift into duplicating each other.

Escalation raises the stakes of getting this right rather than softening it: because an Escalation Threshold crossing is one of the run-ending outcomes, any Beat that can add Escalation is `Severe` and lands in Forecast automatically. No special case required.

The ladder has exactly one exception, and it is a content rule rather than a code path. **Round 1 is not forecast** — no earlier Round could have shown it — so **a first program may carry no `Severe` Beat.** Everything after Round 1 is forecast automatically, so the tier ladder needs no further enforcement than authoring the tier honestly.

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
- **A Beat that can add Escalation discloses it in Forecast.** That is what keeps per-Beat authoring legible instead of requiring players to memorize a table.
- **Damage owns the acceleration, not the base tick.** The automatic tick guarantees the fight terminates; the acceleration is where throughput becomes a strategic responsibility — how much of the encounter's worst state ever happens at all.

This is also the structural form of the stalemate wall. D-016 requires that a solo Hero cannot kill a Boss, and a health value holding that line is a number that better play erodes (the Rextroy lesson). Under Escalation, indefinite defense fails because the encounter's economic assumptions become impossible, which optimization cannot repair. The solo sweep now shows it directly: the survival-biased policy reaches Round 8 on most seeds, dies to Escalation on roughly half of them, and deals `0.00` Boss damage doing it. Apply the same test here as for cooperation: *would doubling one Hero's stats break it?* For a health-based ceiling, eventually yes. For Escalation, no.

## Boss Core, Modules, and Difficulty Layers

An encounter is authored in three separable layers, so variation and difficulty stop competing with learnability (D-024):

| Layer | What it is | Rule |
| --- | --- | --- |
| **Boss Core** | The authored, learnable spine — the Boss Program sequence the glossary already names. | Always learnable. Mastery of the Core must transfer between attempts. |
| **Encounter Module** | A Beat group filling a Program's one `Module Slot`. | Bounded, authored, seed-selected, and settled before Forecast announces it. |
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
