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
A counted Boss value on one fixed scale from `0` to `5`, identical on every Boss so the party reads it without arithmetic. It gains `1` automatically at the end of each Round once automatic escalation begins, which is derived so that automatic ticks alone reach the top threshold exactly at the Encounter Clock. It gains more, from Round `1` onward, from authored Beat penalties when a demand goes unanswered — so ignoring a demand pulls the collapse forward. Two demands are supported: a Minion the party failed to answer, and no Hero standing within reach of the Boss at the Round end (D-041). The first is asked at the Round end for a Minion that survived a full Round, and at the fuse for one that detonates (D-063), because a Minion that removes itself never reaches a Round end; either way it is charged at most once in a Round. The second is how range camping is closed, and it prices what no chase can: a party that never engages at all, asked at the Round end. The original ruling was that it had to be a demand *rather than* a chase, on the reasoning that being close is safer than being far on a small board, so a Boss that pursued a camper only delivered them a target. That ruling was tested against a traversing Boss and held: a chase that closes the whole camping distance hands the camper back every point of damage their distance was costing them, because since D-073 a camper's melee reach lands only when the Boss arrives. A `Movement Clause` is therefore Boss identity — whether it can be kited, funnelled, or blocked — and never counter-pressure against distance, and its closing distance per Round must stay under the distance a camper can open. The demand remains the only answer to camping. It is the encounter's only clock: the Boss has no separate round-limit timer. Boss identity lives in the effects at each threshold, never in the length of the scale; a Boss may name it something else in its own rules text, but Escalation is the only mechanical name for it (ADR 0027).
_Avoid_: Enrage timer, dread meter, per-boss scale

**Escalation Threshold**:
The authored effect a Boss applies on reaching one Escalation value. Values `1` through `4` change how the fight behaves; the threshold at `5` is the hard wipe. A threshold is preferably **structural** — permanently closing part of the arena — rather than numeric, so the collapse is felt as space running out rather than as another damage number (D-031). No structural threshold may touch a hex adjacent to the Boss, because burning the `Guarded Front` would remove the Tank's own answer. A Beat that can add Escalation is `Severe`, which keeps it out of the first program of any phase (D-036).
_Avoid_: Soft enrage stage, phase trigger

**Encounter Clock**:
The number of Rounds that automatic Escalation ticks alone need to reach the top Escalation Threshold, usually eight before modifiers. Player count, difficulty, or boss rules may adjust it, and authored acceleration can only shorten it in play. Because acceleration is live, the nominal length is the length a party earns by answering demands, not the length it gets by default: on Embermaw, a party that lets its Whelps go off reaches the wipe around Round `6`, and only a line that clears them sees Round `8`.
_Avoid_: Turn cap, hard timer, enrage timer

**End-of-Clock Behavior**:
The effect a Boss applies at its top Escalation Threshold. Different bosses may lose the party immediately or enter another authored failure state; it is that threshold's effect rather than a rule running beside Escalation.
_Avoid_: Global enrage rule, overtime, parallel timer

**Boss Timeline**:
The sequence of boss actions arranged into two horizons: the `Instant` row and the `Incoming` row, both belonging to the current Round. Row names state when, never how much is known. A third horizon, the `Forecast` row, existed until ADR 0031 removed it: next Round's schedule is now learned by playing rather than shown. The boss timeline is mostly scripted rather than random. It is a rules structure, not a HUD band: the strip that listed both rows by name was removed (D-060), and a Beat is read as a `Beat Card` when it resolves, while the `Incoming` row's threat stands on the board ahead of the `Quick Window` as its telegraph.
_Avoid_: Deck, queue, stack

**Boss Program**:
The authored pair of ordered Instant and Incoming rows used by the Boss for one Round. An Encounter's authored program list is a **pool**, not a script: the running order is drawn from the Raid Seed at setup, with Round `1` pinned to the authored opener and the remainder dealt from reshuffled bags of the whole pool, so each program appears about as often as a fixed rotation would while the Round it lands on varies (ADR 0028). The Boss's learnable spine is therefore the *set* of programs and what each one demands, not the order they arrive in. Two programs may not be mechanically identical: each must ask for a distinguishable answer, or there is nothing for a player to learn by meeting them (D-036).
_Avoid_: Boss card, turn script

**Module Slot**:
The one position a Boss Program may declare for bounded variation, filled by one of several authored Beat groups. The spine stays learnable while the filling varies; the Raid Seed chooses the filling, and the choice is settled at setup so replay from the seed stays deterministic (ADR 0025). Modules are validated in combination, never one at a time, because module interactions are where difficulty actually comes from.
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
One ordered authored action inside a Boss Program row. A Boss Beat discloses completely: target, magnitude, hexes, and Resources such as a Hazard or Minion are all stated in the row it occupies. The staged disclosure of ADR 0026 — family-level in a Forecast Row, complete on arrival — is retired with that row (ADR 0031); a Beat is never legally incomplete anywhere.
_Avoid_: Event, command, hidden trigger

