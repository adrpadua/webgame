# Aegis Guardian: Shield Wall Tank

Status: character design complete for the first playable pass. This document defines content intent and rules contracts. It does not authorize UI-only behavior or unsupported card text.

## Character Promise

The Aegis Guardian is the MMO-familiar Shield Wall: claim the dangerous space, build enough Armor to survive the Boss's front pressure, and make a single timely rescue when an ally is about to take the wrong hit.

The Guardian should feel durable, deliberate, and spatially responsible. It should not feel like a damage dealer wearing plate, a party-wide passive aura, or a resource-conversion puzzle.

## Identity

**Name:** Captain Elian Voss  
**Title:** The Last Gate

Elian commanded the stone-gate watch at Redwater Keep when the eastern wall fell. He held the breach through one night with a battered tower shield, directing civilians through the gate behind him and refusing every order to retreat until the last lantern had crossed the river. The keep was lost, but its people were not.

He now joins raids as the person who goes first into the dangerous space. Elian is not driven by glory or revenge. He believes every battle has a line that must not break, and he makes himself that line.

## Design Language

### Mechanical Language

- **Hold:** Occupy the Guarded Front and accept the Boss's intended Tank Hit.
- **Brace:** Build and retain Armor across the Round to make that choice survivable.
- **Riposte:** Turn a perfectly mitigated Tank Hit into a short, visible Shield Slam opening.
- **Cover:** Redirect one visible damage event from an ally through Interception.
- **Clear:** Remove a nearby Minion when it threatens the party's safe route.
- **Advance:** Deal steady, disciplined Boss damage only when the line is secure.

The Guardian's verbs are short, physical, and defensive. Card names should sound like trained battlefield actions: `Brace`, `Hold Fast`, `Shield Slam`, `Cover`, `Advance`, and `Stand Firm`. Avoid holy-magic spectacle, berserker rage, or vague leadership language; those belong to other Archetypes.

### Visual Language

- A broad, rectangular tower shield with a split-gate crest and visible repair plates.
- Dark iron, weathered blue cloth, muted brass, and a small ember-red cord from Redwater Keep.
- Square silhouettes, grounded stances, and forward-facing poses. The shield makes the clearest shape in the composition.
- Armor effects appear as layered shield plates and braced impact rings, not floating bubbles.
- Interception draws a straight shield-line from Elian to the protected ally, then resolves the hit on his shield.
- Facing arrows and Guarded Front overlays use a sturdy wedge or wall segment, distinct from hostile cone telegraphs.

### Tone

Elian is calm under pressure. His voice is practical and spare: "Behind me." "Hold the line." "Not through here." He gives a player the feeling of being the party's dependable center, not its loudest hero.

## Core Loop

1. Prepare one dependable Quick defense and one answer to the upcoming problem.
2. Spend hand cards to Charge the right Slot or discard a card to take the Guarded Front or leave a telegraph.
3. Use Armor to absorb Tank Hits.
4. When a Boss Tank Hit causes `0` Health loss in the Guarded Front, gain Riposte Ready until the end of the first following Quick Window.
5. Fire Shield Slam to consume Riposte Ready for its `+2` Boss-damage payoff, or take another role-appropriate action before the opening closes.
6. Use one-event Interception to save a selected ally from an otherwise bad hit.

## Settled Rules

| Area | Rule |
| --- | --- |
| Archetype | Shield Wall Tank. |
| Defense | Armor blocks damage before Health. Armor is not spent for another effect. |
| Ally protection | Interception redirects the next one damage event from a chosen ally to Aegis Guardian. |
| Interception duration | It expires after the redirected event or at the end of the Round if unused. |
| Positioning | The Guardian's primary positional responsibility is the Guarded Front: the Boss-facing adjacent hex. |
| Riposte Ready | A qualifying Boss Tank Hit in the Guarded Front that causes `0` Health loss grants one non-stacking, non-refreshing Riposte Ready. It expires at the end of the first following Quick Window. |
| Riposte payoff | A legal Shield Slam consumes Riposte Ready and gains `2` additional Boss damage. |
| Action Bar | The Guardian uses the shared Top Card, Charge Stack, Primed, and Full-Charge Cleanup rules. |
| Movement | A card discarded to move creates 1 Stamina for that adjacent move. The card does not resolve its rules text. |
| Class resource | No active Guardian-specific resource is required for the first playable pass. `Guard` remains a Keyword, not a meter. |

