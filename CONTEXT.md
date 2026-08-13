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
A slot whose top card remains in place across rounds until it is fired, replaced, or removed by an effect. Firing a slot consumes its charge stack but does not automatically clear the top card.
_Avoid_: Temporary slot, one-shot slot

**Charge Stack**:
The cards tucked under a slot to enhance the slotted ability. Charged cards modify the top card rather than acting as separate abilities.
_Avoid_: Discard pile, combo pile

**Top Card**:
The visible card occupying a slot and defining that slot's actual ability. The top card determines range, charge cap, timing, and effect text.
_Avoid_: Active card, lead card

**Tempo**:
The generic tactical budget used for movement and basic actions. Tempo is distinct from class-specific resources.
_Avoid_: Energy, mana, AP

**Class Resource**:
A role-specific resource spent on signature actions. For the tank, this is currently `Guard`.
_Avoid_: Tempo, charge

**Slot Tension**:
The primary player pressure created by deciding whether to keep charging a slot, fire it now, or replace it. Slot tension is more central to the game than tempo tension or class-resource tension.
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