**Consequence Tier**:
The authored severity band naming what a Boss Beat can cost. A Beat that can down a Hero **from full health**, or cross an Escalation Threshold, is `Severe`, with no justification clause available. The full-health floor is what keeps the band a property of the Beat: lethality at whatever health attrition has left behind is a property of the moment, not the Beat. The band once set a Beat's earliest legal horizon, which ADR 0031 retired along with the Forecast Row. What it governs now is fairness at the start: **the first program of every phase carries no `Severe` Beat** (D-036), so the one Round nobody can have learned yet cannot be the Round that ends the run.
_Avoid_: Damage tier, priority, threat level

**Encounter Briefing**:
The pre-fight reference that shows a Boss's possible moves, each move's pattern and counterplay, its Module Slots and the families that can fill them, and phase themes. The Briefing is the catalog of what a Boss can do; the schedule is not published anywhere and is learned across attempts (ADR 0031). It never states rotation order, so first-attempt discovery survives. The Briefing is also where a fuller boss guide belongs when menus exist — outside the fight, never on the play surface.
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

**Burst**:
A player Card effect centered on a selected on-board hex within Range of the firing Hero. The center may be empty. Every Enemy whose hex lies within the authored radius — including the Boss and all Minions, but never Heroes or allies — receives one ordinary damage action, with Minions in stable entity order and the Boss last (ADR 0030). The firing action records the center and its ordered on-board footprint so preview and resolution share one geometry result.
_Avoid_: Piece-targeted area attack, splash estimate, friendly fire

**Counter**:
A named, counted marker carrying a count, a cap, and optionally a clock (D-032, D-047). A Counter is held by a **host**: a combatant (a Hero **or** an Enemy), a hex, or a prepared Slot (D-048). A Slot host is D-035's Top Card attachment; solo it can only be one of the firing Hero's own Slots, because there is no ally to attach to yet. Ground outlives whoever stands on it, so a hex Counter is a mark on the arena rather than on a piece; a Slot Counter rides the prepared Top Card, so re-loading that Slot drops it. Only a combatant host may carry Readers, because every Reader event is something that happens to a combatant. A Counter never outlives its host, and ground that burns away for good under a structural Escalation Threshold takes the Counters on it with it — temporary Hazards are weather the ground outlives (D-050). Counters run both ways: a Boss Beat may place one, either on the Party or on the Boss itself, which is how Embermaw banks `Heat` the party can watch accrue and spend a card cooling (D-051). A Counter does nothing on its own. Everything it does is a **Reader**: an authored entry saying which event it answers (`round_start`, `host_takes_damage`, `host_deals_damage`, `slot_fired`) and what it adds per Counter held. A damage Reader may narrow itself to one `event_keyword`, answering only blows carrying that Keyword; naming none answers every blow of its kind (D-049). So a Counter never declares which side it is "for" — Sundered raises what its host takes and Weakened lowers what its host deals, and either would work on either side. Counters are authored in `data/counters/`, and a card may only place one whose host its own `target_type` can supply; `max: 1` is the old non-stacking rule, and anything higher accumulates, which is how Fortified's banked Armor is simply its count. A Counter is temporary on every combatant alike: one carrying a duration ticks down at each Round start, and one whose host leaves the board leaves with it (D-045). Every Counter is visible to the whole Party, read on the Stat Panel of whichever piece holds it. A Counter may never redirect a Boss Beat's target or change what that Beat is.
_Avoid_: Status effect, passive, invisible buff, stack

**Damage Keyword**:
What a blow is made of and who it is aimed at, authored on a Boss Beat or a Card as `damage_keywords` and carried on the damage's Resolution Fact (D-049). Plural on purpose: a blow may be a `Tank Hit` **and** an element, and one string holding both axes is the category error the Keyword `kind` exists to prevent. `Tank Hit` is the Keyword the rules themselves read — absorbing one cleanly on the Guarded Front is what grants Riposte Ready. A Counter's Reader may narrow itself to one of these, which is how a Counter answers one kind of blow rather than all damage.
_Avoid_: Damage type field, classification string, element tag

**Reader**:
The only path from a Counter's count to a number (D-047). A Counter's own Readers say what holding it does; a Card's `reads` say what firing it does with Counters, through three verbs — `gate` (refuse unless the count qualifies), `scale` (add per Counter held), and `spend` (remove Counters, as a cost paid before the Card's effects are computed, or at resolution after). A Reader names one Counter or one Keyword, never both, and reads one of two subjects: the firing Hero or the Card's chosen piece. Readers do not compose with boolean logic — every `gate` must pass, and that is the entire grammar. A mechanic that needs more than this belongs in engine code, which is where Riposte Ready's graded consumption stays (D-015, D-033).
_Avoid_: Trigger, effect script, condition

