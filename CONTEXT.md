# Raid Card Tactics

A cooperative fantasy boss battler on a hex grid. The core domain is a scripted raid encounter where players coordinate simultaneous action windows against a visible boss timeline before the boss's Escalation reaches its final threshold.

## Language

A term marked `_Not yet in the engine_` is settled language with no implemented behavior behind it. The team may use it in design and authoring discussion; nobody should expect it to resolve in a running Encounter yet.

**Encounter**:
A single boss fight from setup through victory, defeat, or enrage. An encounter is the top-level unit that owns the boss script, the round count, and the board state.
_Avoid_: Match, battle, combat

**Encounter Record**:
A normalized, persisted account of one completed Encounter. It contains the submitted and generated rules actions, phase and Round boundaries, seed, content identity, final state, and design summary. It excludes raw pointer motion and presentation-only state.
_Avoid_: Match log, telemetry event, replay file

**Resolution Fact**:
A normalized rules result attached to a completed action. For damage, it states requested damage, damage prevented, and health loss; when that damage defeats a Minion, it also records `target_removed = true`. Encounter Records use these facts instead of inferring outcomes from snapshots.
_Avoid_: Derived metric, UI estimate

**Abandoned Encounter**:
An Encounter attempt ended by restart or manual abort before victory, defeat, or end-of-clock behavior. An Encounter Record preserves its explicit abandonment reason for playtest analysis.
_Avoid_: Deleted run, incomplete log

**Round**:
One full cycle of boss resolution and player response. A round adds exactly one Escalation to the Boss automatically, before any authored acceleration.
_Avoid_: Turn, tick

**Escalation**:
A counted Boss value on one fixed scale from `0` to `5`, identical on every Boss so the party reads it without arithmetic. It gains `1` automatically at the end of each Round once automatic escalation begins, which is derived so that automatic ticks alone reach the top threshold exactly at the Encounter Clock. It gains more, from Round `1` onward, from authored Beat penalties when a demand goes unanswered — so ignoring a demand pulls the collapse forward. It is the encounter's only clock: the Boss has no separate round-limit timer. Boss identity lives in the effects at each threshold, never in the length of the scale; a Boss may name it something else in its own rules text, but Escalation is the only mechanical name for it (ADR 0027).
_Avoid_: Enrage timer, dread meter, per-boss scale

**Escalation Threshold**:
The authored effect a Boss applies on reaching one Escalation value. Values `1` through `4` change how the fight behaves; the threshold at `5` is the hard wipe. A threshold is preferably **structural** — permanently closing part of the arena — rather than numeric, so the collapse is felt as space running out rather than as another damage number (D-031). No structural threshold may touch a hex adjacent to the Boss, because burning the `Guarded Front` would remove the Tank's own answer. A Beat that can add Escalation must disclose it in the Forecast Row, which makes that Beat `Severe`.
_Avoid_: Soft enrage stage, phase trigger

**Encounter Clock**:
The number of Rounds that automatic Escalation ticks alone need to reach the top Escalation Threshold, usually eight before modifiers. Player count, difficulty, or boss rules may adjust it, and authored acceleration can only shorten it in play.
_Avoid_: Turn cap, hard timer, enrage timer

**End-of-Clock Behavior**:
The effect a Boss applies at its top Escalation Threshold. Different bosses may lose the party immediately or enter another authored failure state; it is that threshold's effect rather than a rule running beside Escalation.
_Avoid_: Global enrage rule, overtime, parallel timer

**Boss Timeline**:
The visible sequence of boss actions arranged into three horizons: the `Forecast` row, the `Instant` row, and the `Incoming` row. Row names state when, never how much is known. The boss timeline is mostly scripted rather than random.
_Avoid_: Deck, queue, stack

**Boss Program**:
The authored pair of ordered Instant and Incoming rows used by the Boss for one Round. An Encounter may sequence or loop multiple Boss Programs. The sequence of Programs is the Boss's learnable spine.
_Avoid_: Boss card, turn script