## Default Starter-Kit Jobs

The approved live/default Aegis Guardian starter-deck specification contains these jobs. The five-identity list was previously approved as an evaluation-only candidate; the user-approved default-deck migration adopts that exact list without changing its card rules. The runnable resource migration remains Architecture-owned.

| Job | Candidate card | Timing | Intended decision |
| --- | --- | --- | --- |
| Reliable Boss pressure | Steady Strike | Quick | Fire for progress or hold the Stack for a stronger future hit. |
| Personal mitigation | Iron Guard | Quick | Build Armor before front pressure; Guard charges improve it. |
| Add answer | Sweeping Blow | Quick | Remove an adjacent Whelp when board space matters. |
| Slow commitment | Fortify | Slow | Build a large Armor reserve after the Incoming Row. |
| Defensive payoff | Shield Slam | Quick | Consume a correctly earned Riposte Ready for `+2` Boss damage, or use it as stable progress when no opening exists. |
| Emergency party save | Intercept | Quick | Redirect one next damage event from a chosen ally. Requires engineering support. |

The approved live/default twenty-card Shield Wall list is exactly `8x Steady Strike`, `6x Iron Guard`, `2x Sweeping Blow`, `2x Fortify`, and `2x Shield Slam`. Intercept remains outside this first executable list until its rule exists in `EncounterEngine`.

The former `10x Steady Strike` / `10x Iron Guard` baseline remains historical evidence for the old mechanics shell. It does not describe the current default deck and must not be rewritten.

## Content Rules

### Iron Guard

**Player-facing intent:** Survive the hit that the Guardian deliberately accepts.

**Precise rule:** Gain 3 Armor. Gain 1 additional Armor for each charged `Guard` card.

**Affected content:** Existing `iron_guard.tres`, the default Shield Wall deck, `guard` Keyword, and its Charge Modifier.

**Edge cases:** Armor may exceed the next hit and does not carry into the next Round. Non-Guard charged cards add Charge but do not improve Armor.

**Required evidence:** Existing card and cleanup probes plus an eight-Round deck playtest that records fired charge count and prevented damage.

### Sweeping Blow

**Player-facing intent:** Clear a Minion that is blocking the party's next safe route.

**Precise rule:** Deal 2 damage to one selected adjacent Minion after the Slot has at least one Charge.

**Affected content:** Existing `sweeping_blow.tres`, Whelp content, default Shield Wall deck, Minion targeting affordance.

**Edge cases:** The card can be prepared with no Minion in range but cannot fire without a legal selected Minion. It cannot target the Boss.

**Required evidence:** `whelp_clear` engine and parity probe.

### Fortify

**Player-facing intent:** Turn the Slow Window into a deliberate preparation window instead of an empty wait.

**Precise rule:** Gain 6 Armor during Slow after the Slot has at least one Charge.

**Affected content:** Existing `fortify.tres` and the default Shield Wall deck.

**Edge cases:** It cannot repair an Incoming hit that has already resolved. Its Armor expires at next Round start. Full-charge cleanup remains standard.

**Required evidence:** `slow_window_card` probe that checks wrong-window rejection, legal Slow activation, damage absorption, and cleanup.

### Riposte Ready And Shield Slam

**Player-facing intent:** A correct Tank response creates a brief opening, so Elian's damage follows from holding the line rather than replacing that job.

**Precise rule:** When a Boss Tank Hit resolves against Elian while he occupies the Guarded Front and causes `0` Health loss, grant one Riposte Ready if he does not already have it. Riposte Ready never stacks or refreshes. It expires at the end of the first Quick Window after the qualifying hit. A legal Shield Slam consumes Riposte Ready and deals `2` additional Boss damage.