**Riposte Ready**:
A `max: 1` Elian Voss Counter, built by engine code rather than authored, because its graded consumption is what the Reader vocabulary models worst (D-033, D-047). When a Boss Tank Hit resolves against Captain Elian Voss while they occupy the Guarded Front and causes `0` Health loss, grant Riposte Ready if they do not already have it. It expires at the end of the first Quick Window after that qualifying hit, whether the hit occurred in an Instant Row or an Incoming Row. The first card that deals Boss damage while it is active consumes it: a legal Shield Slam gains `2` additional Boss damage, and any other Boss-damage card gains `1` (D-015). Cards that deal no Boss damage never consume it. The effect must show its qualifying trigger, expiry, and consumption; it is not a general posture category or a resource meter.

The same qualifying hit also decides where that Beat's Hazard falls (D-039): absorbed cleanly, the ash spills to a hex further from the Boss instead of underfoot. One predicate, two rewards — throughput for a Party that can spend it, standing room for a line that cannot. Neither reward ever reduces what the Beat costs; they only change where the cost lands.
_Avoid_: Awakening, stacking buff, generic stance

**Fortified**:
An Elian Voss Counter placed by firing Fortify in the Slow Window (D-019). It is a Counter with delayed onset, not a `Commitment`: it prepares for whatever the next Round opens with rather than for a named Beat, so it has no Beat to bind to. Its definition is authored in `data/counters/`, and the banked Armor is the count — Fortify places one Counter per Armor stored, so the amount still rides the card (D-047). Its Reader pays one Armor per Counter at the start of the next Round, immediately after the Armor wipe, and the Counter then expires; the granted Armor is ordinary Armor thereafter. Multiple Fortified commitments stack additively, which with a count is simply addition. Because it lands before the next Instant Row, it is the one way to pre-block Instant-row pressure.
_Avoid_: Delayed buff, second Armor pool

**Hazard**:
A board effect attached to one or more hexes. A Hazard may constrain voluntary movement or respond when a combatant enters its hex. Most Hazards are temporary and expire at a Round boundary; a Hazard a Beat marks permanent survives it, because the arena does not recover from it. Permanence has two authors — a structural Escalation Threshold, which burns hexes nobody chose, and a Beat whose Hazard the party's own play placed (D-039). Only the first is banned from the ground next to the Boss: a hex the Tank burnt by standing there is a consequence, not a trap. Every Hazard records the side that laid it, and by default **a combatant is immune to its own side's Hazards** (D-042) — a Boss crosses its own Ash Trail untouched and a Minion does not burn in its master's fire, while a Hazard the party lays still burns Enemies. Since D-074 that default is the Hazard's to decline: whether ground burns the side that lit it is authored, because a Boss walking through its own fire is a decision about that Boss rather than a fact about fire, and declining it is what makes luring one onto its own ground a fight somebody can build. A Hazard also answers two separate questions about being entered, on a physics-versus-choice axis (D-075): ground a Hero may not *elect* to walk into, which a shove can still put them on, and ground that is `impassable`, which nothing enters by any means.
_Avoid_: Surprise damage, ambient effect

**Reach**:
The greatest hex distance from a source to what its effect touches, measured at the moment the effect resolves. Every ability has one — a Card, a Boss Beat, a Minion's bite — and an effect never lands past it. A Card's `boss_damage` was the exception until D-073: it resolved from anywhere, which let a melee swing read as artillery.
_Avoid_: Range, radius, distance

**Standoff**:
The distance a `Movement Clause` is trying to achieve: how close the mover wants to stand before it acts. A mover goes no further than it has to, so it stops the moment its target is this close and does not move at all when the target already is. It is what makes an advance readable rather than arbitrary — the piece comes exactly close enough to do the thing it is about to do.
_Avoid_: Approach, closing distance, engagement range

**Traversal**:
A piece crossing the board under its own power along a route decided before it sets off. Distinct from a paid step, which is one hex a Hero buys with Stamina, and from `Forced Movement`, which is a force applied to a piece. Because the route is chosen in advance it can go around what a shove would stop dead against. Three kinds: `walk` steps through ground it can stand on and pays Hazard entry for every hex; `jump` crosses whatever lies between and pays only where it lands; `teleport` has no route at all and appears where its `Standoff` is answered.
_Avoid_: Pathing, movement, walk

