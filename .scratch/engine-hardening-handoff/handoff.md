# Rules Engine Architecture Handoff

## Objective

Review and strengthen the current TypeScript rules engine in `web/src/engine` without rewriting its core architecture.

The engine already has a strong foundation. Preserve the deterministic reducer model, authoritative rules state, action/fact stream, centralized phase progression, and single legality authority.

The goal is to make the engine safer and easier to extend as the card pool, hero roster, multiplayer rules, AI/simulation tooling, and encounter complexity grow.

## Current Architecture

The living rules implementation is the TypeScript engine under:

`web/src/engine`

Its primary public seam is approximately:

```ts
createEncounterState(...)
resolve(catalog, state, action)
advancePhase(catalog, state)
legality(catalog, state, action)
legalActions(catalog, state, heroId)
```

The Godot implementation is frozen/reference material. Do not redesign against the old Godot engine.

Important existing properties to preserve:

- `EncounterState` is authoritative.
- `resolve()` returns a new state rather than mutating the caller's snapshot.
- Rules resolution produces an ordered fact stream.
- Generated consequences are represented as actions.
- `legality()` is the authoritative pre-resolution predicate.
- Resolution and UI/action discovery should derive from the same legality rules.
- `advancePhase()` owns phase and round progression.
- RNG and program sequencing are deterministic/replayable.
- Physical card copies have instance identity.
- Board state belongs to the rules engine rather than presentation.
- Encounter records/scenarios/replay should remain deterministic.

## Assessment

Do **not** rewrite the engine.

The underlying architecture is good and is suitable for eventually supporting:

- larger card pools
- multiple heroes
- multiplayer/server authority
- bots
- automated encounter simulations
- replay
- encounter records
- balance sweeps
- tutorial/hint systems

The work should focus on tightening abstractions that are beginning to strain as the rules vocabulary grows.

---

## Priority 1 — Separate Player Commands From System Consequences

Currently `EncounterActionInput` contains both player-authored intentions and engine-generated consequences.

Examples of player commands include:

```ts
load_slot
charge_slot
fire_slot
move_hero
revive_ally
diminished_action
```

Examples of system consequences include:

```ts
damage
apply_hazard
spawn_minion
detonate_minion
place_counter
gain_escalation
round_start
advance_phase
incapacitate_hero
end_of_clock
```

These should remain compatible with the existing resolver, but the type system should distinguish them.

A reasonable direction is:

```ts
type PlayerCommand =
  | LoadSlotCommand
  | ChargeSlotCommand
  | FireSlotCommand
  | MoveHeroCommand
  | ReviveAllyCommand
  | DiminishedActionCommand
  // ...

type SystemAction =
  | DamageAction
  | ApplyHazardAction
  | SpawnMinionAction
  | GainEscalationAction
  // ...

type EncounterAction = PlayerCommand | SystemAction
```

Do not over-engineer this into two independent engines.

The important invariant is:

> External/player input must be distinguishable from trusted engine-generated consequences.

This matters especially for eventual server authority. A client must never be able to submit an arbitrary `damage` action simply because `damage` belongs to the same unrestricted input union as `fire_slot`.

### Acceptance criteria

- Player-submittable commands have an explicit type.
- Engine-generated/system actions have an explicit type.
- `resolve()` can still process the unified internal action vocabulary.
- Existing deterministic replay remains intact.
- No behavior changes unless required to fix an existing inconsistency.
- Tests prove arbitrary system consequences are not treated as ordinary player commands at the external command seam.

---

## Priority 2 — Restore `legalActions()` as a Complete Player Action Space

`legalActions()` currently enumerates core Slot and movement actions, but the player command vocabulary has grown.

In particular, review support for actions such as:

```ts
revive_ally
diminished_action
```

The desired invariant is:

> `legalActions(catalog, state, heroId)` enumerates every legal player command currently available to that Hero.

This invariant is strategically important.

It allows the same API to support:

- UI affordances
- AI
- bots
- encounter simulation
- hint systems
- tutorials
- automated rules testing
- accessibility features

Do not make callers separately know that some player actions come from `legalActions()` while others require unrelated special-case discovery APIs unless there is a compelling architectural reason.

### Acceptance criteria

Add tests proving:

```text
for every action in legalActions(...):
    legality(..., action).legal === true
```

Also add representative states proving every player command category appears when legal and disappears when illegal.

Ideally add an engine-level contract test preventing future player command kinds from being added without corresponding action-space consideration.

---

## Priority 3 — Modularize Legality Without Splitting Its Authority

Keep:

```ts
legality(catalog, state, action)
```

as the single public legality authority.

Do **not** create multiple competing rule predicates.

However, `legality.ts` is accumulating responsibility for:

- Slot loading
- charging
- Signature Slot exceptions
- firing windows
- targeting
- Boss range
- Minion range
- ally targeting
- hex targeting
- Slot targeting
- displacement
- Counter gates
- revival
- diminished actions
- movement
- Stamina
- Boss/system validation

Refactor the implementation into focused validators while retaining one public entry point.

For example:

```text
engine/
  legality/
    loadSlot.ts
    chargeSlot.ts
    fireSlot.ts
    movement.ts
    revive.ts
    diminished.ts
    index.ts
```

or another structure appropriate to the codebase.

The exact directory structure is less important than preserving this invariant:

```text
UI ───────┐
AI ───────┤
Resolver ─┼──> legality(...)
Hints ────┤
Tests ────┘
```

Nobody should independently reimplement gameplay legality.

---

## Priority 4 — Audit `fire_slot` Before Expanding It Further

`fire_slot` currently supports a growing number of concepts, including:

- implicit Boss targeting
- Minion targets
- Enemy targets
- ally targets
- hex targets
- board Slot targets
- direct damage
- Boss damage
- healing
- Armor
- Burst
- push/pull
- Counter placement
- Counter gates
- Counter spending
- Overflow
- Signature Charge behavior

Do **not** immediately replace this with a generic effect scripting language.

Instead, perform an architectural audit.

Determine where the current representation stops scaling cleanly.

Future cards may require interactions like:

```text
Choose two adjacent hexes.

Move an ally, then attack an Enemy adjacent to the destination.

Rotate an Enemy, then damage pieces behind it.

Repeat an effect based on Counters spent.

Choose one of several effects.

Select multiple targets in sequence.
```

The likely long-term direction is separating:

```text
Card
 ├── targeting specification
 ├── cost specification
 ├── effect sequence
 └── triggers/readers
```

from the simple command:

```text
fire prepared card
```

But do not build a speculative DSL unless current content actually justifies it.

For this pass:

1. document current `fire_slot` responsibilities,
2. identify concrete extension pressure,
3. extract obviously reusable resolution concepts where beneficial,
4. recommend the next seam,
5. avoid a broad rewrite.

---

## Priority 5 — Formalize Atomic Resolution

The resolver already has special handling so a fired card's generated consequences can finish before terminal encounter resolution suppresses sibling effects.

Formalize the underlying rule.

Recommended invariant:

> Once an action begins resolving, its complete authored consequence tree resolves in deterministic order before terminal encounter state is evaluated, except where a rule explicitly defines an immediate terminal boundary.

Verify this against cases such as:

```text
Card fires
→ Minion dies
→ Boss takes lethal damage
→ Counter trigger resolves
→ draw/secondary effect resolves
→ victory is finalized
```

Also consider pathological cases:

```text
Boss reaches 0
Hero reaches 0 in same consequence tree
Minion detonates
Counter trigger fires
Phase/Encounter terminal condition becomes true
```

There should be an explicit, tested answer for ordering and simultaneous victory/defeat behavior.

Do not rely on incidental recursion structure as the specification.

---

## Priority 6 — Preserve the Phase Engine

Do not generalize the phase system merely to make it abstract.