**Module Slot**:
The one position a Boss Program may declare for bounded variation, filled by one of several authored Beat groups. The spine stays learnable while the filling varies; the Raid Seed chooses the filling, and the choice is settled before the Forecast Row announces that module's family. Modules are validated in combination, never one at a time, because module interactions are where difficulty actually comes from.
_Avoid_: Random beat, shuffled program, per-beat randomization
_Not yet in the engine_

**Difficulty Layer**:
A named set of authored changes that must change at least one mechanic or requirement. Numbers may support that change but are never a layer on their own: if nobody can name the new decision the layer creates, it is inflation rather than difficulty.
_Avoid_: Health multiplier, hard mode, scaling
_Not yet in the engine_

**Practice Mode**:
An economic tolerance applied on top of whichever Difficulty Layer is active, such as additional maximum health after repeated defeats. It may never remove, soften, or delay a mechanic's failure condition. It is deliberately not a Difficulty Layer, because it creates no new decision.
_Avoid_: Easy mode, casual difficulty, Difficulty Layer
_Not yet in the engine_

**Raid Seed**:
The single printed value that determines an Encounter's variable content: which module fills each Module Slot, and any random target stream. Two parties entering the same Raid Seed at the same Difficulty Layer face the same encounter permutation, which is what makes attempts comparable across groups.
_Avoid_: Run ID, random seed, save code
_Not yet in the engine_

**Boss Beat**:
One ordered authored action inside a Boss Program row. A Boss Beat discloses in stages (ADR 0026): its family and counter tags while its Program sits in the Forecast Row, then every parameter needed by its resolution — target, magnitude, hexes, and Resources such as a Hazard or Minion — once that Program reaches the Incoming or Instant Row. A Beat is therefore legally incomplete in the Forecast Row and never incomplete anywhere else.
_Avoid_: Event, command, hidden trigger

**Consequence Tier**:
The authored severity band that sets a Boss Beat's earliest legal horizon: `Chip` may originate in any row, `Structural` appears no later than the Incoming Row, and `Severe` must appear in the Forecast Row first. A Beat that can down a Hero or cross an Escalation Threshold is `Severe`, with no justification clause available.
_Avoid_: Damage tier, priority, threat level

**Encounter Briefing**:
The pre-fight reference that shows a Boss's possible moves, each move's pattern and counterplay, its Module Slots and the families that can fill them, and phase themes. The Briefing is the catalog of what a Boss can do; the Forecast Row is the schedule. It never states rotation order, so first-attempt discovery survives.
_Avoid_: Full script, surprise-only tutorial, schedule

**Phase Reveal**:
When the Party enters a later Boss phase, reveal that phase's exact program before its first Instant Row resolves.
_Avoid_: Mid-beat reveal, surprise transition

**Phase Trigger**:
An authored Boss-specific condition that triggers entry into the next phase, such as crossing a health value or using a named skill a set number of times. Every Phase Trigger is shown in the Encounter Briefing and tracked visibly during the fight. A trigger reached during a player window takes effect after the current Round finishes, revealing the next phase's exact program before its first Instant Row.
_Avoid_: Random phase change, hidden breakpoint

**Enemy**:
A hostile combatant in an Encounter. The Boss and every Minion are Enemies.
_Avoid_: Hostile target, foe

**Status Effect**:
A temporary rule attached to one combatant — a Hero **or** an Enemy — that responds to an explicit trigger, such as the start of a Round, taking damage, or firing a Slot (D-032). The mechanism is identical on both sides; only which payload fields matter differs, so an Enemy-facing status uses `damageTakenBonus` and `damageDealtPenalty` where a Hero-facing one uses Armor and Boss-damage fields. Status definitions are authored content in `data/statuses/` and each one states whether it stacks (D-033). Every Status Effect is visible to the whole Party. A Status Effect may never redirect a Boss Beat's target or change what that Beat is.
_Avoid_: Passive, invisible buff, Enemy Status

