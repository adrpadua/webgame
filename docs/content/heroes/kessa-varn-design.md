# Kessa Varn: Vanguard Tank

Status: proposed first-pass character design. This document defines content intent and rules contracts for the second tank Hero. It is not approved live content: no runnable card resources exist, several named mechanics require `EncounterEngine` seams listed under Engine/UI Requests, and full expression requires the future multi-Hero Party. Nothing here changes Elian Voss, Embermaw, or any live resource.

Kessa exists to satisfy the [Second Hero Of A Role rule](../../rules/character-design-bible.md): a second tank must claim a distinct strength-and-price pattern. Elian Voss is the Warden — hold the line, mitigate perfectly, punish after the line holds. Kessa Varn is the Vanguard — start the fight, move it to the right ground, and pay for that tempo with thinner mitigation.

## Character Promise

Kessa Varn is the MMO-familiar initiator tank: first through the gap, dragging the fight to where the party wants it, opening the window everyone else swings through.

The Vanguard should feel fast, committed, and spatially aggressive. She should not feel like a damage dealer with extra health, a second Warden with different art, or a reckless brawler — every advance is a surveyed, deliberate route.

## Identity

**Name:** Kessa Varn\
**Pronouns:** she/her\
**Title:** The First Step

Kessa was a breach-cutter for a Furnace Marches mining order: the person who walks into an unstable vent gallery first, reads the heat, drives the ram, and declares the route safe for the crew behind her. Marches doctrine is the mirror of Redwater's: where Redwater survives by closing gates, the Marches survive by opening routes before the mountain decides otherwise — and by never standing still in a gallery that is trying to cook you.

### Story Spine

The Furnace Marches live under strict cooling protocols. Every gallery walk is timed; every cutter carries their remaining safe-minutes as a cord of wax beads that soften in order. Kessa's craft was taught in three verbs: read the vent, cut the lane, keep moving. A stationary cutter is a dead cutter — heat pools around whatever stops.

Her order lost a gallery crew when a survey captain froze at a fresh vent and ordered a hold instead of a push. The crew held a defensible pocket, textbook-perfect, while the heat rose around them; the route out had been open the whole time, thirty feet forward through the smoke. Kessa was on the rescue team that cut through to the bodies. She carries one softened wax bead from that gallery and has refused promotion to survey captain twice.

Kessa raids because raid bosses are vents that walk. Embermaw is Marches heat-life at catastrophe scale, and she has spent her life learning that you do not outlast a furnace — you move the fight, or it ends you on its own ground. Survivors of her rescue cuts call her **The First Step**, because whatever the plan is, her boot is the first thing through the breach.

### The Breachline

Kessa's device is the **Breachline**: a two-part cutting rig rebuilt from mine-issue equipment.

- **The ram-head** is an oathsteel wedge with runeglass sighting seams — it shows, visibly, the line of the cut before the cut is made.
- **The anchor spike and ember cord** trail behind her: the spike plants, the cord pays out, and the line marks the route she has declared safe.
- **Wax-bead timing cord** at her shoulder is Marches cooling protocol made visible: her commitment clock, softening as she holds ground she shouldn't.

Where Elian's Gate Rig is portable architecture, the Breachline is portable *route-making*. Her armor effects should read as moving cover — a wedge driven, a corner claimed — never as a planted wall.

### Inner Conflict

Kessa's flaw is the inverse of Elian's over-responsibility: she trusts forward motion too much. Holding ground feels like the mistake that killed a crew, so her instinct is to answer every problem with a push — even when the party's plan needs her to stand in the wrong place and take a hit that has no better answer. A good Kessa story pressures her to learn what Elian already knows: some hits cannot be outrun, only held. The two tanks argue doctrine; both are right about different rounds.

### Card-Story Fit

| Story element | Card expression |
| --- | --- |
| A stationary cutter is a dead cutter. | Momentum decays when Kessa stops; her mitigation scales with her tempo, not her patience. |
| The ram declares the route before the cut. | Facing-manipulation and movement effects are telegraph-shaped and previewed, never teleports. |
| The first step is for the crew behind her. | Turning the Boss moves its threat off allies; future Breach windows are party payoffs, not personal stats. |
| Cooling protocols forbid lingering. | Slow-window commitment is `Drive Anchor` — banking tempo deliberately, the one sanctioned way to hold ground. |
| The Marches open routes; Redwater closes gates. | Kessa's verbs oppose Elian's: advance, turn, open — never brace, hold, seal. |

