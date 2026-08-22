# Engine Mechanics Extensibility Handoff

## Objective

Expand the current `webgame` rules engine so it supports a substantially wider tactical/co-op design space **without turning the engine into a generic scripting language**.

The current engine is already strong at:

- deterministic `state + action -> state + facts` resolution
- player commands vs trusted system actions
- complete legal-action enumeration
- cards with composable numeric effects
- targeting: `none`, `piece`, `hex`, `ally`, `board_slot`
- damage, healing, Armor, drawing
- push/pull/traversal
- Burst/AOE geometry
- Counters hosted on combatants, hexes, and Slots
- Counter `gate / scale / spend` interactions
- event-driven Counter Readers
- Signature Grants
- damage Keywords
- Boss Programs and Beats
- Minions
- Hazards
- Escalation
- deterministic phase scripts
- replay/scenario support
- runtime-validated player commands

Do **not** replace these systems.

The goal is to fill the remaining primitive-level gaps so future mechanics inspired by games such as **Spirit Island, Sentinels of the Multiverse, Gloomhaven, and Into the Breach** can usually be expressed by composing engine concepts rather than adding one-off card code.

---

# Design Principle

The engine should provide a small set of powerful rules primitives.

Content should compose those primitives.

Engineering should only be necessary when game design introduces a genuinely new grammatical concept.

Avoid trying to make arbitrary English card text executable.

In particular, do **not** introduce:

- a generic effect DSL
- arbitrary expression evaluation
- JSON programming
- an ECS rewrite
- a generic event bus detached from the existing registry
- arbitrary property paths
- arbitrary boolean expression trees
- a Magic-style stack before the game needs one

Prefer closed vocabularies, exhaustive TypeScript unions, registries, catalog validation, and explicit engine implementations.

---

# 1. First-Class Selectors / Queries

## Problem

Target selection is currently strongly tied to a small set of targeting families.

That works well for existing cards, but future mechanics will increasingly ask questions such as:

- nearest Enemy
- furthest Hero
- all adjacent allies
- all Enemies within 2
- all Minions on burning ground
- Hero with the lowest Health
- Enemy with the highest Health
- every occupied hex in a region
- every piece carrying a particular Counter
- every hex adjacent to the Boss
- first Hero in seat order satisfying a condition
- up to 2 Enemies
- another Hero
- every target except the source

These should not each become a new `target_type`.

## Desired capability

Introduce a **small, closed selector/query vocabulary** that can derive entities or spaces from authoritative state.

Potential conceptual primitives:

```text
subject:
  self
  selected
  boss
  party
  enemies
  minions
  heroes
  board_spaces

filters:
  living
  downed
  within_range
  adjacent
  has_counter
  has_keyword
  occupied
  empty
  team

ordering:
  nearest
  furthest
  lowest_health
  highest_health
  seat_order
  board_order

cardinality:
  one
  all
  up_to_n
```

This is illustrative, not a required schema.

## Critical constraint

Do not build arbitrary predicates.

A selector should be a closed engine-supported query.

If a designer asks for a selector the engine does not understand, adding that selector is an explicit engine change.

## Architectural goal

There should eventually be one authoritative answer to questions like:

```ts
selectEntities(...)
selectHexes(...)
```

Legality, targeting previews, Boss AI, Minion AI, card effects, and simulation should consume the same query semantics rather than implementing their own versions.

## Acceptance direction

Demonstrate that the query system can express at least:

1. nearest living Hero
2. all adjacent Enemies
3. all Enemies within N hexes
4. lowest-Health living ally
5. entities carrying Counter X
6. empty hexes within N
7. deterministic tie-breaking

Determinism is mandatory.

---

# 2. Persistent Modifiers / Ongoing Rules

## Problem

Counters currently model a useful class of persistent state, especially event-triggered numeric effects.

They should remain intentionally simple markers interpreted by Readers.

But not every persistent rule is naturally a Counter.

Future mechanics may need:

- this Hero has +1 range this Round
- this Enemy cannot move
- this hex counts as hazardous terrain
- attacks against this target gain a Keyword
- this Hero may fire twice this window
- Minions spawned here have +1 Health
- while this card remains active, adjacent allies gain Armor
- until end of Round, Boss damage is reduced
- the next card you fire costs one fewer resource
- this target cannot be healed
- treat this terrain as another terrain type
- this entity is immune to forced movement