**Riposte Ready**:
A non-stacking, non-refreshing Elian Voss Status Effect. When a Boss Tank Hit resolves against Captain Elian Voss while they occupy the Guarded Front and causes `0` Health loss, grant Riposte Ready if they do not already have it. It expires at the end of the first Quick Window after that qualifying hit, whether the hit occurred in an Instant Row or an Incoming Row. The first card that deals Boss damage while it is active consumes it: a legal Shield Slam gains `2` additional Boss damage, and any other Boss-damage card gains `1` (D-015). Cards that deal no Boss damage never consume it. The effect must show its qualifying trigger, expiry, and consumption; it is not a general posture category or a resource meter.
_Avoid_: Awakening, stacking buff, generic stance

**Fortified**:
An Elian Voss Status Effect created by firing Fortify in the Slow Window (D-019). It is a Status Effect with delayed onset, not a `Commitment`: it prepares for whatever the next Round opens with rather than for a named Beat, so it has no Beat to bind to. Its definition is authored in `data/statuses/`; the Armor amount comes from the card. At the start of the next Round, immediately after the Armor wipe, it grants its stored Armor and expires; the granted Armor is ordinary Armor thereafter. Multiple Fortified commitments stack additively. Because it lands before the next Instant Row, it is the one way to pre-block Instant-row pressure.
_Avoid_: Delayed buff, second Armor pool

**Hazard**:
A board effect attached to one or more hexes. A Hazard may constrain voluntary movement or respond when a combatant enters its hex. Most Hazards are temporary and expire at a Round boundary; a Hazard placed by a structural Escalation Threshold is permanent, because the arena does not recover from it.
_Avoid_: Surprise damage, ambient effect

**Boss**:
The primary Enemy that owns the Boss Timeline and is the encounter's victory target. A Boss is never a Minion.
_Avoid_: Enemy, boss enemy

**Minion**:
A non-Boss Enemy placed on the hex board by an Encounter. A Minion may have its own health, facing, and rules, but it does not own the Boss Timeline.
_Avoid_: Enemy, add, trash mob

**Minion Defeat**:
When a resolved damage action reduces a Minion's Health to `0`, it immediately removes that Minion from the board before the damage action completes. Its hex becomes unoccupied, the Minion cannot be targeted by any later action, and state owned exclusively by that Minion is discarded. This is part of damage resolution, not an end-of-window or end-of-Round cleanup. The damage action remains successful and its Resolution Fact records `target_removed = true`. Boss defeat and Hero Downed use their own rules.
_Avoid_: Delayed despawn, end-of-turn cleanup, defeated-but-blocking

**Minion Intent**:
The visible end-step action a living Minion will take: advance one hex toward its nearest Hero, or bite for its authored attack once adjacent. Intent is derived deterministically from the live board, resolves after the Slow Window before the Round wraps, and Minion damage is a Raid Hit — never a Tank Hit and never a Riposte Ready trigger.
_Avoid_: Hidden AI, random wander, aggro table

**Forecast Row**:
The horizon that previews the next Round's whole Boss Program at family level: its title and the union of its counter tags. It tells the party what kind of raid problem is developing, so resources can be reserved for a category before a specific hit can be answered. It also carries the program's highest Consequence Tier, so the party can size the reserve. A Forecast Row never resolves — it is next Round's program shown early, not a fourth resolution step — so it leaves the per-Round event order untouched. Round `1` is not forecast: at the pull there is no earlier Round to have shown it, which is why a first program may carry no `Severe` Beat.
_Avoid_: Preview row, hidden row, T+2

**Commitment**:
An authored card effect bound to one named Boss Beat, visible to the Party, resolving when that Beat resolves (D-028). A Commitment may only bind to a Beat whose parameters are disclosed — one in the `Incoming Row` or `Instant Row` — never to a `Forecast Row` entry, because a family-level entry states no parameters and a Commitment there would be a bet rather than a plan. Commitments prepare for a named future problem; they may never redirect its target or change what it is, and that ban is effect-level — it binds any mechanism that could produce the same effect. Nothing implements a Commitment yet: Fortify was reclassified as one and the reclassification was retracted, because it prepares for whatever the next Round opens with rather than for a named Beat.
_Avoid_: Attachment, counterspell, reaction
_Not yet in the engine_

