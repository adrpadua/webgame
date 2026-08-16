# Embermaw Prototype Encounter

This document describes the current authored prototype encounter for `Embermaw`.

The intended full encounter is documented separately in [embermaw-ashen-trial-design.md](embermaw-ashen-trial-design.md). This file records the current runnable short-deck implementation; it is deliberately smaller than the eight-round design.

## Purpose

`Embermaw` is the first encounter shell used to validate:

- a digital two-track Boss Program Card
- simultaneous player windows
- tank mitigation feel
- visible board facing
- telegraphed Whelp spawning and route blocking
- paid movement on the hex grid

## Current Board Setup

Starting board state:

- Player at `0,0`
- Embermaw at `1,-1`
- no Whelps; `Brood Call` telegraphs and then creates them

## Boss Identity

`Embermaw` currently runs a deterministic three-card looping Boss Program deck:

- `36` health, tuned as a reachable eight-round target for the tank deck
- **Hunt Pattern**: Turn to the Tank, Raking Claw, Ash Trail; then telegraphed Cinder Breath, Brood Call, Close the Lanes
- **Ember Pattern**: Stalk the Guardian, Cinder Breath, Ember Scar; then telegraphed Brood Call, Raking Claw, Keep a Safe Hex
- **Brood Pattern**: Turn to the Tank, Raking Claw, Ash Trail; then telegraphed Cinder Breath, Brood Call, Heat Rises

Each card has two simultaneously visible tracks. The three `Instant` beats resolve sequentially before the Quick Window. The three `Incoming` beats stay drawn on the board during Quick, then resolve sequentially before Slow. The loop is a compact playable demonstration, not the phase-two encounter design.

## Encounter Flow

The prototype uses the standard round structure:

1. `Boss Instant`
2. `Quick Window`
3. `Boss Incoming`
4. `Slow Window`

The authored program deck loops while the encounter remains active. The encounter ends when either combatant reaches `0` health, or when the clock advances beyond round `8`.

The live encounter configuration is [resources/encounters/embermaw_prototype.tres](../../../resources/encounters/embermaw_prototype.tres). It owns the round limit and authored enrage text.

## Spatial Resolution

Embermaw teaches two different kinds of Boss pressure. The approved encounter-design intent is that perfect movement avoids geometry, but does not erase the Tank's assigned attrition:

- `Raking Claw` is a Targeted Boss Tank Hit. Its authored selector wording is **`Target: Tank. Deal 4 damage. Movement does not evade this hit.`** Its sole counter-tag is **`Mitigate`**. Leaving a cone or changing board position does not evade it. Elian may deliberately hold the Guarded Front, build Armor, and earn Riposte Ready from a zero-Health-loss hit, but a Tank Hit still deals damage if its mitigation answer is insufficient. Guarded Front is positional setup for the Tank's mitigation and Riposte loop; it is not a Move counterplay tag.
- `Cinder Breath` telegraphs a forward cone during Quick. Leaving the cone avoids the hit; resolved cone hexes become `Scorched` for one round.
- `Brood Call` telegraphs two edge spawn hexes in solo play, then creates Whelps there. Whelps occupy their hexes and constrain movement routes.

Scorched terrain cannot be entered voluntarily, so it persists as a tactical constraint rather than a hidden damage source.

The current one-Hero slice is not a solo-victory test. Even if Elian avoids every Avoidable Board Pattern, regular Targeted Tank Hits should create enough attrition that he cannot outlast the encounter substantially beyond its halfway checkpoint without a Healer. This is approved encounter-design intent. It does not by itself change the runnable Resource, damage values, Target Selector implementation, or evaluation records; those require a separate authored-content and engine verification handoff.

## Design Intent

This encounter is meant to ask:

- Can the tank meaningfully stabilize incoming hits?
- Does the Boss retain meaningful targeted Tank pressure after perfect movement avoids the telegraphed geometry?
- Do quick basics and slow payoffs feel different enough?
- Does paid movement create real tempo tension?
- Is the boss timeline readable and useful?