## Design Language

### Mechanical Language

- **Advance:** Move deliberately toward the fight; motion is a resource, not a retreat option.
- **Drive:** Build Momentum through paid movement and Drive-Keyword charges.
- **Turn:** Rotate the Boss's facing so its front pressure lands where the party chose.
- **Open:** Create the window — a turned Boss, a cleared lane, a future party Breach.
- **Anchor:** Deliberately bank tempo in the Slow Window to spend next Round.

Card names should sound like breach-cutting doctrine: `Spearpoint Strike`, `Breach Step`, `Turning Slam`, `Drive Anchor`, `Rolling Brace`, and future `First Step`, `Cut the Lane`, `Read the Vent`. Avoid berserker rage, holy zeal, and Redwater's gate vocabulary — those belong to other Heroes.

### Visual Language

- Compact oathsteel ram-head worn on the lead forearm, runeglass sighting seams glowing along the intended cut line.
- Trailing ember cord and planted anchor spikes mark where she has been; her safe route is drawn on the board behind her.
- Diagonal, mid-stride silhouettes — always one foot committed — against Elian's square, planted stances.
- Palette: dark oathsteel, ember-cord orange, wax-bead ivory; muted next to Embermaw's coral so the Hero reads against the Boss.
- Facing-turn effects draw the Boss's front arc visibly swinging — the player should see the cone move.

### Tone

Kessa is brisk and certain. Her voice is route-caller shorthand: "On me." "Lane's open." "Don't stop." "Wrong ground — moving." She gives the player the feeling of being the party's tempo, not its wall.

## Hero Design Contract

| Element | Statement |
| --- | --- |
| Raid job | Start the fight on the party's terms: force the Boss's facing, open lanes, and absorb the first exchange so allies engage safely. |
| Engine nouns | Momentum (0-3, visible), the `Drive` Keyword, Armor (shared), and Boss Facing as a manipulable state. |
| Setup | `Breach Step` converts a card into position plus Momentum; paid moves feed the same meter. |
| Conversion | Momentum revalues her other cards: `Spearpoint Strike` and `Rolling Brace` scale with it. |
| Payoff | `Turning Slam` spends Momentum to rotate the Boss's facing — moving telegraphed front pressure off the party and opening the rear arc. |
| Recovery | `Drive Anchor` banks Momentum through a Round boundary; Loadout replacement and the shared movement gesture rebuild position after displacement. |
| Spatial expression | Adjacency and approach vectors: her payoffs require being next to the Boss on the correct edge, and her resource is literally made of movement. |
| Counterpressure | Braced Boss Beats that cannot be turned force her to hold and pay the Warden's price badly; Scorched terrain and Whelp-blocked lanes tax the movement her whole engine feeds on. |
| Signature weakness | The Vanguard's price: thin standing mitigation. Lower base Armor than Elian, no perfect-block reward, and a resource that decays when she holds still — a pinned or cornered Kessa is the worst tank in the game. |
| Team handoff | Turning the Boss redirects its front pressure away from allies today; the future `Breach` window (rear-arc party damage) is her Intercept-class deferred tool. |

## Core Loop

1. Spend cards on position: paid moves and `Breach Step` build Momentum toward the Boss.
2. Prepare Momentum-scaled Slots: pressure (`Spearpoint Strike`) and moving cover (`Rolling Brace`).
3. Read the Incoming Row and decide the turn: spend 2 Momentum on `Turning Slam` to rotate the telegraphed front pressure onto empty board — or hold the Momentum and keep scaling.
4. In the Slow Window, choose between committing to next Round's tempo (`Drive Anchor`) or letting Momentum decay for a bigger present.
5. When the Party exists: convert a turn into a `Breach` window allies can swing through.

The intended AHA moment is the first deliberate `Turning Slam`: the player watches a telegraphed Cinder Breath cone swing off the party's hexes because they spent their movement economy to physically turn the Boss. Elian's mastery is "I blocked exactly enough"; Kessa's is "I moved the fight."

## Proposed Rules

These parallel Elian's Settled Rules but are **proposed**, pending the engine seams below.