The current encounter rhythm:

```text
Loadout
→ Boss Instant
→ Quick
→ Boss Incoming
→ Slow
→ Round boundary
```

is game design, not accidental implementation detail.

`advancePhase()` should remain the authoritative owner of phase progression and system sequencing.

Preserve explicit ordering for:

- Boss rows
- Minion detonation
- Minion movement/attacks
- cleanup
- telegraph refresh
- Escalation
- rescue expiration
- hand refill
- phase break
- round transition

Prefer explicit readable sequencing over a generic lifecycle/event framework that obscures rules order.

---

## Priority 7 — Protect Determinism and Simulation

Every architectural change must preserve the ability to run encounters headlessly and deterministically.

Given the same:

```text
content
initial configuration
seed
ordered player commands
```

the engine should produce the same:

```text
facts
state transitions
RNG progression
outcome
final state fingerprint
```

This is a hard requirement.

The engine should remain suitable for future large-scale balance simulation, e.g.:

```text
Encounter + party composition + policy
              ↓
        thousands of runs
              ↓
win rate
round distribution
damage sources
unanswered demands
escalation causes
card usage
down/revive rates
```

Avoid introducing presentation state, timestamps, global randomness, or nondeterministic iteration into the rules layer.

---

## Testing Expectations

Before refactoring, identify existing behavioral tests covering the affected seams.

Add focused contract tests for at least:

1. `resolve()` does not mutate its input state.
2. identical state + action + RNG state produces identical output.
3. every enumerated player action passes `legality()`.
4. representative legal player commands are actually enumerated.
5. illegal player commands are not enumerated.
6. generated system actions remain deterministic.
7. player command and system action types cannot accidentally cross the external command boundary.
8. complete consequence trees preserve deterministic ordering.
9. terminal-state handling does not suppress valid sibling consequences.
10. replay/state fingerprints remain stable for unchanged scenarios.

Do not update snapshots or expected fingerprints blindly. If a fingerprint changes, explain exactly which intentional semantic change caused it.

---

## Non-Goals

Do **not**:

- rewrite the reducer architecture,
- replace TypeScript with another engine,
- resurrect the Godot rules implementation,
- move rules into UI components,
- create a generic ECS,
- create a generic event bus merely for abstraction,
- build a speculative card scripting language,
- remove physical card-instance identity,
- make phase sequencing data-driven just because it can be,
- sacrifice replay compatibility without a documented reason.

---

## Desired End State

The architecture should move toward:

```text
                  Encounter Engine
                         │
          ┌──────────────┴──────────────┐
          │                             │
    Player Commands              System Actions
          │                             │
       legality                   resolution
          │                             │
          └──────────── resolve ────────┘
                         │
                  ordered facts
                         │
           ┌─────────────┼─────────────┐
           │             │             │
          UI           Replay        AI/Sim
```

With these invariants:

1. `EncounterState` is authoritative.
2. `resolve()` is deterministic.
3. Player commands are distinguishable from system consequences.
4. `legality()` is the single legality authority.
5. `legalActions()` represents the complete legal player action space.
6. Every mutation produces an observable rules fact/action.
7. Phase ordering remains explicit.
8. UI contains no independent gameplay rules.
9. Replay remains deterministic.
10. New card mechanics can be added without turning one resolver branch into an unmaintainable rules interpreter.

## Execution Approach

Start by inspecting the current engine and tests rather than immediately editing.

Then:

1. map the existing command/action taxonomy,
2. identify every externally player-submittable action,
3. audit `legalActions()` completeness,
4. establish/extend contract tests,
5. introduce the command/system distinction with minimal behavioral change,
6. modularize legality while preserving the public seam,
7. audit `fire_slot`,
8. formalize atomic resolution semantics,
9. run the full engine test suite,
10. report any remaining architectural pressure rather than hiding it behind speculative abstractions.

Prefer small, reviewable changes with behavioral tests over a large architectural rewrite.