## Contextual Teaching Contracts

These are authored **Tutorial Prompt Contracts** for the portrait Embermaw slice. They explain existing authoritative facts and projections only. They do not change Boss Programs, Cards, pacing, legal actions, or the one-prompt-at-a-time presentation policy. Presentation policy is adopted below; implementation remains an engine/UI task.

| ID | Priority | Authoritative trigger meaning and required facts | Intended completion | Player-language intent | Confirmed source / genuine projection gap |
| --- | ---: | --- | --- | --- | --- |
| `boss_timeline` | 100 | Before the first player action, Round 1 exposes both ordered Boss Timeline rows: current `Instant` and later `Incoming`. Requires Round, phase, and visible Boss Program row/Beat identities. | The player reaches the first player window after the Timeline has been shown or dismissed. | The Boss acts in two visible moments: one is happening now, and one gives time to prepare. | `Boss Timeline`, `Instant Row`, `Incoming Row`, current phase, and Boss Program projection exist. No new rules fact is required. |
| `guarded_front` | 90 | A visible Boss Beat is explicitly a `Tank Hit`, the Boss and Elian have legal board coordinates/facing, and the Boss-facing adjacent Guarded Front is relevant to that hit. Requires Boss coordinates/facing, Hero coordinates, Beat Tank Hit identity, and the derived Guarded Front hex. | Elian reaches the Guarded Front or the associated Tank Hit resolves. | The Tank has a dangerous place to hold: directly in front of the Boss. | Boss facing, board state, and Tank Hit identity are authoritative. A compact `guarded_front_hex` / upcoming-Tank-Hit projection is required so the HUD does not reconstruct the teaching condition. |
| `charge_a_slot` | 80 | During a player window, Elian has a Loaded Top Card with an empty or non-full Charge Stack and at least one hand Card that can legally Charge that Slot. Requires phase/window, Hand identities, Slot Top Card/Charge Value/Stack, and Charge legality. | The player Charges any Slot or leaves the current player window. | A prepared ability needs a card beneath it before it can fire. | Current Hand, Slot, and phase state exist. A named legal Charge-opportunity projection is required; the HUD must not infer it from drag affordances. |
| `iron_guard_armor` | 70 | The first relevant authored Tank Hit is still upcoming and Iron Guard can be legally prepared, Charged, or fired in time to affect it. Requires Beat identity/timing, Tank Hit classification, Elian Armor, Hand/Slot Iron Guard identity, and legal action timing. | Iron Guard creates Armor, the Tank Hit resolves, or the opportunity expires. | Armor is the answer to a hit you choose to take; it blocks damage before Health. | Tank Hit and Armor facts exist. The evaluated "can answer in time" relationship requires an authoritative projection, not card-text or UI timing inference. |
| `riposte_ready` | 60 | A newly granted active `riposte_ready` Status Effect follows a qualifying zero-Health-loss Tank Hit. Requires the Status lifecycle grant fact, qualifying reason, expiry boundary, and whether a legal Shield Slam payoff is currently available. | Riposte Ready is consumed, expires, or the player dismisses the prompt. | A perfectly held hit opens a brief Shield Slam window. | Status lifecycle and Riposte Reason/expiry facts already exist for the status UI. A distinct newly-granted/first-observed projection is required to avoid replaying the prompt from a merely active status. |
| `slow_fortify` | 50 | The first Slow Window in which Fortify is in Hand or installed and can be legally loaded, Charged, or fired. Requires Slow phase, Fortify identity in Hand/Slot, Slot state, and legal action timing. | The player performs a legal Fortify-related action or the Slow Window ends. | Slow is where a Tank commits to protection for the next problem, not where it undoes a hit already taken. | Slow phase and card/Slot state exist. A named Fortify legal-opportunity projection is required; the current visual state is not an authoritative teaching trigger. |
| `whelp_pressure` | 40 | At least one Whelp exists and either a selected adjacent Whelp is a legal Sweeping Blow target or that Whelp blocks a legally relevant route. Requires living Minion identity/coordinates, Hero coordinates, Sweeping Blow targeting legality, and route-blocking relevance. | The Whelp is cleared, the route reopens, or the current pressure expires. | Whelps change the board. Clear one when it takes away the Party's safe route. | Spawned Whelps and board occupancy exist. A legal Sweeping Blow target projection and a defined route-blocking relevance fact are genuine gaps; do not infer either from artwork or a generic enemy count. |

