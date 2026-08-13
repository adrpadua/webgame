# Duelyst patterns for a Spikes/Probes harness

Research date: 2026-08-13. This is a source-code review of Open Duelyst at
commit [`2843f24`](https://github.com/open-duelyst/duelyst/tree/2843f2400854136598631288c2e8dfb8f5173de7), not a recommendation to import
its PvP, service, or UI architecture.

## What Duelyst already does

- **Runs rules tests without the client.** Its `test:unit:sdk` command invokes
  Mocha on `test/unit/sdk`, and the test setup imports the SDK directly in
  Node. The shared setup resets the global `GameSession`, marks it authoritative,
  selects Sandbox mode, supplies two deck data arrays, and calls `GameSetup`.
  [Scripts](https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/package.json#L145-L155)
  - [setup helper](https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/test/utils/utils_sdk.js#L12-L47)

- **Provides a playable controlled environment.** `Sandbox` accepts two deck
  payloads and starts a sandbox session; `SandboxDeveloper` inherits it, skips
  mulligan, and enables developer mode. The deck-select view chooses between
  normal and developer sandbox, while the QA editor can reveal sandbox in the
  UI. [Sandbox](https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/app/sdk/challenges/sandbox.coffee#L7-L50)
  - [developer variant](https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/app/sdk/challenges/sandboxDeveloper.coffee#L4-L15)
  - [selection](https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/app/ui/views/composite/deck_select_sandbox.js#L19-L126)

- **Makes deck order deterministic in developer/test setup.** When decks are
  not randomized, setup takes cards from the end of the supplied array and
  draw actions do likewise; an action can also name an exact card index.
  [Initial hand setup](https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/app/sdk/gameSetup.coffee#L154-L188)
  - [draw action](https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/app/sdk/actions/drawCardAction.coffee#L7-L61)

- **Has useful fixture verbs, with an important boundary.** The test helper can
  place/remove a card, alter its stats, and then execute a generic update action.
  It also has an explicit `executeActionWithoutValidation` helper that temporarily
  removes validators. [Fixture helpers](https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/test/utils/utils_sdk.js#L154-L226)
  - [validator bypass](https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/test/utils/utils_sdk.js#L228-L236)

- **Offers lightweight diagnostics and content exports.** Its logger can keep
  the latest 500 client log records when recording is enabled, and the repository
  includes a script that enumerates `CardFactory` output as CSV. [Logger
  buffer](https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/app/common/logger.coffee#L19-L37)
  - [card CSV export](https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/scripts/sdk_to_csv/all_cards.coffee#L1-L11)

## Harness we should incorporate

Build a scene-free **Encounter Probe** layer around the existing
`EncounterEngine` (the rules source of truth required by ADR 0009), plus a
separate presentation spike scene. Keep these two outputs distinct:

| Part | Input | Output | Purpose |
| --- | --- | --- | --- |
| `EncounterProbe` | named `EncounterSnapshot`, ordered `EncounterAction`s, seed | resolution/event trace, final snapshot, invariant failures | fast repeatable rules experiments |
| visual spike | same named scenario | game scene screenshot/manual observation | validate legibility and interaction, not rules correctness |

Recommended probe contract:

1. Define a named scenario as data: board, Party, Boss Timeline, hand/deck
   order, slots/charges, Status Effects/Hazards, starting phase, and explicit
   expected assertions. Use the project terms `Encounter`, `Round`, `Quick
   Window`, `Slow Window`, and `Action Bar`.
2. `run(scenario, actions, seed)` returns a stable serializable record:
   scenario id/version, seed, action tape, phase/round after every action,
   resolution events, and final snapshot. Add `replay(record)` and require its
   snapshot and event sequence to match.
3. Expose fixture operations as **setup-only** helpers (`place_hero`,
   `place_minion`, `give_hand`, `set_slot`, `add_hazard`, `set_timeline`). Once
   execution begins, submit only legal `EncounterAction`s. Unlike Duelyst's
   validator bypass, never silently disable validation in an assertion probe;
   put any deliberate illegal-action test behind a plainly named helper and
   assert the rejection.
4. Use a seedable/injectable RNG for every rule-relevant random choice. Duelyst
   controls deck draw order but still calls `Math.random()` in several SDK paths
   (for example, random map presentation), so its developer mode is not a
   complete replay guarantee. [Random session uses](https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/app/sdk/gameSession.coffee#L471-L476)
   - [random map decoration](https://github.com/open-duelyst/duelyst/blob/2843f2400854136598631288c2e8dfb8f5173de7/app/sdk/battleMapTemplate.coffee#L90-L113)
5. Make the probe command developer-fast (for example, a Godot headless
   invocation filtered by scenario id) and leave a compact JSON artifact on
   failure. Print the event trace and a structural snapshot diff, rather than
   relying on a capped log buffer.

## First useful probes

- `full_charge_cleanup`: verify that a fully charged, activated matching Slot
  clears only at the correct player-window boundary.
- `simultaneous_resolution`: commit two Hero moves and Slot activations, then
  assert movement first and Tank/Healer/Damage resolution order.
- `target_selector_tie`: give two valid Heroes the same selector-relevant state
  and assert the documented public tiebreaker.
- `phase_trigger_boundary`: cross a Phase Trigger during a player window and
  assert that the next phase reveals only after the current Round finishes.

These borrow Duelyst's strongest idea: cheap, deck/scenario-defined rules
execution, while avoiding its global singleton, full-service development stack,
and validator bypass as the default experiment path.