**Movement Clause**:
The part of a Boss Beat that traverses before the Beat's own effect resolves, so one Beat can close distance and then strike. Any Beat kind may carry one, and the Beat's effect is measured from where the movement ended. It belongs to the `Instant Row` alone: the `Incoming Row` is telegraphed a phase early, and where a moving Beat ends up is not knowable then.
_Avoid_: Move action, advance, reposition

**Forced Movement**:
Movement imposed on a target by an effect rather than paid for with Stamina. A Push moves the target away from the effect's source; a Pull moves it toward that source. Forced Movement advances one hex at a time, stops before an occupied, off-board, or `impassable` hex, and may partially succeed or succeed at zero distance. It ignores ground a Hero merely declines to walk into, but not ground nothing can stand on: impassable must not mean impassable unless pushed. Every entered Hazard still resolves. It never changes the moved piece's facing and grants no immunity to a piece on the Guarded Front (ADR 0029).
_Avoid_: Free move, knockback teleport, `Traversal`

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
The visible end-step action a living Minion will take: bite its nearest Hero when that Hero is inside its authored `Reach`, or `Traversal` toward them when they are not. Both halves are content since D-072 — how far a Minion bites and how far it travels used to be constants in engine code, which made every Minion the same Minion. Intent is derived deterministically from the live board, resolves after the Slow Window before the Round wraps, and Minion damage is a Raid Hit — never a Tank Hit and never a Riposte Ready trigger. A Minion with a `Minion Detonation` gets exactly one end step, so its creep is what brings its blast into range rather than a deadline of its own.
_Avoid_: Hidden AI, random wander, aggro table

**Minion Detonation**:
A Minion's authored end. A Minion carrying a blast — `explode_damage` and `explode_radius`, both authored or neither — detonates on the `Incoming Row` of the Round after the one it arrived in, before that Row's Boss Beats resolve, and is consumed. Its blast is a Raid Hit against every Hero within the radius and against nothing else: an Enemy blast never touches the Boss or another Minion, which is `Burst` pointed the other way and closes the same hole D-042 closed for Hazards. A detonation is not a `Minion Defeat` — no damage action removed the piece, so nothing records `target_removed` and no Hero is credited a kill. The board paints the footprint for the whole Round the fuse burns through, as a wash with one outline around the outside of it — the same warm step the cone takes, separated by shape rather than by colour. It has two answers rather than one: kill the Minion inside its single Round, or stand outside the blast. Only the first answers the demand — a Minion that reaches its fuse charges the Escalation its spawning Beat authored, once for the Round it went off in, because footwork dodges the damage and not the fact that the add is still there. Whether a Minion has a fuse at all is content: one authored without a blast creeps and bites indefinitely, and that Minion is the one a Round-end demand still prices for standing.
_Avoid_: Suicide bomber, death rattle, on-death trigger, Minion Defeat

**Commitment**:
An authored card effect bound to one named Boss Beat, visible to the Party, resolving when that Beat resolves (D-028). A Commitment may only bind to a Beat whose parameters are disclosed — one in the `Incoming Row` or `Instant Row`. With the Forecast Row gone (ADR 0031) every disclosed Beat qualifies, so the constraint now bites in a different place: there is no surface naming a *future* Beat, which is what the mechanism was designed to bind to. Removing the program strip (D-060) sharpened that — no surface names an `Incoming Row` Beat before it resolves either — so whatever ships a Commitment owes it a naming surface of its own. Commitments prepare for a named future problem; they may never redirect its target or change what it is, and that ban is effect-level — it binds any mechanism that could produce the same effect. Nothing implements a Commitment yet: Fortify was reclassified as one and the reclassification was retracted, because it prepares for whatever the next Round opens with rather than for a named Beat.
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
The boss actions that resolve before the party's `Slow Window`. These are telegraphed mechanics that the party can plan around — telegraphed on the board, since D-060, rather than named in a strip: the breath cone and the marked spawn hexes are painted before the row resolves.
_Avoid_: Future row, pending row

**Quick Window**:
The shared simultaneous player phase after the `Instant Row` resolves. It is for basics, repositioning, setup, and low-cost actions. In multiplayer, committed movement destinations and selected abilities are visible to the Party. The window ends when every player is Ready or its short timer expires; Ready may be withdrawn until resolution.
_Avoid_: Fast phase, reaction phase

**Slow Window**:
The shared simultaneous player phase after the `Incoming Row` resolves. It is for spenders, signature abilities, and larger tactical commitments. In multiplayer, committed movement destinations and selected abilities are visible to the Party. The window ends when every player is Ready or its short timer expires; Ready may be withdrawn until resolution.
_Avoid_: Power phase, cast phase

**Action Bar**:
The persistent set of player action slots that hold prepared abilities. Players slide cards under slotted abilities to charge them over multiple rounds. It also carries the two `Action Bar Rail` controls that pace the fight, one on each side of the Slots.
_Avoid_: Hand row, toolbar