The priorities determine teaching precedence only. They do not force a prompt to appear, change legal actions, or grant protected input.

### Adopted Tutorial Presentation Policies

PM and the user approved these product policy values for the first Embermaw contextual prompt implementation. They govern how authored Tutorial Prompt Contracts are presented; they do not create Encounter facts, legal actions, pacing changes, or card effects.

| Policy | Adopted value | Design note |
| --- | --- | --- |
| Protected next gesture | Prompts are non-blocking and dismissible. No protected next gesture is granted. | Contextual coaching must not become a forced tutorial step or a hidden input rule. |
| Show-once scope | Mixed by prompt family: foundational orientation prompts show once per Raid Run; reactive tactical prompts show once per encounter as authored. | `boss_timeline` is foundational orientation. `guarded_front`, `charge_a_slot`, `iron_guard_armor`, `riposte_ready`, `slow_fortify`, and `whelp_pressure` are reactive tactical prompts unless a later authored contract states otherwise. |
| Copy directive level | Lightly instructional copy. | Prompt text may name the pressure and the relevant response, but must not claim that one play is always correct when legal alternatives exist. |
| Help/Rules history | Help/Rules offers both a text-first list and reopenable contextual cards. | The text-first list supports scanning and accessibility; the reopenable cards preserve the short context that originally appeared in play. |

The `whelp_pressure` contract remains blocked on its stated authoritative-relevance gaps: legal Sweeping Blow target projection and route-blocking relevance. The approved presentation policy does not authorize the HUD to infer either condition from artwork, enemy count, or board position alone.

## First Turn Variant

[data/encounters/embermaw_first_turn.json](../../../data/encounters/embermaw_first_turn.json) is the Ashen Trial as a first-time player meets it in the Encounter Workbench. It is the same board, boss health, Boss Programs, and Round limit, and differs in exactly two authored values:

| Authored value | Prototype | First Turn | Why |
| --- | --- | ---: | --- |
| `hand_refill_target` | `4` | `5` | The scripted Round spends one card on every gesture it teaches: two Slots prepared, both charged, and one card paid as Stamina to leave the breath cone. Four cards cannot cover all five. |
| `random_seed` | `1337` | `23` | Fixes the opening Hand at one quick attack (`Steady Strike`), one slow attack (`Unyielding Step`), and three cards to spend, so the scripted Round is the same for every new player. |

`unyielding_step` joins the deck list so the Slow Window beat lands visible Boss damage. `fortify` alone would have taught the Slow Window with Armor that the next `round_start` immediately wipes.

The Round it produces, against the `embermaw_hunt` program: `Raking Claw` lands for `4` (it cannot be dodged, so the lesson is mitigation), the charged `Steady Strike` deals `3` in the Quick Window, the telegraphed `Cinder Breath` cone misses the Hero who stepped clear, and `Unyielding Step` deals `2` in the Slow Window. `web/src/ui/firstTurnScript.test.ts` asserts that whole line, so authored drift here fails before a player meets it.

The scripted turn gates input to the control its current step names, which is a deliberate exception to the non-blocking policy adopted for contextual prompts above. The exception is bounded: it runs for Round 1 of a first visit only, carries a `Skip` control, ends the moment the Round ends, and every step it gates toward is an action the Encounter Engine would accept anyway — it narrows choice, it never invents a rule or a legality. Contextual prompts remain non-blocking and dismissible everywhere else.

## Current Gaps

- No phase break or boss transformation
- No Ashen Brand, Molten Tail, or Whelp end-step intent yet
- No explicit backstab or flank rules yet, only facing state
