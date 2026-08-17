# Encounter Design Bible

Status: active content-authoring guidance for Bosses and encounters, adopted from the boss-design direction (D-020). This document guides how encounters generate the raid experience; it does not create executable rules — the web Encounter Engine remains authoritative (ADR 0019). Its hero-side counterpart is the [Character Design Bible](character-design-bible.md).

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

## Escalate Demand Density, Not Just Numbers

Boss pressure grows past one actor's action economy by adding **concurrent problems**, not only larger damage values:

| Stage | Demand shape |
| --- | --- |
| Early | One obvious problem — teach the answer. |
| Middle | Two overlapping problems — force a priority choice. |
| Late | Several simultaneous problems — force division of responsibility. |

The Boss produces problems faster than a single Hero can solve them; the raid feeling lives exactly there. In solo evaluation this appears as Tank Principle 4's test: by the Round-4 checkpoint, at least one live demand the solo Tank had no economy to answer.

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