**Encounter Responsibility**:
A duty the Encounter assigns to one Hero, transferable during the fight, and never tied to an Archetype (D-029). It is orthogonal to Role: a Tank may hold one, and so may anyone else. Its answers obey the same asymmetric-efficiency rule as any other problem, so a Responsibility never becomes a role lock in disguise. Not every Encounter has one.
_Avoid_: Role, job, class duty
_Not yet in the engine_

**Instant Row**:
The boss actions that resolve before the party's `Quick Window`. These are urgent mechanics that are already live this round.
_Avoid_: Fast row, active row

**Incoming Row**:
The boss actions that resolve before the party's `Slow Window`. These are telegraphed mechanics that the party can plan around.
_Avoid_: Future row, pending row

**Quick Window**:
The shared simultaneous player phase after the `Instant Row` resolves. It is for basics, repositioning, setup, and low-cost actions. In multiplayer, committed movement destinations and selected abilities are visible to the Party. The window ends when every player is Ready or its short timer expires; Ready may be withdrawn until resolution.
_Avoid_: Fast phase, reaction phase

**Slow Window**:
The shared simultaneous player phase after the `Incoming Row` resolves. It is for spenders, signature abilities, and larger tactical commitments. In multiplayer, committed movement destinations and selected abilities are visible to the Party. The window ends when every player is Ready or its short timer expires; Ready may be withdrawn until resolution.
_Avoid_: Power phase, cast phase

**Action Bar**:
The persistent set of player action slots that hold prepared abilities. Players slide cards under slotted abilities to charge them over multiple rounds.
_Avoid_: Hand row, toolbar

**Slot**:
A single action bar position that holds one prepared ability and its charge stack. A slot is the smallest player planning unit that persists across rounds.
_Avoid_: Lane, queue

**Duplicate Top Cards**:
Different copies of the same Card may occupy different Slots at the same time. Each Slot owns its own Charge Stack and activation limit; installing, charging, firing, replacing, or cleaning up one copy never changes another copy solely because they share a Card ID or Resource. There is no global one-per-Action-Bar restriction.
_Avoid_: Unique action-bar card, shared duplicate cooldown

**Persistent Slot**:
A Slot whose Top Card remains in place across rounds until it is replaced, discarded by Full-Charge Cleanup, or removed by an effect. Activating a Slot does not automatically clear its Charge Stack.
_Avoid_: Temporary slot, one-shot slot

**Charge Stack**:
The cards tucked under a Slot to enhance its Top Card. Charged cards modify the Top Card rather than acting as separate abilities. The Charge Stack persists through activation and is discarded with the Top Card only by Full-Charge Cleanup or another explicit effect.
_Avoid_: Discard pile, combo pile

**Charge Value**:
The maximum number of cards a Top Card may hold in its Charge Stack. A Top Card enters a Slot at `0 Charge`; each tucked hand card adds one Charge.
_Avoid_: Cost, Energy

**Slot Activation Limit**:
A Slot may activate once during its Top Card's matching player window. A Slot cannot receive additional charged cards after activation in that window. Its Charge Stack persists after activation until it is discarded by the full-charge rule or another effect.
_Avoid_: Cooldown, repeat cast

**Full-Charge Cleanup**:
At the end of a Top Card's matching player window, discard the Top Card and every card in its Charge Stack when the stack equals that card's Charge Value and the Slot activated during that window. A full but unactivated Slot persists for later use or an explicit special interaction. A Quick Top Card cleans up at the end of Quick; a Slow Top Card cleans up at the end of Slow.
_Avoid_: End-of-round cleanup, automatic expiration

**Primed**:
The state of a Slot whose Charge Stack equals its Top Card's Charge Value and has not activated in the current matching player window. A Primed Slot persists until it is activated, consumed by an explicit effect, or otherwise removed by a rule.
_Avoid_: Fully charged, ready by default