**Action Bar Rail**:
One of the two narrow controls flanking the Slots in the `Bottom Interaction Zone`: `Undo` on the left, and on the right the single control that moves the fight forward — playing the next Boss Beat while a Boss Row is being told, closing the window otherwise, and restarting once the Encounter has ended. A rail is a control rather than a readout, which is what earns it a place in the thumb's reach; the Round's state is read from the Round track, which carries no controls at all.
_Avoid_: Toolbar button, Next button, footer control

**Undo**:
Taking back the Hero's last action inside the window it was taken in — a Slot loaded or fired, a Charge tucked, a step paid for. It reaches the actions still standing above the last phase advance and no further: a Boss Beat and the advance that closed a window are not the Party's to rewind, because the Round is the Boss's clock and an `Escalation` that can be walked backwards is not a clock. An action that was refused changed nothing and is stepped over rather than taken back, so one press always takes back one thing that happened.
_Avoid_: Rewind, time travel, take-back of a Boss Beat

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
At the end of a Top Card's matching player window, discard the Top Card and every card in its Charge Stack when the stack equals that card's Charge Value and the Slot activated during that window. A full but unactivated Slot is `Full` and persists for later use or an explicit special interaction. A Quick Top Card cleans up at the end of Quick; a Slow Top Card cleans up at the end of Slow.
_Avoid_: End-of-round cleanup, automatic expiration

**Full**:
The state of a Slot whose Charge Stack equals its Top Card's Charge Value and has not activated in the current matching player window. A Full Slot persists until it is activated, consumed by an explicit effect, or otherwise removed by a rule. A Slot carrying the same complete stack that *did* activate is not Full: it cannot fire again, cannot take another Charge, and Full-Charge Cleanup discards it at the end of the window.
_Avoid_: Primed, ready by default

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
An explicit Top Card rule that changes its effect according to the Keywords on cards in its Charge Stack. A tucked card always adds one Charge, but grants no universal numerical bonus. A modifier that names a Keyword is shown on both ends of the choice it creates: the Slot carries that Keyword's mark beside its tumblers, and a hand card carrying the Keyword marks it live while that Slot can still take a Charge. A modifier that counts every charge alike names no Keyword and shows no mark, because no card in hand answers it better than another.
_Avoid_: Default charge bonus, hidden synergy

**Keyword**:
A reusable mechanical label, authored in `data/keywords/` and referenced by id. Keywords are the game's one tag namespace: a Card's tags, the Role a Boss Beat selects, the kind of damage a Beat deals, and the answers a Boss Program demands are all Keywords, so anything that pivots on a label pivots on the same vocabulary (D-046). Each Keyword declares a `kind` — `role`, `trait`, `damage_type`, or `answer` — and every reference is checked against both the id and the kind it is allowed to name, because a reference that resolves to the wrong sort of Keyword is an error the id alone cannot catch. A Keyword carries no behaviour of its own; it is a join key, and what reads it decides what it means. A card may have multiple Keywords: it contributes one Charge when tucked, and counts once for every explicit matching Charge Modifier on the Top Card. A Keyword of kind `role` marks whose deck a card belongs to, so every card in a Hero's deck carries it and the glance surfaces leave it off.
_Avoid_: Card type, flavor tag, tag string

**Top Card**:
The visible card occupying a Slot and defining that Slot's actual ability. The Top Card determines range, Charge Value, timing, and effect text.
_Avoid_: Active card, lead card

**Loaded**:
The neutral presentation state of an occupied Slot whose Top Card exists and whose Charge Stack is empty. A Loaded Slot is not actionable: it needs at least one Charge before it can activate. `Loaded` describes a UI-visible state derived from the existing Slot snapshot; it does not add a rules action, timing permission, or resource cost.
_Avoid_: Ready, Full, Activated, Locked

**Hand**:
The player's currently available cards, presented as compact cards in the bottom interaction zone of the portrait combat HUD. Four is the normal end-of-Round refill target, not a hard maximum; the authored First Turn Encounter refills to five so the scripted Round can spend one card on every gesture it teaches.
_Avoid_: Hand row, card tray

**Material**:
The unit the interface's colour language is built from: a named substance with one job, such as runeglass for projected information, living gold for anything the player operates, ember for damage taken, ember coral for the Boss's own body. Colour names a material and never a decoration, so a surface that needs a new colour has almost always chosen the wrong material. A material is not a single value — it carries a ramp, and picks its step from the ground it sits on. It binds the board as well as the chrome.
_Avoid_: Colour, theme colour, brand colour, swatch