| Area | Proposed rule |
| --- | --- |
| Archetype | Vanguard Tank. |
| Momentum | A visible Hero resource, 0-3. +1 when Kessa completes a paid move; +1 from explicit card effects. At Round start it decays by 1 (not to 0). |
| Momentum spending | Only printed costs spend Momentum. A rejected action spends nothing. |
| Facing turn | `Turn the Boss one facing step` rotates the Boss's facing one hex edge clockwise or counter-clockwise, chosen at activation. It never moves the Boss's hex. Already-resolved Beats are unaffected; a telegraphed directional Beat resolves using the Boss's facing at resolution time, which is exactly what makes the turn matter. |
| Braced Beats | A Boss Beat or state may be authored `Braced`: facing-turn effects against it are rejected with visible feedback. `Turn` becomes a counter tag only on content that can actually be turned. |
| Defense | Armor works exactly as shared rules define. Kessa has no Riposte-class status; her mitigation ceiling is deliberately below Elian's. |
| Action Bar | Standard shared Top Card, Charge Stack, Primed, and cleanup rules. `Drive` is a Keyword, not a meter. |
| Movement | The shared discard-for-Stamina gesture is unchanged and additionally grants Kessa +1 Momentum on completion. Card-granted movement (`Breach Step`) follows the same adjacency and occupancy legality. |

## Proposed Starter Kit

Twenty cards, five identities, mirroring the Shield Wall list's shape:

| Job | Card | Copies | Timing | Proposed rule |
| --- | --- | ---: | --- | --- |
| Reliable pressure | `Spearpoint Strike` | 8 | Quick | Deal 2 damage to the boss. Gain +1 damage for each Momentum. |
| Mobile mitigation | `Rolling Brace` | 5 | Quick | Gain 2 Armor. Gain +1 Armor for each Momentum. |
| Tempo engine | `Breach Step` | 3 | Quick | Move 1 hex. Gain 1 Momentum. |
| Signature payoff | `Turning Slam` | 2 | Quick | Spend 2 Momentum: deal 3 damage to the boss and turn the Boss one facing step. |
| Slow commitment | `Drive Anchor` | 2 | Slow | Gain 3 Armor and 1 Momentum. Your Momentum does not decay at the next Round start. |

Deck identity notes:

- `Rolling Brace` at base 2 Armor against Iron Guard's 3 is the signature weakness printed on the foundation card: a motionless Kessa cannot armor through a 4-damage Tank Hit the way Elian can, and the deck offers no Riposte to fish for.
- Momentum-scaling on both the attack and the defense means every point of tempo is a genuine tradeoff: spend it on `Turning Slam` and both scalers get worse. There must be no dominant line between turning, striking, and bracing — this is the Slot-tension test for this deck.
- `Drive Anchor` makes the Slow Window the one sanctioned way to hold ground, converting the Warden's default posture into a deliberate, card-priced exception.
- All five identities depend on at least one missing engine seam. Do not author `.tres`/`.json` resources for this list until the seams land; a degraded proxy deck built from existing effect fields would not express the fantasy and would poison play-feel evidence (the Kled lesson).

## Content Rules

### Momentum

**Player-facing intent:** Motion is Kessa's fuel; stopping visibly drains it.

**Precise rule:** As proposed above: 0-3, +1 per completed paid move or explicit grant, -1 at Round start, spent only by printed costs.

**Edge cases:** Gains beyond 3 are lost. Decay cannot reduce below 0. A rejected move grants nothing. Momentum persists through Slot replacement and cleanup — it belongs to the Hero, not a Slot.

**Required evidence:** A focused deterministic probe covering gain, cap, decay, spend, rejected-spend, and `Drive Anchor` decay suppression, plus Encounter Record facts for each transition.

### Turning Slam And Boss Facing

**Player-facing intent:** The Vanguard's payoff is spatial: point the Boss's danger somewhere the party is not.

**Precise rule:** Spend 2 Momentum: deal 3 Boss damage and rotate the Boss's facing one hex edge in a chosen direction. Rejected against a `Braced` Beat or with insufficient Momentum.

**Edge cases:** The turn changes facing only, never hex occupancy. A telegraphed directional Beat resolves with facing at resolution time. Turning grants nothing extra against non-directional Beats — the card is deliberately weaker into them, which is its counterpressure.

