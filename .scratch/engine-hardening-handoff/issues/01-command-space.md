# 01 — The player command space (P2 + P1)

Status: delivered (Architecture: this session)

## What shipped

- **The declared vocabulary** (`PLAYER_COMMAND_KINDS`, `actions.ts`): the action union split into `PlayerCommandInput` (7 kinds) and `SystemActionInput` (16 kinds), one resolver vocabulary unchanged, `isPlayerCommand` as the runtime predicate. The registry discipline applied to the command boundary.
- **The external seam guarded** (`scenarioActionSchema`): gains the two commands it silently could not carry (`revive_ally`, `diminished_action`, plus `fire_slot.targetSlotIndex`); a module-load guard keeps the schema's kinds equal to the vocabulary in both directions — a Player Command the schema cannot carry and a system action it can are both build failures.
- **The enumeration completed** (`legalActions`): now returns `PlayerCommandInput[]` and enumerates all 7 kinds — `revive_ally` (each Downed ally, representative hand card, adjacency left to legality), `diminished_action` (three choices, ally-facing ones aimed at each living ally in seat order), `discard_for_stamina` (representative card, Quick-gated by legality). `ENUMERATED_COMMAND_KINDS` declares its coverage, guarded by test against the vocabulary.
- **The store seam typed** (`sessionSlice`, `interactionSlice`): `submit` takes `PlayerCommandInput`; the hand-kept `SCENARIO_STEP_KINDS` set — a third shadow copy of the vocabulary — deleted in favor of `isPlayerCommand`. Found and fixed in passing: a submitted system action used to record a silent null step, so time travel lost it; the Workbench's hazard-staging tests were doing exactly this. System injection is now its own named debug seam, `submitSystemAction`, documented as off-replay by design.
- **Contract tests** (`commandSpace.test.ts`, 5): vocabulary/enumeration agreement; the schema carries every command and refuses a forged `damage`; every command kind appears in a representative state and every enumerated action passes `legality` and is a player command; commands disappear with their conditions (including the ended Encounter); the diminished vocabulary's exact aim set.

## Behavior notes

No rules change. Two test expectations were corrected during authoring, not the engine: `discard_for_stamina` is Quick-gated (legality comment: parity with the frozen reference, held to the window) and `charge_slot` needs an occupied Slot.

## Evidence

597 tests green (592 + 5 contract tests); typecheck clean; `verify:local` green end to end; mutation audit **110/110 caught, 0 survived, 0 stale** — no anchors touched the command-space changes, and every existing mutant still dies through the retyped seams.