Trying to encode every one of these as a Counter Reader will eventually distort the Counter system.

## Desired capability

Introduce a first-class concept for **persistent rules/modifiers**.

A modifier should have at least:

```text
source
scope/subject
lifetime
rule being modified
value or operation
```

Possible lifetimes:

```text
until_end_of_window
until_end_of_round
for_n_rounds
while_source_exists
until_consumed
permanent
```

Possible initial modifier families might include:

```text
damage
armor
healing
range
movement
targetability
action availability
keywords
terrain properties
```

Do not implement all possible modifier families immediately.

Build the infrastructure and prove it with a deliberately small useful subset.

## Important distinction

Counters answer:

> What named marker is stored here, and what reacts to it?

Persistent modifiers answer:

> What rule is temporarily different while this thing exists?

Do not collapse those concepts.

## Acceptance direction

Prove at least:

1. temporary range modification
2. temporary movement modification
3. temporary incoming/outgoing damage modification
4. modifier expiration at a deterministic boundary
5. modifier removal when its source disappears
6. multiple modifiers with explicitly defined stacking/order semantics

---

# 3. Richer Board-Space State

## Problem

The board already supports geometry, occupancy, Hazards, hex Counters, movement, traversal, and spatial patterns.

That is a strong foundation.

Future tactical designs will probably need spaces themselves to become more semantically meaningful.

Examples:

- terrain types
- destructible spaces
- objectives
- control zones
- spawn zones
- impassable terrain
- difficult terrain
- elevation
- temporary terrain transformations
- ownership/control
- interactable locations
- environmental tags
- spaces that modify entities standing on them

## Desired capability

Make board spaces capable of carrying explicit authored properties rather than requiring every environmental mechanic to become a special Hazard.

Potential shape:

```text
hex:
  coords
  terrain
  tags
  state
```

Examples of tags/state:

```text
forest
water
lava
high_ground
objective
spawn
destroyed
fortified
controlled_by_party
```

Do not assume all of these are needed.

The important capability is that selectors, movement rules, effects, and events can ask authoritative questions about spaces.

## Integration

The richer space model should work with the selector/query system.

Examples:

```text
all forest hexes within 2
nearest empty spawn hex
Enemies standing on hazardous terrain
all spaces adjacent to an objective
```

Existing Hazards and hex Counters should continue working.

---

# 4. Generalized Effect Primitives — Carefully

## Problem

Cards currently expose a useful but relatively fixed collection of effects.

As design expands, we will need more effects.

Do not respond by creating an arbitrary effect interpreter.

## Desired direction

Continue using explicit system actions for actual mutations.

Reusable mechanics should become small first-class action/effect primitives where appropriate.

Likely future candidates include:

```text
gain/remove resource
place/remove Counter
apply/remove modifier
spawn entity
remove entity
move/traverse entity
modify terrain
draw/discard
heal
damage
change facing
grant Charge
spend Charge
```

Some already exist.

Consolidate rather than duplicate.

## Rule

If several unrelated mechanics need the same state mutation, that mutation probably deserves a first-class engine action.

If only one highly specific mechanic needs something unusual, explicit engine code may be better.

---

# 5. Effect Conditions

## Problem

Future mechanics will need conditional effects:

> If the target has Burn, deal +2.

> If no damage was dealt, gain Armor.

> If standing adjacent to an ally, draw a card.

> If this kills a Minion, move 1.

We need some conditionality without accidentally inventing a programming language.

## Desired capability

Prefer **closed named gates/predicates**, extending the philosophy already used by Signature Grants.

Examples might eventually include:

```text
effect_landed
target_defeated
source_damaged
target_has_counter
source_has_counter
adjacent_to_ally
standing_on_tagged_space
health_below_threshold
```

Only add predicates demanded by real content.

Do not support arbitrary nested:

```text
AND / OR / NOT / comparisons / property paths
```

unless the game's actual design eventually proves that such an interpreter is warranted.

---

# 6. Better Event Coverage

## Problem

The existing `EVENT_REGISTRY` is a strong extension seam.

Continue expanding it as new mechanics require observable moments.

Potential future events:

```text
entity_moved
entity_spawned
entity_removed
card_loaded
card_charged
card_drawn
card_discarded
hero_healed
counter_placed
modifier_applied
phase_started
phase_ended
enemy_defeated
hero_revived
```

Do not add these speculatively.

Add events when actual mechanics need to subscribe to them.

## Rule

Every event should have:

- one authoritative raise location
- explicit payload
- deterministic subscriber ordering
- explicit supported subscriber types
- catalog validation preventing impossible subscriptions

Preserve the current registry philosophy.

---

# 7. Resources as a First-Class Primitive

## Question to investigate

Charges, Armor, Health, Escalation, Counters, and hand cards currently cover most resource behavior.

Future characters may introduce things like:

- Energy
- Momentum
- Focus
- Spirit
- Rage
- Ammo
- Combo
- personal meters

Do not immediately create a generic resource framework.

First determine whether future character resources can continue being expressed as:

- Charges
- Counters
- cards
- Hero fields with explicit mechanics

If multiple upcoming designs independently require arbitrary bounded numeric resources, introduce a small first-class resource primitive.

Potential requirements:

```text
id
owner
current
min
max
reset rule
```

Resources should not themselves contain arbitrary behavior.

Events/readers/modifiers should interpret them.

---

# 8. Multi-Entity / Summoned Entity Generality

## Desired capability

The engine should comfortably support more than:

```text
Hero
Boss
Minion
```

Potential future entities:

- summons
- companions
- turrets
- objectives
- neutral units
- destructible objects
- temporary clones

Avoid introducing separate movement/damage systems for each.

Where possible, entities should share:

- position
- team/allegiance
- health if applicable
- movement
- targeting
- Counters
- events

Specific behavior can remain content- or engine-defined.

Do not force every board object to pretend to be a combatant if that makes the model worse.

---

# 9. Delayed / Scheduled Effects

## Missing design space

Support mechanics such as:

> At the start of next Round, explode.

> After two Rounds, remove this terrain.

> At the end of the Slow window, heal 2.

> The next time this Hero takes damage, prevent it.

Some of this can already be represented by Counters and existing duration systems.

Determine whether those mechanisms are sufficient.

If not, consider a small first-class **scheduled consequence** concept tied to explicit engine boundaries/events.

Requirements:

- deterministic
- replayable
- visible in state
- cancellable if required
- no hidden wall-clock timers

Never use real time for authoritative gameplay timing.

---

# 10. Rule Replacement / Prevention

This is important for Sentinels/Spirit-Island-style design space.

Eventually we may need rules such as:

> Prevent the next damage.

> Instead of moving, teleport.

> Damage cannot reduce this target below 1.

> When this would be destroyed, transform it instead.

> Ignore the first Counter placed each Round.

These are harder than ordinary additive modifiers.

Before implementing a general replacement system, identify real game mechanics requiring it.

Likely conceptual distinction:

```text
modifier:
  change a value/rule

prevention:
  stop something

replacement:
  substitute consequence A with consequence B
```

This should remain deferred until concrete content demands it because replacement effects introduce significant ordering questions.

---

# 11. Terrain/Entity Transformation

Potential future mechanics:

- Boss changes phase/form
- Minion transforms
- Hero stance changes
- hex becomes lava
- objective becomes destroyed
- summon upgrades
- card flips to another side

Prefer explicit state/content identity transitions rather than deleting and recreating objects where identity matters.

This becomes particularly useful for Spirit-Island-like environmental mechanics and multi-stage Bosses.

---

# 12. Resumable Resolution / Player Choices

## Important: defer this until required

This is the largest missing primitive.

Current fired-card resolution is intentionally atomic.

That becomes insufficient for:

> Choose one of three effects.

> Choose a target, resolve something, then choose another target.

> Choose up to three different Enemies.

> After seeing the result, decide whether to spend a resource.

> Another player may respond.

> Interrupt this attack.

> Redirect the attack.

> Players resolve simultaneous choices.

These mechanics require resolution to stop and wait for another player command.

## Eventual architecture

When required, introduce something conceptually like:

```text
resolution state
pending choice
allowed responses
continuation
```

The encounter state must contain enough information to serialize, replay, reconnect, and resume the unresolved action.

The legal-action API should then enumerate the choices valid for the pending decision.

## Do not implement yet