**Affected content:** Aegis Guardian Status Effect content, Tank Hit authored identity on the relevant Boss Beat, `shield_slam.tres`, the Shield Wall HUD state, and Encounter Record facts for grant, expiry, and consumption.

**Edge cases:** Hazards, Minions, incidental Boss damage, and a non-Tank-Hit Boss Beat never grant Riposte Ready. A qualifying hit while Riposte Ready already exists does not add a second effect or extend its expiry. A rejected Shield Slam does not consume it. A qualifying Incoming-Row hit leaves Riposte Ready available through the next Round's Quick Window.

**Required evidence:** Focused deterministic coverage for grant, non-grant, non-refreshing behavior, expiry after the first following Quick Window, legal Shield Slam consumption and `+2` Boss damage, visible state explanation, and Encounter Record lifecycle facts. The deck-evaluation scorecard must show improved Shield Wall identity and meaningful Slot decisions without a dominant always-Shield-Slam line.

### Intercept

**Player-facing intent:** Save an ally from one visible lethal or role-inappropriate hit.

**Precise rule:** Select one ally within the authored range. Until the next one damage event to that ally or Round end, redirect the full event to Aegis Guardian. Apply Armor and any Guardian mitigation after redirection.

**Affected content:** `intercept.tres`, player-card target schema, Status Effect behavior, Target Selector display, and party UI.

**Edge cases:** Raid-wide damage produces a separate event per Hero. Intercept only redirects the selected ally's event. A Downed, defeated, absent, or out-of-range ally cannot be selected. If the Guardian is Downed before the event, the effect expires rather than redirecting to an invalid target.

**Required evidence:** A seeded interception engine probe for one hit, raid-wide per-target events, unused expiry, invalid target, and Guardian Downed paths; a mobile test that exposes selected ally and remaining duration.

## Difficulty Curve

| Stage | Player lesson | Boss demand | Success signal |
| --- | --- | --- | --- |
| First encounter, Rounds 1-2 | Armor and Cinder Breath movement | One front hit and one visible cone | Player saves a card for movement or defense on purpose. |
| First encounter, Rounds 3-4 | Add priority and Slow commitment | Whelps restrict routes | Player uses Sweeping Blow before routes collapse and Fortify in Slow. |
| First raid run | Interception timing | Role-targeted or raid damage | Player identifies the ally and timing worth the one-event save. |
| Later bosses | Facing and front-line duty | Rear arcs, displacement, phase combinations | Guardian controls where danger lands without solving every mechanic alone. |

## Engine/UI Requests

1. **Now:** preserve the existing generic Minion selection path in the visible HUD and maintain focused Whelp-clear coverage for the default deck.
2. **Now:** maintain focused Slow-card coverage for Fortify in the default deck.
3. **Later, required for Intercept:** model targetable allies and one-event damage redirection in `EncounterEngine`; project target and expiry visibly on board and mobile HUD.
4. **Later, required for raid validation:** add multiple Heroes, role targeting, committed actions, Downed/Revive, and party UI. Do not ship Intercept as player-facing text first.

## Playtest Scorecard

After each first-character session, collect:

- Did the player name the Guarded Front before the first Raking Claw?
- Did the player understand that Armor prevents Health loss and clears next Round?
- Did the player use movement as a deliberate card payment, not a hidden penalty?
- Did they know why Sweeping Blow took priority over Boss damage?
- Did they use Fortify in Slow for a future decision rather than expecting it to undo Incoming?
- Did they understand that a zero-Health-loss Tank Hit created a short Shield Slam opening, and why it did or did not trigger?
- Did Riposte Ready improve a Slot decision rather than make Shield Slam the automatic next action?
- In party tests, did they predict the Intercept target and one-event expiry correctly?

Promote only results observed in at least three new-player sessions to a balance decision. Keep damage values provisional until then.