**Plate**:
The surface every piece of chrome is made of: a parallelogram raked from vertical with its leading corner notched out, carrying an `Accent` along the full cut. Slots, prompts, cards, rails, modals and the Hero Frame are all plates; the rake is their silhouette, which is why a plate is never given a rounded corner. Its depth is derived from its own height rather than chosen, so a plate wears the rake its size implies. Presentation only.
_Avoid_: Panel, card, box, tile

**Face**:
A `Plate`'s body, stated as a `Material`. The face is one of the two channels a plate reports state on: steel is the resting body, dim is inert — fired, or waiting on another window — and a lit face in gold, coral, glass or ceramic says the plate is live, the Boss's, a player affordance, or a readout. A lit face always takes that material's own darkest step as its ink.
_Avoid_: Background, fill, surface colour

**Accent**:
The band running the full length of a `Plate`'s leading cut, and the interface's status channel. Gold says live — this can fire, or this is the move. Ember says irreversible. Runeglass says a player affordance is being offered. Signal cloth says the role channel. Absent says there is no status to report. Every plate speaks it, which is what lets state be read across the whole surface without reading any label.
_Avoid_: Border, highlight, edge, trim

**Band**:
A full-width horizontal division of the play surface that owns its own height — the phase band, the Action Bar, the Hand. A band displaces the board rather than covering it, so adding or removing one resizes the play field; that is the reason bands are fixed for an Encounter and nothing may become one mid-fight. Anything that comes and goes is an overlay instead, and floats.
_Avoid_: Row, strip, section, toolbar

**Notification Zone**:
One of the three lanes every floating surface lands in: `guidance` over the top hexes for teaching the player may ignore, `stage` in the middle for one announcement at a time, `dock` against the Action Bar for anything asking for a tap on the controls just below it. The zones are siblings of one column, so no two members can share a pixel and a surface arriving or leaving never resizes the board. The dock's floor is the `Hero Frame`'s top edge. Which zone a member belongs to is settled centrally, not by the order surfaces are written.
_Avoid_: Toast area, overlay layer, popup stack

**Compact Card**:
A hand-sized card that exposes only what the card is for in the current window, for rapid scanning. It is not the canonical full-card reading surface. In the `Loadout Step` — and in the Boss rows, where it is inert — it shows the card as a prospective Top Card: name, timing, and Charge Value. In either player window it shows the card's `Keywords` instead, because tucking and moving are the only things a hand card does there and neither reads its timing or Charge Value; a Keyword a loaded Top Card's `Charge Modifier` would pay off is marked as live. While a move is being lined up — held over a hex the Hero could enter, with nothing committed — it shows one `Stamina` mark and nothing else, because the question there is only whether a step is available and any card answers it. Once a destination is committed and the Hand is offering to pay for it, the Keyword face returns: that question is which card to burn, and the live Keywords are what make one of them the wrong answer. Presentation only: which face is showing is derived from the phase and the in-flight gesture, and creates no legal action.
_Avoid_: Full card, tooltip card

**Detail Popup**:
The temporary reading surface for any named HUD object — a Compact Card, a Slot, a phase mark, the Round track, the Escalation gauge, a Hero stat. It carries that object's numbers and complete authored text. Each input opens it its own way: touch presses and holds, a mouse hovers, the keyboard holds `Enter` or `Space`; it dismisses on release or when the pointer leaves. The HUD proper carries names, numbers, and colour; the sentences live here, one gesture away. Card Inspection is the Compact Card case of a Detail Popup.
_Avoid_: Tooltip, card menu, help screen

**Stat Panel**:
The readout a tapped Enemy tile opens — the Boss or a Minion — floated over the board's lower edge. It carries the piece's health gauge and Counter chips; a chip shows its count whenever more than one is held, because a count the player cannot see is a count they cannot spend deliberately. The panel follows the piece rather than the hex and shows the staggered playout values while a Boss Row replays, so it reads as a live gauge; it closes from its own control, a tap on an empty hex, or a session transition, and stays up through ordinary play. Unlike a Detail Popup it persists instead of dismissing on release. Enemy-only since D-065: the Hero's readout is the Hero Frame, and tapping the Hero's tile pulses that frame instead of opening a panel here. Presentation only: it is never a rules surface.
_Avoid_: Tooltip, Detail Popup, HUD gauge, unit frame

**Hero Frame**:
The primary Hero's persistent readout, built to unit-frame anatomy (D-065, ADR 0033): a left-justified vertical stack of the Hero's name, a dominant health bar carrying the Armor overlay, the `Class Resource` as a thinner bar directly beneath it, and the deck and discard counts. The resource bar is unlabelled — its position under the health bar is what names it. Counter chips sit beside the frame rather than inside it, where an MMO puts its buffs, because each is its own authored rule and so its own control. The frame floats over the board's bottom edge without resizing the board, never dismisses, and is the notification dock's floor: transient prompts stack upward from its top edge. A tap on the Hero's tile pulses it rather than opening a Stat Panel; a hold anywhere on it opens one Detail Popup for the whole readout. It is read, never pressed — the `Signature Button` is what takes the press. Built as the party-frame seed: shaped so a second Hero's frame can sit beside it when the multi-Hero model lands, with only the primary Hero's built today. Presentation only: it is never a rules surface.
_Avoid_: Unit frame, HUD gauge, stat bar, portrait

