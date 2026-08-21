# Rules Engine Follow-up Handoff

## Objective

Follow up the engine-hardening work merged through:

- [PR #142 — Declare the player command space](https://github.com/adrpadua/webgame/pull/142)
- [PR #145 — Formalize terminal-state evaluation](https://github.com/adrpadua/webgame/pull/145)

Preserve the existing deterministic reducer architecture. Fix the remaining action-enumeration defect, tighten the contracts exposed by the new command boundary, and add narrowly targeted terminal-ordering coverage. Do not rewrite the engine or introduce a speculative card-effect DSL.

## Repository and Verified Baseline

- Repository: `adrpadua/webgame`
- Local checkout: `/Users/adrpadua/dev/webgame`
- Review target: `origin/main`
- Reviewed commit: `ea7d40cff5dc86569793969e4cc9f8c3694f0d35`
- Active rules implementation: `web/src/engine`
- The Godot rules implementation is reference/frozen material, not the target.

The focused suites were rerun against the fetched `main` snapshot:

```text
src/engine/commandSpace.test.ts  5 passed
src/engine/terminal.test.ts      4 passed
Total                            9 passed
```

GitHub reports no attached checks for either PR. The larger `597`/`610` test counts, `verify:local`, and mutation-audit results are recorded in the PR descriptions but are not corroborated by GitHub check runs.

## What Is Already Implemented

### Player command versus system action boundary

`web/src/engine/actions.ts` now defines:

```ts
type PlayerCommandInput = ... // seven externally submitted command kinds
type SystemActionInput = ...  // trusted generated consequences
type EncounterActionInput = PlayerCommandInput | SystemActionInput
```

The seven player command kinds are declared by `PLAYER_COMMAND_KINDS`:

```text
load_slot
charge_slot
fire_slot
move_hero
discard_for_stamina
revive_ally
diminished_action
```

Preserve the unified internal resolver vocabulary. The split exists to protect external seams, not to create two rules engines.

### Scenario/replay seam

`web/src/engine/content/schemas.ts` now:

- allows every declared player command in `scenarioActionSchema`;
- includes `revive_ally`, `diminished_action`, and `fire_slot.targetSlotIndex`;
- refuses system actions such as forged `damage` commands;
- checks at module load that the scenario schema and player-command vocabulary agree in both directions.

### Workbench submission seam

`web/src/store/sessionSlice.ts` now separates:

```ts
submit(action: PlayerCommandInput)
submitSystemAction(action: SystemActionInput)
```

`submitSystemAction` is a debug injection seam and intentionally records no replay step. Preserve that distinction.

### Terminal-state rule

PR #145 formalized the existing behavior as D-096:

1. Terminal state is evaluated post-order at consequence-tree node boundaries.
2. A fired card is one atomic authored batch; its complete consequence tree resolves before terminal evaluation.
3. For other batches, once the encounter ends, remaining actions are refused with recorded facts rather than silently skipped.
4. Mutual zero is a victory because the Boss is checked before the Party.

The implementation lives in `applyAction()` and `checkResolution()` in `web/src/engine/resolve.ts`. Preserve these semantics unless a future design decision explicitly supersedes D-096.

## Priority 0 — Fix `legalActions()` Target Enumeration

### Confirmed defect

`fireTargeting()` can return:

```ts
mode: 'none' | 'piece' | 'hex' | 'ally'
```

But `legalActions()` only expands `hex` and `piece` targets:

```ts
targeting.mode === 'hex'
  ? ...
  : targeting.mode === 'piece'
    ? ...
    : [{ kind: 'fire_slot', sourceId: heroId, slotIndex }]
```

Therefore `ally` falls into the untargeted branch. `legality()` then refuses that fire because an ally target is required.

This was reproduced against current `main` with shipped content:

```text
Maren's Braced Escort aimed at Elian:
legality(...)     -> legal
legalActions(...) -> no fire_slot action for the prepared Slot
```

Supported `board_slot` targeting has the same structural omission. It is accepted by the card schema and `legality()` through `targetSlotIndex`, but `fireTargeting()` has no `board_slot` mode and `legalActions()` never constructs the corresponding command. No live card currently uses it, so this is latent rather than player-visible today.

### Required implementation

Make fire-action enumeration exhaustive across all supported target families:

```text
none
piece
hex
ally
board_slot
```

Recommended direction:

- Add an explicit `board_slot` targeting mode rather than treating it as `none`.
- Include the information needed to construct legal `targetSlotIndex` choices.
- Expand `ally` targets into one `fire_slot` command per legal ally.
- Continue filtering every constructed command through the single public `legality()` predicate.
- Do not reproduce range, living-target, prepared-Slot, or Counter-host rules inside `legalActions()`.

### Acceptance criteria

- A prepared `braced_escort` enumerates a legal fire action for each legal ally.
- An illegal, Downed, missing, or out-of-range ally is not enumerated.
- A `board_slot` fixture enumerates one fire action for each legal prepared Slot.
- Empty or otherwise illegal Slots are not enumerated.
- `none`, `piece`, and `hex` targeting continue to behave unchanged.
- Every enumerated action passes `legality()`.
- No targeting family can be added to the schema without an explicit enumeration decision.

### Required tests

Add a target-family contract matrix, preferably beside `commandSpace.test.ts` or in a focused `legalActions.test.ts`:

```text
target_type   expected command shape
none          fire_slot with no target
piece         fire_slot + targetId
hex           fire_slot + targetHex
ally          fire_slot + targetId
board_slot    fire_slot + targetSlotIndex
```

Use at least one shipped ally-target card so the contract protects the real Maren path, not only a synthetic catalog.

## Priority 1 — Define What “Complete Action Space” Means

`legalActions()` currently uses every hand card for `load_slot` and `charge_slot`, but only `hand[0]` as representative payment for:

- `move_hero`
- `discard_for_stamina`
- `revive_ally`

That is a reasonable UI-affordance optimization, but it is not a complete set of concrete commands. For AI and simulation, discarding card A versus card B produces meaningfully different future states.

Choose and document one contract.

### Recommended contract

Keep `legalActions()` as the complete concrete engine action space and enumerate every legal payment-card alternative. If UI consumers need a compressed affordance view, add a separate projection/grouping helper above the engine API.

Reason: AI, bots, simulations, hints, and rules tests should not silently lose strategically distinct actions. Presentation can collapse equivalent-looking commands after enumeration; the engine should not discard choices before consumers see them.

If full enumeration is intentionally deferred, rename or document the current API as representative action availability and do not claim it is a complete search space.

### Acceptance criteria

- The API contract explicitly states whether payment variants are exhaustive or representative.
- Tests demonstrate the chosen behavior with at least two different hand cards.
- UI grouping does not become a second legality authority.

## Priority 2 — Harden the External Trust Boundary Before Multiplayer

The new type split is valuable, but it is not yet a security boundary:

- TypeScript types disappear at runtime.
- `isPlayerCommand()` checks the `kind` discriminator, not the full payload shape.
- Public `resolve()` still accepts `EncounterActionInput`, including system actions.
- `submitSystemAction()` remains intentionally reachable for Workbench tests/debugging.

No immediate server work is required. Before any client-controlled payload reaches the engine, introduce a runtime-validated player-command entry point using the same schema authority as Scenario input. Keep raw system-action resolution on an internal/trusted seam.

Do not claim client/server authority from the TypeScript split alone.

## Priority 3 — Modularize Legality Without Splitting Authority

The routed legality-modularization item is still open. `legality.ts` is correct in shape but its `fire_slot` branch owns a disproportionate amount of targeting and card-rule logic.

Refactor toward focused validators behind the unchanged seam:

```ts
legality(catalog, state, action)
```

Possible organization:

```text
engine/legality/
  loadSlot.ts
  chargeSlot.ts
  fireSlot.ts
  movement.ts
  revive.ts
  diminished.ts
  system.ts
  index.ts
```

Constraints:

- Preserve one public legality authority.
- Make no gameplay-rule changes as part of the file move.
- Keep error reasons and `targetRange` results stable.
- Do not duplicate validation in UI, enumeration, or resolver code.
- Run the existing suite before and after the refactor.

This is useful housekeeping, but it should follow the concrete enumeration fix so the refactor begins from a correct contract.

## Priority 4 — Extend Terminal-Ordering Coverage

The current four tests protect the main D-096 clauses, but some originally named pathological cases are represented indirectly:

- mutual zero is tested by directly mutating both health values and calling `checkResolution()`;
- there is no direct detonation-mid-tree terminal test;
- there is no direct phase-terminal-during-tree test.

Add focused integration tests for:

1. Boss and last Hero reaching zero through one real resolver consequence tree.
2. A detonation ending the Encounter while sibling consequences remain.
3. A phase transition producing a terminal result without suppressing facts that should precede the boundary.

Do not change D-096 merely to make these fixtures easier to construct.

Consider whether `checkResolution()` needs to remain exported through `engine/index.ts`. It mutates authoritative state without producing a fact. Internal engine callers need it, but public consumers should normally cross `resolve()` or `advancePhase()`.

## Deferred — Broader `fire_slot` / Resumable Resolution Redesign

Do not build a generic effect DSL or suspension stack in this task.

The existing `deferTerminalCheck` boolean is a reasonable authored exception for current cards. Revisit the abstraction when one of these enters the actual backlog:

- reaction-speed cards;
- interception or priority windows;
- sequential multi-target selection;
- choose-one effects requiring player input during resolution;
- true multiplayer suspension/resumption.

At that point, audit targeting, cost, effect sequence, triggers/readers, and terminal boundaries together as one resumable-resolution ADR.

## Documentation Cleanup

Reconcile `.scratch/engine-hardening-handoff/spec.md` with the delivered issue files. The parent spec still describes the terminal-state item as open even though issue 02 and PR #145 mark it delivered.

Do not rewrite historical PR descriptions. Update only the current local coordination state.

## Validation Plan

At minimum, run:

```bash
cd /Users/adrpadua/dev/webgame/web
npm test -- src/engine/commandSpace.test.ts src/engine/terminal.test.ts
npm test
npm run lint
npm run build
```

If engine or replay semantics change, also run the repository's full local verification and mutation audit. Do not update replay fingerprints or snapshots blindly; explain every intentional semantic change.

For the Priority 0 enumeration fix, no semantic state-transition change is expected. The new tests should fail on the current omission and pass after enumeration is corrected.

## Non-Goals

Do not:

- rewrite the reducer architecture;
- split player and system actions into independent engines;
- replace `legality()` with competing predicates;
- move rules into UI components;
- build a generic event bus, ECS, card DSL, or resolution stack prematurely;
- generalize the explicit phase engine;
- sacrifice deterministic replay;
- treat `isPlayerCommand()` as full runtime validation;
- broaden this task into card-balance or UI redesign work.

## Desired End State

After this follow-up:

1. Player commands and system consequences remain explicitly distinguished.
2. Runtime scenario input cannot author system consequences.
3. `legalActions()` correctly covers every target family supported by the engine.
4. Its payment-enumeration contract is explicit and suitable for its intended AI/simulation consumers.
5. `legality()` remains the single authority, with a modular implementation.
6. D-096 terminal ordering is protected by direct resolver-level tests.
7. The phase engine, deterministic reducer, fact stream, replay, and record fingerprints remain intact.