**Slot Replacement**:
Replacing a Top Card is a free beginning-of-Round action, before new charges are committed. Replacing a Slot discards its old Top Card and every card in its existing Charge Stack, then moves the chosen hand card into the Slot at `0 Charge`. Exception: re-loading a Slot that began the current Loadout Step empty is a Swap — the tentative Top Card and its Charge Stack return to hand rather than discarding, so a decision made moments ago can be reconsidered without cost.
_Avoid_: Respec, paid swap

**Loadout Step**:
The beginning-of-Round planning step after hand refresh and before Boss Instant. Players may freely replace Top Cards during this step before committing new charges in the Round. Empty Slots may instead receive a Top Card for free during either player window.
_Avoid_: Mulligan, precombat phase

**Charge Timing**:
Any card in hand may be tucked beneath a Slot during either player window, regardless of that card's own speed. The Top Card alone determines when the Slot can activate.
_Avoid_: Charge speed, tucked-card casting

**Stamina**:
The planning resource used for movement. A player creates `1 Stamina` by dragging a hand card to an adjacent legal hex; that card is discarded and the hero moves there. Stamina is spent immediately, with no pool shown or carried between actions. The discarded card's text and Keywords do not resolve. The game grants no default Stamina each Round. Preparing a Top Card and tucking a charged card are free; each one-hex move costs `1 Stamina`, with no per-window move limit. Activating a charged Slot costs no Stamina and uses no separate resource meter.
_Avoid_: Tempo, action points

**Persistent Hand**:
Cards remain in hand until they are prepared, tucked as charges, discarded by an explicit effect, or otherwise moved. An encounter begins with four cards, and at the end of each Round the player draws until the hand contains four cards. Four is a refill target rather than a hard hand limit. Discarded cards shuffle back into the deck only when that deck runs out.
_Avoid_: End-turn discard, rotating hand

**Charge Modifier**:
An explicit Top Card rule that changes its effect according to the Keywords on cards in its Charge Stack. A tucked card always adds one Charge, but grants no universal numerical bonus.
_Avoid_: Default charge bonus, hidden synergy

**Keyword**:
A reusable mechanical label on a Card. A card may have multiple Keywords. It contributes one Charge when tucked, and counts once for every explicit matching Charge Modifier on the Top Card.
_Avoid_: Card type, flavor tag

**Top Card**:
The visible card occupying a Slot and defining that Slot's actual ability. The Top Card determines range, Charge Value, timing, and effect text.
_Avoid_: Active card, lead card

**Loaded**:
The neutral presentation state of an occupied Slot whose Top Card exists and whose Charge Stack is empty. A Loaded Slot is not actionable: it needs at least one Charge before it can activate. `Loaded` describes a UI-visible state derived from the existing Slot snapshot; it does not add a rules action, timing permission, or resource cost.
_Avoid_: Ready, Primed, Activated, Locked

**Hand**:
The player's currently available cards, presented as compact cards in the bottom interaction zone of the portrait combat HUD. Four is the normal end-of-Round refill target, not a hard maximum; the authored First Turn Encounter refills to five so the scripted Round can spend one card on every gesture it teaches.
_Avoid_: Hand row, card tray

**Compact Card**:
A hand-sized card that exposes only its name, timing, and Charge Value for rapid scanning. It is not the canonical full-card reading surface.
_Avoid_: Full card, tooltip card

**Detail Popup**:
The temporary reading surface for any named HUD object — a Compact Card, a Slot, a Boss Beat chip, a Hero stat, the Round track. It carries that object's numbers and complete authored text. Each input opens it its own way: touch presses and holds, a mouse hovers, the keyboard holds `Enter` or `Space`; it dismisses on release or when the pointer leaves. The HUD proper carries names, numbers, and colour; the sentences live here, one gesture away. Card Inspection is the Compact Card case of a Detail Popup.
_Avoid_: Tooltip, card menu, help screen

**Stat Panel**:
The persistent readout for one piece on the board — the Boss, a Hero, or a Minion — opened by tapping that piece's tile and floated over the board's lower edge. It carries the piece's gauges: health for every piece, plus armor, deck, and Status Effects for a Hero. The panel follows the piece rather than the hex and shows the staggered playout values while a Boss Row replays, so it reads as a live gauge; it closes from its own control, a tap on an empty hex, or a session transition, and stays up through ordinary play. Unlike a Detail Popup it persists instead of dismissing on release. Presentation only: it is never a rules surface.
_Avoid_: Tooltip, Detail Popup, HUD gauge, unit frame

