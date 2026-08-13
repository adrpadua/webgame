# Raid Card Tactics

A cooperative fantasy boss battler on a hex grid. The core domain is a scripted raid encounter where players coordinate simultaneous action windows against a visible boss timeline before an enrage timer expires.

## Language

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
One full cycle of boss resolution and player response. A round advances the enrage timer by exactly one.
_Avoid_: Turn, tick

**Enrage Timer**:
The round limit for an encounter. When the timer reaches its limit, the boss wins or enters an unwinnable state.
_Avoid_: Timeout, clock

**Encounter Clock**:
The boss-specific round budget for an encounter, usually eight rounds before modifiers. Player count, difficulty, or boss rules may adjust the encounter clock.
_Avoid_: Turn cap, hard timer

**End-of-Clock Behavior**:
The boss-specific rule that defines what happens when the encounter clock runs out. Different bosses may lose the party immediately, trigger a final enrage round, or enter another authored failure state.
_Avoid_: Global enrage rule, overtime

**Boss Timeline**:
The visible sequence of boss actions arranged into the `Instant` row and the `Incoming` row. The boss timeline is mostly scripted rather than random.
_Avoid_: Deck, queue, stack

**Boss Program**:
The authored pair of ordered Instant and Incoming rows used by the Boss for one Round. An Encounter may sequence or loop multiple Boss Programs.
_Avoid_: Boss card, turn script

**Boss Beat**:
One ordered authored action inside a Boss Program row. A Boss Beat states its visible counterplay and all Resources needed by its resolution, such as a Hazard or Minion.
_Avoid_: Event, command, hidden trigger

**Encounter Briefing**:
The pre-fight reference that shows a Boss's possible moves, each move's pattern and counterplay, and phase themes. It does not reveal exact beat order beyond the first Round.
_Avoid_: Full script, surprise-only tutorial

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
A temporary rule attached to a combatant that responds to an explicit trigger, such as the start of a Round, taking damage, or firing a Slot.
_Avoid_: Passive, invisible buff

**Riposte Ready**:
A non-stacking, non-refreshing Aegis Guardian Status Effect. When a Boss Tank Hit resolves against Captain Elian Voss while he occupies the Guarded Front and causes `0` Health loss, grant Riposte Ready if he does not already have it. It expires at the end of the first Quick Window after that qualifying hit, whether the hit occurred in an Instant Row or an Incoming Row. A legal Shield Slam consumes Riposte Ready and deals `2` additional Boss damage. The effect must show its qualifying trigger, expiry, and consumption; it is not a general posture category or a resource meter.
_Avoid_: Awakening, stacking buff, generic stance

**Hazard**:
A temporary board effect attached to one or more hexes. A Hazard may constrain voluntary movement or respond when a combatant enters its hex.
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
Replacing a Top Card is a free beginning-of-Round action, before new charges are committed. Replacing a Slot discards its old Top Card and every card in its existing Charge Stack, then moves the chosen hand card into the Slot at `0 Charge`.
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
The player's currently available cards, presented as four compact cards in the bottom interaction zone of the portrait combat HUD. Four is the normal end-of-Round refill target, not a hard maximum.
_Avoid_: Hand row, card tray

**Compact Card**:
A hand-sized card that exposes only its name, timing, and Charge Value for rapid scanning. It is not the canonical full-card reading surface.
_Avoid_: Full card, tooltip card

**Card Inspection**:
The temporary full-card view shown while a player holds a Compact Card. It contains the card's artwork and complete rules text, then dismisses on release or an outside tap.
_Avoid_: Tooltip, card menu

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
The Boss-facing adjacent hex directly in front of a Shield Wall Hero. The Guardian's positional protection and front-line duties use this hex; it is not a universal safe zone.
_Avoid_: Tank lane, front row

**Slot Tension**:
The primary player pressure created by deciding whether to keep charging a slot, fire it now, or replace it. Slot tension is more central to the game than Stamina tension or class-resource tension.
_Avoid_: Hand tension, mana tension

**Tank Hit**:
Boss damage authored as a Tank Hit and intended to be answered by the Tank through facing, interception, mitigation, or threat control. A Boss Beat's Tank Hit identity is explicit; it is not inferred from generic damage, Hazards, or Minions.
_Avoid_: Single-target damage, front damage

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

**Taunt**:
An effect that sets its user's Threat to one above the current highest Threat value.
_Avoid_: Forced target, provoke

**Target Selector**:
The explicit visible rule on a Boss Timeline action that determines its target, such as Highest Threat, a specific Role, Lowest Health, Nearest, Farthest, or All. Its predicted target is highlighted before resolution. If a selected Role is absent or defeated, target the nearest living Hero instead. Resolve selector ties by highest Threat, then the public Party resolution order.
_Avoid_: Targeting AI, target logic

**Reward Category**:
The visible family of a route reward, such as Defense, Mobility, Damage, Resource, Utility, or Boss Tech. Its concrete reward is Hero-specific.
_Avoid_: Loot type, reward rarity

**Boon**:
A raid-long passive reward assigned to one Hero. A Boon may affect that Hero or support the whole party.
_Avoid_: Relic, artifact