**Required evidence:** Engine probe for legal turn, Braced rejection, insufficient-Momentum rejection, and a scenario proving a telegraphed cone resolves along the post-turn facing; HUD evidence that the player can preview both candidate facings before committing.

### Breach (deferred)

**Player-facing intent:** A turned Boss exposes its rear arc; the party swings through the window Kessa opened.

**Status:** Deferred exactly as Elian's Intercept: no player-facing text until the multi-Hero Party, rear-arc targeting, and a Breach status contract exist in `EncounterEngine`.

## Differentiation From Elian Voss

| Axis | Elian Voss (Warden) | Kessa Varn (Vanguard) |
| --- | --- | --- |
| Answers | "This hit cannot be dodged." | "This fight is on the wrong ground." |
| Resource | Armor sized to the hit; Riposte earned by perfection. | Momentum built by motion; spent to move the fight. |
| Failure mode | Mis-sized Armor: chip damage compounds. | Lost tempo: pinned, cornered, or turtling. |
| Slow Window | `Fortify`: prepare a bigger wall. | `Drive Anchor`: bank tempo for the next push. |
| Signature moment | Zero-loss block converts to Shield Slam. | Telegraphed cone swings onto empty board. |
| Story doctrine | Redwater: close the gate, count the living. | The Marches: cut the lane, keep moving. |

Both must pass the same Tank recognition test — a new player should still say "she protects the party by taking the dangerous job."

## Design Value Review

| Value | Assessment |
| --- | --- |
| Mastery | Reading the Incoming Row to decide when a facing turn beats raw scaling; route-planning the movement economy. Practiced players extract more from the same 20 cards. |
| Meaningful Choices | Momentum is triple-booked (strike scaling, brace scaling, turn cost) — spending it anywhere weakens the other two. Must be validated: no dominant line. |
| Counterplay | Boss side keeps answers: `Braced` Beats reject turns, Scorched and Whelps tax movement. Player side: the turn itself is Ashe-R-shaped — its power is proportional to a visible, priced commitment. |
| Teamplay | Turning front pressure off allies now; Breach windows later. Deferred content is named, not smuggled. |
| Clarity | Facing is already board-visible; the turn preview and Momentum counter are named HUD requirements, not inferences. |
| Evolution | Braced authoring, Breach, displacement, and rear-arc rules all extend this kit without rewriting it. |

## Difficulty Curve

| Stage | Player lesson | Boss demand | Success signal |
| --- | --- | --- | --- |
| First encounter, Rounds 1-2 | Momentum economy: moves are fuel, not cost | Directional front pressure | Player builds Momentum before spending it. |
| First encounter, Rounds 3-4 | The turn: facing is a manipulable threat axis | A telegraphed cone worth turning | Player turns a cone deliberately rather than dodging it. |
| First raid run | Window-making for allies | Braced Beats mixed with turnable ones | Player identifies which Beat to turn and which to eat. |
| Later bosses | Tempo under denial | Movement-hostile boards, displacement | Player sustains the engine when the board fights it. |

## Engine/UI Requests

1. **Required first:** Momentum as a visible Hero resource (gain, cap, decay, spend, suppress-decay) with Encounter Record facts and a HUD counter.
2. **Required first:** card-granted movement as an authored effect field sharing the existing legality rules.
3. **Required first:** printed Momentum costs on activation, with legal rejection paths.
4. **Required first:** Boss facing manipulation with a `Braced` guard flag and pre-commit facing preview; Momentum-scaled effect modifiers alongside the existing per-charge and per-Keyword kinds.
5. **Later, required for Breach:** multi-Hero Party, rear-arc targeting, and a Breach status contract — same gate Intercept sits behind.

## Playtest Scorecard

After each Kessa session, collect the shared rubric plus:

- Did the player treat paid movement as income rather than tax by Round 3?
- Did they turn a Boss Beat deliberately, and can they say what the turn prevented?
- Did they ever face a real hold-versus-spend Momentum decision, or was one line always right?
- Did `Drive Anchor` read as banking tempo, not as a worse `Fortify`?
- Did a Braced Beat force a genuinely different Round plan?
- Could they state Kessa's fantasy in one sentence? Target shape: "I move the fight." Treat a miss as a failed theme test regardless of mechanical scores.

Promote nothing from this document until the required seams exist, the focused probes pass, and at least three new-player sessions support the scorecard — the Elian Shield Wall product exception does not extend here.