**Scripted First Turn**:
The guided Round a first-time player meets: it walks prepare, charge, fire in the Quick Window, step out of a telegraph, and fire in the Slow Window, gating input to one control at a time. Its current step is derived from the live Encounter state rather than counted off, so it stays correct when the player wanders, restarts, or time-travels. It runs once, and finishing or skipping it retires it.
_Avoid_: Tutorial mode, onboarding wizard, scripted encounter

**Board Feedback**:
The transient motion the board plays for a resolved batch of actions: a lunge toward what was struck, a flash and floating number on what was hit, a pulse on a Hero who guarded, a glide for a step taken, a flare over a resolved telegraph. Every beat of it is derived from Resolution Facts, so the board can never show a blow the Encounter did not resolve.
_Avoid_: Animation state, VFX layer, Board Ambience

**Board Ambience**:
Continuous board motion that carries no rules information and applies uniformly to every piece, such as the idle cycle a piece plays at rest. It is never derived from Resolution Facts and never distinguishes one piece from another, which is what keeps it from being read as a state signal. A piece that stands takes its ambience entirely from its idle sheet, which animates inside the silhouette and leaves the feet on the tile; the bob that raises a body off its cast shadow is reserved for a piece that flies, because that gap between body and shadow is what flight looks like. It yields to Board Feedback for any piece an effect currently owns, and it stops entirely under reduced motion.
_Avoid_: Idle animation, Board Feedback, juice

**Bottom Interaction Zone**:
The thumb-reachable portrait HUD area that contains the Action Bar immediately above the Hand. It is reserved for player input rather than encounter telemetry.
_Avoid_: Footer, toolbar

**Class Resource**:
A role-specific resource spent on signature actions. For the tank, this is currently `Guard`.
_Avoid_: Stamina, charge

**Armor**:
A Hero's temporary damage shield. Armor blocks incoming damage before Health and does not convert into damage, protection, or another effect unless a future explicit rule changes this.
_Avoid_: Spendable defense, shield currency

**Interception**:
A Shield Wall protection effect that redirects damage intended for a chosen ally to the Guardian. Interception is distinct from Armor: the redirected damage can then be blocked by the Guardian's Armor.
_Avoid_: Area defense, passive damage reduction

**Intercepted Hit**:
The next one damage event that would affect the ally selected by an Interception effect. The full event redirects to the Guardian, then the Guardian's ordinary mitigation applies. The Interception effect expires after that event or at the end of the Round if unused.
_Avoid_: Permanent redirect, damage split

**Guarded Front**:
The hex adjacent to the Boss on the side the Boss faces. A Shield Wall Hero holds the Guarded Front by standing in it, which is where the Guardian's positional protection and front-line duties apply; it is not a universal safe zone.
_Avoid_: Tank lane, front row

**Slot Tension**:
The primary player pressure created by deciding whether to keep charging a slot, fire it now, or replace it. Slot tension is more central to the game than Stamina tension or class-resource tension.
_Avoid_: Hand tension, mana tension

**Tank Hit**:
Boss damage authored as a Targeted Boss Hit and intended to be answered by the Tank through mitigation, interception, or threat control. A Boss Beat's Tank Hit identity is explicit; it is not inferred from generic damage, Hazards, or Minions. Moving out of a board pattern does not evade a Tank Hit unless that Beat explicitly says it is avoidable.
_Avoid_: Single-target damage, front damage

**Targeted Boss Hit**:
Boss damage resolved against the Hero selected by the Beat's explicit Target Selector, rather than against Heroes standing in a board pattern. It creates planned attrition that remains after perfect movement; mitigation, interception, threat control, or an explicit Beat exception may answer it. A Targeted Boss Hit is not an unavoidable Raid Hit by default.
_Avoid_: Dodgeable cone, generic damage