**Signature Button**:
The control that fires a Hero's Signature (D-065, ADR 0033), standing beside the Hero Frame as its own plate. It is on screen if and only if the Signature can be fired right now — it arrives when the fixed Slot's window opens on an earned Charge, and leaves when that Charge is spent or the window turns — so a Signature Button the player can see is always one they can press. It carries readiness and nothing else; the resource it spends is read on the Hero Frame's resource bar, which is what lets the button be absent without hiding the mechanic. Transient by design, so it is not one of the HUD's persistent buttons (ADR 0006).
_Avoid_: Ultimate button, hero power, Action Bar Slot

**Scripted First Turn**:
The guided Round a first-time player meets: it walks prepare, charge, fire in the Quick Window, step out of a telegraph, and fire in the Slow Window, gating input to one control at a time. Its current step is derived from the live Encounter state rather than counted off, so it stays correct when the player wanders, restarts, or time-travels. It runs once, and finishing or skipping it retires it.
_Avoid_: Tutorial mode, onboarding wizard, scripted encounter

**Board Feedback**:
The transient motion the board plays for a resolved batch of actions: a lunge toward what was struck, a flash and floating number on what was hit, a pulse on a Hero who guarded, a glide for a step taken, a flare over a resolved telegraph, a hex catching fire under a Hazard and charring to ash, that ground cooling back to bare oathsteel when the Hazard expires, a marked hex breaking open to give up a Minion, the Boss venting its light and going out when it falls. Every beat of it is derived from Resolution Facts, so the board can never show a blow the Encounter did not resolve.
_Avoid_: Animation state, VFX layer, Board Ambience

**Board Ambience**:
Continuous board motion that carries no rules information and applies uniformly to every piece, such as the idle cycle a piece plays at rest. It is never derived from Resolution Facts and never distinguishes one piece from another, which is what keeps it from being read as a state signal. A piece that stands takes its ambience entirely from its idle sheet, which animates inside the silhouette and leaves the feet on the tile; the bob that raises a body off its cast shadow is reserved for a piece that flies, because that gap between body and shadow is what flight looks like. It yields to Board Feedback for any piece an effect currently owns, and it stops entirely under reduced motion.
_Avoid_: Idle animation, Board Feedback, juice

**Bottom Interaction Zone**:
The thumb-reachable portrait HUD area that contains the Action Bar immediately above the Hand. It is reserved for player input rather than encounter telemetry; the Hero Frame and the `Signature Button` sit above it, over the board's edge, and are not members — the frame is a readout, and the button is transient, so the zone's persistent controls are still the Action Bar's alone (ADR 0006, ADR 0033).
_Avoid_: Footer, toolbar

**Class Resource**:
A Hero-specific resource spent on the Signature: the fixed Slot's earned Charges, displayed on the Hero Frame as pips under the authored `resource_title` (Elian's are Ripostes; Kessa's designed resource is Momentum). Earned only — the standing clause is its sole income — banked across Rounds to the printed cap, and spent whole by the Signature's activation (D-064). The rules vocabulary says Charges; the resource title is presentation. `Guard` is not a Class Resource: it is a Keyword the tank's Charge Modifiers match on.
_Avoid_: Stamina, mana, charge meter

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
The hex adjacent to the Boss on the side the Boss faces. A Shield Wall Hero holds the Guarded Front by standing in it, which is where the Guardian's positional protection and front-line duties apply; it is not a universal safe zone. The board marks it, and marks it only where the Player Hero's Role is Tank: what it is worth to stand there is a Tank Hit answered, so on anyone else's board the same mark would invite a Hero to stand where the Boss is looking in exchange for nothing. The mark is presentation, derived from the Boss's position and facing; it creates no legal action and is not a rules surface.
_Avoid_: Tank lane, front row

**Slot Tension**:
The primary player pressure created by deciding whether to keep charging a slot, fire it now, or replace it. Slot tension is more central to the game than Stamina tension or class-resource tension.
_Avoid_: Hand tension, mana tension

**Tank Hit**:
Boss damage authored as a Targeted Boss Hit and intended to be answered by the Tank through mitigation, interception, or threat control. A Boss Beat's Tank Hit identity is explicit; it is not inferred from generic damage, Hazards, or Minions. Moving out of a board pattern does not evade a Tank Hit: a Tank Hit is aimed at the Tank rather than at whoever is standing in a pattern. Moving out of its **reach** does, when the Beat authors one — Raking Claw reaches `1` hex (D-062), so the answer to it is Armor or a step, and never a change of pattern.
_Avoid_: Single-target damage, front damage