Do not add a generic stack, priority system, continuation interpreter, or reaction engine until at least one real mechanic requires it.

When that happens, design the system around the actual mechanic and verify it generalizes to:

1. choose-one
2. sequential target selection
3. optional resource spending
4. reactions/intercepts

This should be a dedicated ADR.

---

# 13. Explicit Reaction / Interrupt Windows

This is related to resumable resolution but conceptually distinct.

Potential future mechanics:

> When an ally would take damage, you may intercept.

> After an Enemy moves, fire this card.

> Before the Boss attacks, spend Guard.

> When a Minion dies, another Hero may react.

Do not fake these with automatic event subscribers if a **player decision** is involved.

Automatic reactions belong in the existing event system.

Player-controlled reactions require resumable resolution.

---

# 14. Scenario / Objective Rules

Future encounters may not simply be:

```text
kill Boss before Party/clock collapses
```

Potential objectives:

- survive N rounds
- protect an entity
- escort something
- control locations
- destroy several objectives
- prevent a ritual
- collect resources
- escape
- defeat multiple Boss phases
- branching victory conditions

Eventually victory/defeat evaluation should support explicit encounter objectives rather than continually expanding `checkResolution()`.

Do not generalize prematurely, but keep this in mind when the first non-Boss-kill encounter enters production.

---

# 15. Information Visibility

Future mechanics may distinguish:

- public information
- hidden deck information
- revealed cards
- private player choices
- telegraphed Boss information

This becomes particularly important for multiplayer.

Do not mix information visibility into core resolution semantics.

Authoritative state may know something a client projection is not allowed to expose.

If hidden information becomes part of the design, introduce explicit state projection/redaction rather than weakening the deterministic engine.

---

# Priority

Recommended implementation order:

## P0 — Selector/query foundation

Highest immediate design-space return.

Build a deterministic, closed selector vocabulary shared by engine consumers.

## P1 — Persistent modifiers

Introduce temporary/ongoing rule changes without abusing Counters.

Prove with a small set of real mechanics.

## P2 — Rich board-space semantics

Give terrain/objective/environmental mechanics a clean home and integrate them with selectors.

## P3 — Expand events only as required

Use actual new content to drive additional registry rows.

## P4 — Investigate generalized resources

Only implement if multiple real character designs independently require them.

## P5 — Delayed effects / objectives / transformations

Introduce incrementally when concrete designs demand them.

## DEFER — Resumable resolution and reactions

This is the next major architectural boundary.

Do it deliberately when actual game design crosses that boundary.

---

# Architectural Invariants

All work should preserve these properties:

1. **Determinism**
   - Same initial state + commands + RNG state produces the same result.

2. **Replayability**
   - New mechanics must remain reconstructable from player commands and authoritative content.

3. **One mutation funnel**
   - State changes continue to occur through explicit engine actions/resolution seams.

4. **One legality authority**
   - UI, AI, selectors, previews, and resolution must not grow competing rule implementations.

5. **Complete legal action enumeration**
   - AI/simulation consumers must be able to observe every strategically distinct legal player decision.

6. **Facts explain consequences**
   - Mechanically important state transitions remain visible in the ordered fact stream.

7. **Closed authored vocabularies**
   - Prefer enums/unions/registries whose consumers are exhaustively guarded.

8. **Catalog validation**
   - Invalid or unsupported mechanic combinations should fail at content load, not during gameplay.

9. **No silent partial support**
   - Adding a target family, event, Beat kind, modifier family, selector, etc. must force every required engine consumer to make an explicit decision.

10. **Content is not code**
    - Resist arbitrary expressions and generic scripting.

---

# Target End State

The engine should eventually have these major primitives:

```text
Entities
Board Spaces
Actions / Effects
Selectors / Queries
Counters
Persistent Modifiers
Keywords
Resources
Events
Timing / Lifetimes
Conditions / Gates
Objectives
Choices
```

The first eleven should remain deterministic and mostly automatic.

`Choices` is special: once resolution requires new player input, it becomes a resumable state-machine problem and should be treated as its own architectural milestone.

The goal is **not** to support every tabletop mechanic ever invented.

The goal is that when a designer proposes a mechanic, the first question becomes:

> "Which existing primitives compose into this?"

rather than:

> "Where do we hardcode this?"

