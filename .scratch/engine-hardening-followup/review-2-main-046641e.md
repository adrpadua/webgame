# Rules Engine Review — Main at `046641e`

## Review Scope

- Repository: `adrpadua/webgame`
- Local checkout: `/Users/adrpadua/dev/webgame`
- Reviewed branch: `origin/main`
- Reviewed commit: `046641e8eba459f4c7988f174b7560b4ba04b94d`
- Previous review baseline: `ea7d40cff5dc86569793969e4cc9f8c3694f0d35`
- Active rules implementation: `web/src/engine`

This review covers the rules-engine changes that landed after PRs #142 and #145, particularly:

- [PR #147 — Modularize legality behind its unchanged seam](https://github.com/adrpadua/webgame/pull/147)
- [PR #152 — Enumerate every fire-target family](https://github.com/adrpadua/webgame/pull/152)
- [PR #153 — Fix Maren and Elian deck-shape defects](https://github.com/adrpadua/webgame/pull/153)

The Godot rules implementation remains frozen/reference material and is not the review target.

## Executive Assessment

The rules engine is materially stronger than at the previous baseline. The missing ally-target enumeration was fixed correctly, legality was modularized without creating competing authorities, and the new `counter_spent` mechanic extends the closed event registry rather than bypassing the engine.

The deterministic reducer architecture should remain in place. The remaining work is contract hardening and targeted coverage, not a rewrite.

The most immediate current-main problem is outside the rules logic: a clean production build fails because several UI component/helper pairs differ only by capitalization.

## Verification Results

The current `origin/main` snapshot was extracted and tested independently.

```text
Unit tests: 649 passed across 39 files
Lint:       passed
Build:      failed
```

The build failure is detailed below. GitHub reports no attached check runs for PRs #152 or #153; those PRs record their local verification evidence in their descriptions.

## Improvements That Landed Correctly

### 1. Legality modularization

PR #147 preserved the single public authority:

```ts
legality(catalog, state, action)
```

The implementation split follows the actual complexity boundary:

- `web/src/engine/legality.ts` retains the public seam and the smaller named command validators.
- `web/src/engine/fireLegality.ts` owns the deep, order-sensitive `fire_slot` validator.
- `web/src/engine/verdicts.ts` contains the shared `legal()` and `illegal()` grammar.

This is better than mechanically creating many shallow files. The `fire_slot` targeting families share order-sensitive `bossVerdict` and `targetVerdict` state, so moving them together preserves readability and avoids artificial interfaces.

No second legality predicate was introduced. Enumeration, targeting, resolution, and tests continue to ask the same public authority.

### 2. Exhaustive fire-target enumeration

PR #152 closes the confirmed Maren defect from the previous review.

`FireTargeting` now recognizes:

```text
none
piece
hex
ally
board_slot
```

`fireCommands()` uses an exhaustive switch:

- `hex` produces commands carrying `targetHex`;
- `piece` and `ally` produce commands carrying `targetId`;
- `board_slot` produces commands carrying `targetSlotIndex`;
- `none` produces an untargeted command;
- the default branch binds the mode to `never`, forcing a compile-time decision for any future family.

The new target-family contract matrix in `web/src/engine/legalActions.test.ts` provides two layers of protection:

1. `Record<Card['target_type'], ...>` values require every schema family to be represented at compile time.
2. Runtime tests compare the enumerated fire commands with the complete set accepted by `legality()` for each family.

The shipped Maren path is directly covered: a prepared Braced Escort enumerates legal fires for Elian and Maren, and drops Elian when he is Downed.

This is a strong regression contract.

### 3. `counter_spent` event integration

PR #153 introduced `counter_spent` as an authored event for Signature Grants.

The implementation fits the existing architecture:

- `counter_spent` joins `AUTHORED_WHENS`.
- The closed `EVENT_REGISTRY` defines its moment, payload, and allowed listener type.
- The event is raised only when a Card Reader actually removes one or more Counters.
- It reuses the same spend records written into the action fact, preventing event/log disagreement.
- It is evaluated before the ordinary `slot_fired` raise.
- A spend now contributes to `effect_landed`, so a spend-only card no longer appears inert to subscribers.

The event is Grant-only and carries no gates because the existence of a successful spend already proves that the effect landed. This is coherent and unfarmable: trying to spend a Counter that is absent produces no event and no Charge.

This is a healthy extension of the closed event vocabulary, not a generic event bus.

## Current Findings

## Priority 0 — Restore a Clean Production Build

The latest `main` passes its tests and lint but fails a clean build with TypeScript errors including:

```text
TS1149
TS1261
TS2305
TS2724
```

Several UI component/helper pairs differ only by capitalization:

```text
BeatCard.tsx    / beatCard.ts
HeroFrame.tsx   / heroFrame.ts
PartyFrames.tsx / partyFrames.ts
StatusIcons.tsx / statusIcons.ts
```

On a case-insensitive filesystem, an import such as:

```ts
import { BeatCard } from './overlays/BeatCard'
```

can resolve the lowercase `.ts` helper before the intended `.tsx` component. TypeScript then reports missing exports and inconsistent file casing.

### Recommended fix

Rename the lowercase helper modules to semantically distinct names, for example:

```text
beatCardModel.ts
heroFrameModel.ts
partyFrameModel.ts
statusIconEntries.ts
```

Then update imports and add a clean-checkout build to the normal validation path. Do not rely only on incremental local builds, which may retain resolution state from before a conflicting file existed.

This is not a rules-engine architecture defect, but it blocks release confidence and CI portability.

## Priority 1 — Resolve the Payment-Enumeration Contract

The target dimension of `legalActions()` is now exhaustive. The payment dimension is not.

`legalActions()` enumerates every hand-card choice for:

- `load_slot`
- `charge_slot`

But it uses only `hand[0]` as a representative payment for:

- `move_hero`
- `discard_for_stamina`
- `revive_ally`

This is sufficient for UI availability but not for a complete AI or simulation action space. Discarding card A versus card B creates different future hands and therefore different game states.

The current documentation contains a real contract contradiction:

```text
legalActions is the complete legal player action space
```

versus:

```text
one representative action with hand[0]
```

Both cannot be true simultaneously.

### Recommended decision

Make `legalActions()` enumerate every concrete legal payment-card alternative. If the UI needs one compact affordance, group equivalent-looking commands in a presentation-layer projection after enumeration.

This keeps the engine honest for:

- AI and bots;
- deterministic search;
- hints and tutorials;
- balance simulation;
- completeness testing.

If full enumeration is intentionally deferred, rename or document the API as representative action availability and stop describing it as a complete search space.

### Required tests

- Give a Hero at least two different hand cards.
- Assert that movement enumerates both payment alternatives for each legal destination.
- Assert that revival and stamina discard enumerate both alternatives.
- Verify every emitted command passes `legality()`.
- If UI grouping is added, verify it does not become a second legality authority.

## Priority 2 — Decide the Real `board_slot` Command Shape

`board_slot` is now enumerated syntactically, but it is narrower than the authored rules language.

The command currently carries:

```ts
targetSlotIndex?: number
```

It does not identify which Hero owns the target Slot. `fireSlotLegality()` and `fireTargeting()` consequently inspect only the firing Hero's action bar.

Current rules documentation describes `board_slot` as targeting an ally's prepared Top Card. The Party model now exists, but the action cannot address another Hero's Slot. The UI gesture for completing a `board_slot` target is also intentionally unbuilt because no shipped card currently uses the family.

### Required decision before the first consumer

Choose one stable representation:

```ts
targetHeroId: string
targetSlotIndex: number
```

or:

```ts
targetSlotRef: SlotRef
```

The selected shape must agree across:

- `PlayerCommandInput`;
- `scenarioActionSchema`;
- `fireTargeting()`;
- `legalActions()`;
- `fireSlotLegality()`;
- Counter host resolution;
- the Workbench targeting gesture;
- replay and record tests.

Do not ship the first `board_slot` card until all of those surfaces identify the same Slot.

## Priority 3 — Add Direct Terminal-Ordering Integration Tests

D-096 remains coherent and should not be changed casually. The original follow-up's direct integration cases remain open:

1. Boss and last Hero reach zero through one real resolver consequence tree.
2. A detonation ends the Encounter while sibling consequences remain.
3. A phase transition produces a terminal result without suppressing facts that precede the boundary.

The current mutual-zero test directly mutates both health values and invokes `checkResolution()`. That proves the tie ordering but not the complete resolver path.

After adding direct resolver coverage, reconsider whether `checkResolution()` needs to remain exported through `engine/index.ts`. It mutates authoritative state without producing a fact; ordinary external consumers should normally use `resolve()` or `advancePhase()`.

## Priority 4 — Add the Runtime Trust Boundary Before Multiplayer

The player/system type split remains valuable, but it is not a security boundary:

- TypeScript types disappear at runtime.
- `isPlayerCommand()` classifies the discriminator but does not validate the payload.
- Public `resolve()` accepts the unified action union.
- `submitSystemAction()` remains an intentional Workbench debug seam.

No immediate network architecture is required. Before any client-controlled payload reaches the engine:

- create one runtime-validated player-command entry point;
- share its schema authority with Scenario/replay input;
- keep raw system-action resolution internal or explicitly trusted;
- test that every system-action kind is refused at the external boundary.

Do not claim server authority from the TypeScript split alone.

## Priority 5 — Materialize the Remaining Follow-up Issues

`.scratch/engine-hardening-followup/spec.md` lists three open items:

1. direct terminal tests;
2. payment-enumeration contract;
3. runtime trust boundary.

Only the delivered issue file exists under `.scratch/engine-hardening-followup/issues/`.

Create issue files for the remaining work so it cannot be lost as prose inside the parent spec. Each should carry:

- status;
- owner;
- scope;
- acceptance criteria;
- validation expectations;
- explicit deferral trigger where applicable.

## Architectural Risks and Tradeoffs

### Parallel UI targeting consumers

`legalActions()` is described as the API read by UI, AI, hints, and simulation, but current UI code primarily asks `fireTargeting()` directly. PR #152 protected those consumers with exhaustive switches, which is good, but they remain parallel projections rather than one consolidated action API.

This is acceptable while `fireTargeting()` delegates every candidate to `legality()`. Do not let UI modules introduce independent range, target-status, or Counter-host rules.

### `fire_slot` atomicity remains action-specific

D-096 still treats a fired Card as the one atomic authored batch through `deferTerminalCheck`. This remains appropriate for current content.

Do not extend the boolean with more action-kind exceptions. Revisit resolution transactions only when the backlog gains:

- reaction-speed cards;
- interruption or priority windows;
- choose-one effects requiring input during resolution;
- sequential multi-target selection;
- true multiplayer suspension and resumption.

At that trigger, targeting, costs, effect sequencing, subscribers, and terminal boundaries should be designed together as one resumable-resolution ADR.

### Event vocabulary growth

`counter_spent` demonstrates that the closed event registry can grow without becoming a generic bus. Preserve its current discipline:

- every authored `when` must be heard by a registry row;
- each row defines its exact moment and payload;
- each row restricts Reader/Grant participation;
- subscriber ordering remains explicit;
- raises travel through named helpers rather than arbitrary string dispatch.

## Recommended Execution Sequence

1. Fix the case-collision build failure and prove a clean production build.
2. Materialize the three open follow-up issue files.
3. Decide and implement the payment-enumeration contract before AI or simulation depends on `legalActions()`.
4. Add the direct D-096 integration tests.
5. Decide the ally-Slot command shape before authoring a `board_slot` card.
6. Add a runtime command boundary when multiplayer or another untrusted input seam approaches.
7. Continue deferring a resolution stack or card DSL until a real suspension mechanic requires it.

## Validation Expectations

For engine follow-up work, run at minimum:

```bash
cd /Users/adrpadua/dev/webgame/web
npm test
npm run lint
npm run build
```

For semantic engine changes, also run the repository's full local gate, browser smoke, deterministic Scenario/replay checks, and mutation audit.

Do not update sealed records, expected fingerprints, or generated Scenarios blindly. Explain the exact intentional semantic change behind every changed output.

## Non-Goals

Do not:

- rewrite the reducer architecture;
- split player commands and system consequences into independent engines;
- create competing legality predicates;
- move rules into UI components;
- create a generic event bus, ECS, card DSL, or priority stack prematurely;
- generalize the explicit phase engine;
- weaken deterministic replay;
- treat a TypeScript union as runtime validation;
- combine these architecture follow-ups with unrelated balance or visual redesign work.

## Desired End State

After the remaining follow-up work:

1. `main` tests, lints, and clean-builds.
2. `legality()` remains the single public legality authority.
3. Every schema target family remains exhaustively enumerated.
4. `legalActions()` has one explicit, tested payment-enumeration contract.
5. `board_slot` addresses the same Slot in commands, rules, UI, replay, and documentation.
6. D-096 terminal ordering is protected by direct resolver-level tests.
7. Untrusted player input cannot submit system consequences.
8. The reducer, fact stream, phase engine, replay, records, and deterministic simulation remain intact.