**Targeted Boss Hit**:
Boss damage resolved against the Hero selected by the Beat's explicit Target Selector, rather than against Heroes standing in a board pattern. The selector answers *who*; the Beat's authored reach answers *whether*, so a Targeted Boss Hit is not automatically unanswerable by footwork and is never an unavoidable Raid Hit by default. Mitigation, interception, threat control, or standing outside its reach may answer it. What a Beat may not do is bill the same decision twice: Raking Claw stopped pricing distance in Health when `demand_proximity` began pricing it in Escalation (D-062).
_Avoid_: Dodgeable cone, generic damage

**Avoidable Board Pattern**:
An authored set of board hexes that harms only combatants occupying its resolved geometry. A Hero can answer it by leaving the pattern when timing and movement rules allow. Avoiding an Avoidable Board Pattern does not answer a simultaneous Targeted Boss Hit.
_Avoid_: All boss damage, target selector

**Downed**:
The state of a Hero at `0` health while a rescue is still possible. A Downed Hero remains on its hex as a blocking, non-targetable body and keeps the Counters it holds, because the body is still on the board. Being Downed does not end the Encounter and does not satisfy anything the Party is asked for: a Downed Hero is not selectable by a Boss Beat's Role selector, and does not answer the proximity demand — a body cannot answer a demand. The state lasts until the end of the following Round; a Hero not `Revived` by then becomes `Incapacitated`. Downed requires another living Hero to exist. A Hero reduced to `0` health with no living ally is defeat immediately, because there is nobody who could ever perform the rescue and the alternative is a loss the screen has not admitted yet.
_Avoid_: Dead, eliminated, permanently defeated

**Incapacitated**:
The state of a Hero whose rescue window expired. The body leaves the board and its Counters leave with it; the Hero's hand is discarded and its deck is never consulted again, so the seeded draw order of the Heroes still playing is undisturbed. The Party takes one Escalation for the failed rescue. An Incapacitated Hero is **not removed from play**: each Round its player chooses one of three ally-facing actions, so the person at the table keeps deciding something even though their Hero can no longer fight. This is what keeps a preservation Role from becoming a blame-sink — the price of a failed save is a diminished Hero, never an eliminated player. An Incapacitated Hero cannot be healed, revived, targeted, or restored; the state is terminal for that Encounter.
_Avoid_: Dead, removed, permanently defeated, out

**Revive**:
A universal action available to a living Hero adjacent to a `Downed` ally. Discard one hand card to return that ally to an authored fraction of maximum health, rounded up. The fraction is authored content rather than an engine constant, because it decides how forgiving the whole game is. Healer cards may improve or replace this baseline action. An `Incapacitated` Hero can never be Revived.
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
A collectible party member with a distinct identity, visuals, deck, and raid-scoped evolution. A Hero is first-class authored content in `data/heroes/` — identity, `max_health`, and the printed Signature in one definition — and an Encounter fields one by id, so the same Hero can stand in many fights without being restated in each (ADR 0034). What the fight decides stays on the Encounter: start hex, deck list, Slot count, and whether the Signature is fielded at all.
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
The two-to-four Player Heroes cooperating in an Encounter. A Party is controlled by multiple people when possible. In solo play, simple AI Heroes fill the remaining Roles so the same party-shaped encounter mechanics remain in play. Authored as an Encounter's ordered `party` — one seat per Hero, each naming a Hero from `data/heroes/`, a start hex, its own decklist, and whether that Hero's Signature is fielded (D-069, ADR 0035). A seat's deck is what states that Hero's Role, so two seats sharing one decklist are two seats playing the same Role. One seat is legal: a solo fight is a Party of one rather than a different kind of Encounter. A Boss Beat's `target_selector` picks which seat its blow lands on, and a card may reach a seated ally through `target_type: "ally"`. The Encounter is lost when every seated Hero is `Downed` or `Incapacitated` at once. `Downed`, `Revive`, and `Incapacitated` are live (D-070, ADR 0036).
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

**Restorative**:
A Healer Archetype that undoes landed damage, removes Boss-placed marks, and converts deliberate overhealing into Boss damage. Its skill expression is knowing who is about to be hit before the Boss confirms it.
_Avoid_: White mage, medic class, enchanter

**Enchanter**:
A Healer Archetype that prevents damage before it lands, binding wards and augmentations to named future Beats. Requires the Commitment mechanic; no Hero of this Archetype is designed yet beyond its statement.
_Avoid_: Shield healer, support mage
_Not yet in the engine_

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
