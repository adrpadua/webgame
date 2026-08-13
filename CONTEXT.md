# Raid Card Tactics

A cooperative fantasy boss battler on a hex grid. The core domain is a scripted raid encounter where players coordinate simultaneous action windows against a visible boss timeline before an enrage timer expires.

## Language

**Encounter**:
A single boss fight from setup through victory, defeat, or enrage. An encounter is the top-level unit that owns the boss script, the round count, and the board state.
_Avoid_: Match, battle, combat

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

**Enemy**:
A hostile combatant in an Encounter. The Boss and every Minion are Enemies.
_Avoid_: Hostile target, foe

**Status Effect**:
A temporary rule attached to a combatant that responds to an explicit trigger, such as the start of a Round, taking damage, or firing a Slot.
_Avoid_: Passive, invisible buff

**Hazard**:
A temporary board effect attached to one or more hexes. A Hazard may constrain voluntary movement or respond when a combatant enters its hex.
_Avoid_: Surprise damage, ambient effect

**Boss**:
The primary Enemy that owns the Boss Timeline and is the encounter's victory target. A Boss is never a Minion.
_Avoid_: Enemy, boss enemy

**Minion**:
A non-Boss Enemy placed on the hex board by an Encounter. A Minion may have its own health, facing, and rules, but it does not own the Boss Timeline.
_Avoid_: Enemy, add, trash mob

**Instant Row**:
The boss actions that resolve before the party's `Quick Window`. These are urgent mechanics that are already live this round.
_Avoid_: Fast row, active row

**Incoming Row**:
The boss actions that resolve before the party's `Slow Window`. These are telegraphed mechanics that the party can plan around.
_Avoid_: Future row, pending row

**Quick Window**:
The shared simultaneous player phase after the `Instant Row` resolves. It is for basics, repositioning, setup, and low-cost actions.
_Avoid_: Fast phase, reaction phase

**Slow Window**:
The shared simultaneous player phase after the `Incoming Row` resolves. It is for spenders, signature abilities, and larger tactical commitments.
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

**Hand**:
The player's currently available cards, presented as three equal compact cards in the bottom interaction zone of the portrait combat HUD.
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

**Slot Tension**:
The primary player pressure created by deciding whether to keep charging a slot, fire it now, or replace it. Slot tension is more central to the game than Stamina tension or class-resource tension.
_Avoid_: Hand tension, mana tension

**Tank Hit**:
Boss damage intended to be answered by the tank through facing, interception, mitigation, or threat control.
_Avoid_: Single-target damage, front damage

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

**Role**:
A Hero's party responsibility, such as Tank, Healer, or Damage.
_Avoid_: Class, job

**Archetype**:
A Hero's mechanical identity that determines how its cards and rewards express its Role.
_Avoid_: Role, class

**Threat**:
A persistent per-Hero value that normally determines which valid Hero a boss targets. Damage dealt to the boss gains equal Threat unless an effect says otherwise.
_Avoid_: Aggro, hate

**Taunt**:
An effect that sets its user's Threat to one above the current highest Threat value.
_Avoid_: Forced target, provoke

**Target Selector**:
The explicit rule on a Boss Timeline action that determines its target, such as Highest Threat, Tank, Lowest Health, Farthest, or All.
_Avoid_: Targeting AI, target logic

**Reward Category**:
The visible family of a route reward, such as Defense, Mobility, Damage, Resource, Utility, or Boss Tech. Its concrete reward is Hero-specific.
_Avoid_: Loot type, reward rarity

**Boon**:
A raid-long passive reward assigned to one Hero. A Boon may affect that Hero or support the whole party.
_Avoid_: Relic, artifact