**Avoidable Board Pattern**:
An authored set of board hexes that harms only combatants occupying its resolved geometry. A Hero can answer it by leaving the pattern when timing and movement rules allow. Avoiding an Avoidable Board Pattern does not answer a simultaneous Targeted Boss Hit.
_Avoid_: All boss damage, target selector

**Downed**:
The state of a Hero at `0` health. A Downed Hero remains on its hex as a blocking, non-targetable body; it does not immediately end the Encounter and must be revived by the end of the following Round or is permanently defeated. A permanently defeated Hero is removed from play, but the Encounter continues while at least one Hero remains living. If every non-permanently-defeated Hero is Downed at once, the Encounter ends in defeat.
_Avoid_: Dead, eliminated

**Revive**:
A universal action available to a living Hero adjacent to a Downed ally. Discard one hand card to return that ally to `25%` of maximum health, rounded up. Healer cards may improve or replace this baseline action.
_Avoid_: Resurrection, free pickup

**Raid Hit**:
Boss damage intended to pressure the whole party or non-tanks. The tank may soften a raid hit, but should not fully trivialize it alone.
_Avoid_: Splash, AOE

**Raid Run**:
A short sequence of linked encounters in which the party evolves raid-scoped decks before confronting a known Final Boss. A raid run ends on final victory or on any encounter defeat.
_Avoid_: Campaign, roguelike run

**Prep Encounter**:
A short encounter before the Final Boss that teaches or tests a simplified version of one of its signature mechanics.
_Avoid_: Filler fight, trash fight

**Final Boss**:
The known final encounter of a Raid Run. Its phase outline and signature mechanics are visible while the party plans its route.
_Avoid_: End boss, surprise boss

**Hero**:
A collectible party member with a distinct identity, visuals, deck, and raid-scoped evolution.
_Avoid_: Character, class

**Starting Deck**:
The fixed twenty-card deck a player builds from their Player Hero's unlocked cards before entering a Raid Run. Raid rewards may evolve it only for that Run.
_Avoid_: Loadout, collection

**Player Hero**:
The single Hero directly controlled by one person during an Encounter. Each player owns that Hero's hand, Action Bar, position, and tactical choices.
_Avoid_: Main character, avatar

**AI Hero**:
A Party member controlled by predictable visible priority rules in solo play. An AI Hero has no player-managed hand or Action Bar.
_Avoid_: Bot player, companion mode

**Party**:
The two-to-four Player Heroes cooperating in an Encounter. A Party is controlled by multiple people when possible. In solo play, simple AI Heroes fill the remaining Roles so the same party-shaped encounter mechanics remain in play.
_Avoid_: Squad, team comp

**Committed Movement**:
A Player Hero's visible chosen destination during a shared player window. A destination must be legal and unclaimed when committed; another Hero cannot commit to the same hex.
_Avoid_: Movement queue, collision resolution

**Shared-Window Resolution**:
Resolve all Committed Movement first, then resolve activated Slots in a public deterministic order: Tank, Healer, Damage. When two Damage Heroes are present, the Party votes for the Damage 1 / Damage 2 tiebreaker during the Loadout Step; that order is locked for both player windows in the Round.
_Avoid_: Hidden initiative, simultaneous collision

**Role**:
A Hero's party responsibility. A standard Party has exactly one Tank, exactly one Healer, and one or two Damage Heroes; only Damage may occupy the optional fourth slot. Solo AI fills any missing Role.
_Avoid_: Class, job

**Archetype**:
A Hero's mechanical identity that determines how its cards and rewards express its Role.
_Avoid_: Role, class

**Shield Wall**:
A Tank Archetype that claims dangerous space, protects allies through direct mitigation and positioning, and makes the Boss's frontal pressure survivable.
_Avoid_: Battle captain, support tank

**Threat**:
A persistent per-Hero value that normally determines which valid Hero a boss targets. Damage dealt to the boss gains equal Threat unless an effect says otherwise.
_Avoid_: Aggro, hate
_Not yet in the engine_

