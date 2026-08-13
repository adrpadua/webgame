# Headless Rules SDK

`EncounterEngine` is the authoritative rules module for both headless simulation and the playable scene. Its public seam is intentionally small:

```gdscript
engine.start(encounter_resource)
engine.apply(encounter_action)
engine.advance_phase()
```

`start` creates the board, combatants, deck, Hand, Action Bar, and Boss Timeline from an authored Encounter Resource. Dictionary setup remains available to focused engine probes. `apply` validates and records one `EncounterAction`, including generated damage, Hazard, Status Effect, and Minion actions. `advance_phase` owns Loadout, Boss rows, player windows, Full-Charge Cleanup, hand refill, the Encounter Clock, and terminal outcomes.

## Runtime Flow

```text
Authored Resources -> EncounterEngine -> action history/state -> scene projections -> HUD and HexGrid
                           ^                                      |
                           +----------- EncounterAction -----------+
```

`Main.gd` translates direct manipulation into `EncounterAction` records. `PlayerState`, `BossState`, `TurnManager`, and `EncounterState` are scene-facing projections; they do not resolve gameplay. `HexGrid` renders `BoardState` and asks `BoardQuery` for legal movement previews.

## Modules

| Module | Responsibility |
| --- | --- |
| `EncounterEngine` | Encounter state, phase progression, action history, seeded deck order, and outcomes. |
| `EncounterAction` | First-class player, Boss, Hazard, Minion, and damage requests. |
| `ActionResolver` | Action legality and state transitions. |
| `TimelineResolver` | Boss Beat conversion into generated actions. |
| `CardResolver` | Top Card and Charge Stack effects, including Keyword Charge Modifiers. |
| `BoardState` / `BoardQuery` | Scene-free placement, Hazards, patterns, range, and movement legality. |
| Scene projections | Read-only state shaped for existing controls and panels. |

## Verification

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe content,rules,parity
```

`content` validates all authored Resources. `rules` tests the engine seam headlessly. `parity` drives the visible interaction handlers and proves their projected state agrees with the engine for representative Encounter flows.