**Taunt**:
An effect that sets its user's Threat to one above the current highest Threat value.
_Avoid_: Forced target, provoke
_Not yet in the engine_

**Target Selector**:
The explicit visible rule on a Boss Timeline action that determines its target, such as Highest Threat, a specific Role, Lowest Health, Nearest, Farthest, or All. Its predicted target is highlighted before resolution. If a selected Role is absent or defeated, target the nearest living Hero instead. Resolve selector ties by highest Threat, then the public Party resolution order.
_Avoid_: Targeting AI, target logic

**Target Pattern**:
An engine-resolved geometric set of affected hexes. A Target Pattern uses axial coordinates and, when directional, exactly one legal hex-edge Facing: `E`, `NE`, `NW`, `W`, `SW`, or `SE`. It resolves its hexes before any combatant, allegiance, range, or other target filtering. A Target Pattern is not a target-selection interface or an image-driven rule.
_Avoid_: Reticle, UI highlight, image mask

**Pattern Selection Binding**:
The authored input a Target Pattern requires: `none` uses the supplied source origin without a player selection; `hex` uses a selected on-board hex as the origin; `piece` uses the selected Piece's current hex as the origin; and `direction` uses the supplied source origin plus one legal hex-edge Facing. The catalog declares one binding per pattern use; it does not create a generic Enemy selector.
_Avoid_: Targeting UI, free aim

**Target-Bound Pattern**:
A Boss Beat composition that first uses a Target Selector to choose a Piece, then resolves a directional Target Pattern from the Boss's hex toward that selected Piece. The derived Facing is snapped to exactly one legal hex-edge Facing: `E`, `NE`, `NW`, `W`, `SW`, or `SE`. A Target-Bound Pattern may include the selected Piece's hex when authored and may continue beyond that Piece, so a Tank can be the selected target while non-Tanks standing behind the Tank are affected by the same geometry. It does not create arbitrary-angle aiming, a player-card targeting UI, or a persistent player-facing burden.
_Avoid_: Free-aim cone, player-facing tax, generic target selector

**Pattern Result**:
The normalized geometry result of resolving a Target Pattern. It contains the Pattern ID, origin, selection binding, resolved Facing when applicable, and a stable ordered list of legal on-board affected axial hexes. Consumers filter or present this result; they do not recompute its geometry.
_Avoid_: UI estimate, derived shape

**Tutorial Prompt**:
One short, dismissible teaching surface that appears when an authoritative Encounter fact or projection makes its concept relevant. A Tutorial Prompt explains an existing rule or visible pressure; it does not create legal actions, advance the Encounter, or become a gameplay fact.
_Avoid_: Scripted tutorial step, modal turn gate, HUD rule

**Tutorial Prompt Contract**:
The authored teaching definition for one Tutorial Prompt: its ID, authoritative trigger meaning, priority, intended completion, player-language intent, and any required projection. Presentation policy such as blocking, show-once persistence, directive level, and Help history remains a product decision outside the rules contract.
_Avoid_: UI-only trigger, forced action

**Reward Category**:
The visible family of a route reward, such as Defense, Mobility, Damage, Resource, Utility, or Boss Tech. Its concrete reward is Hero-specific.
_Avoid_: Loot type, reward rarity

**Boon**:
A raid-long passive reward assigned to one Hero. A Boon may affect that Hero or support the whole party.
_Avoid_: Relic, artifact

**Encounter Engine**:
The single authoritative rules authority that owns Encounter state and resolves every action. Every client, test, and tool submits actions to it and renders its projections; nothing else owns a rules path.
_Avoid_: Game loop, simulation layer, rules helper

**Encounter Workbench**:
The browser surface for playing and inspecting Encounters during design iteration. It presents the portrait play surface with debug tooling around it and holds no rules authority.
_Avoid_: Sandbox, playtest rig, game client, testing framework

**Scenario**:
A named, versioned sequence of Encounter actions replayed from a seeded initial state to reach a specific mid-Encounter situation. A Scenario is always rules-legal because the Encounter Engine resolves every step of the replay.
_Avoid_: Save file, state snapshot, fixture blob
