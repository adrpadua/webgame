# Headless Rules SDK

> **Frozen (ADR 0019 / D-018).** This document describes the GDScript `EncounterEngine` seam of the frozen Godot reference. The living equivalent is the web Encounter Engine's reducer seam — `resolve(state, action)` in `web/src/engine` — documented by ADR 0019. Kept as reference for the frozen codebase; do not build new work against it.

`EncounterEngine` is the authoritative rules module for both headless simulation and the playable scene. Its public seam is intentionally small:

```gdscript
engine.start(encounter_resource)
engine.apply(encounter_action)
engine.advance_phase()
engine.legality(encounter_action)
engine.legal_actions(hero_id)
```

`start` creates the board, combatants, deck, Hand, Action Bar, and Boss Timeline from an authored Encounter Resource. Dictionary setup remains available to focused engine probes. `apply` validates and records one `EncounterAction`, including generated damage, Hazard, Status Effect, and Minion actions. `advance_phase` owns Loadout, Boss rows, player windows, Full-Charge Cleanup, hand refill, the Encounter Clock, and terminal outcomes — and every state change it causes rides the stream as a first-class action (`ADVANCE_PHASE`, `ROUND_START`, `FULL_CHARGE_CLEANUP`, `DRAW_CARD`, `SHUFFLE_DECK`, `END_OF_CLOCK`), with `advance_phase` returning the complete ordered slice it produced (ADR 0015). History is a complete record of every rules mutation after setup; observers fold it instead of polling or diffing snapshots.

`legality` answers whether a candidate action would resolve — `{"legal": bool, "reason": String}` with the engine-authored rejection reason — without mutating state, and `legal_actions` enumerates the candidate player actions that predicate accepts. `apply` routes through the same predicate, so an action succeeds if and only if `legality` calls it legal (generated Hazard, Minion, and damage actions keep their resolution-time failure modes). Consumers ask instead of restating rules: the HUD's slot acceptance, drop-intent cues, ready states, and prompts, and the Encounter Record's legal-useful-action evidence all derive from this seam (ADR 0013).

`get_tutorial_prompt_projection(presentation_state = {})` is the read-only teaching projection for the seven authored Embermaw prompt contracts. It derives named relevance facts from existing engine state, including Whelp route-blocking relevance, but never reads HUD state or changes rules. Its caller-owned presentation progress is not a gameplay or Encounter Record input; see [Tutorial Prompt Projection](tutorial-prompt-projection.md).

## Runtime Flow

```text
Authored Resources -> EncounterEngine -> action history/state -> scene projections -> HUD and HexGrid
                           ^                                      |
                           +----------- EncounterAction -----------+
```

`Main.gd` translates direct manipulation into `EncounterAction` records. `PlayerState`, `BossState`, `TurnManager`, and `EncounterState` are scene-facing projections; they do not resolve gameplay. `HexGrid` renders the engine's `BoardState` — the only board authority (ADR 0017) — and asks `BoardQuery` over it for legal movement previews; the view holds no board state or rules of its own.

## Modules

| Module | Responsibility |
| --- | --- |
| `EncounterEngine` | Encounter state, phase progression, action legality and state transitions, action history, seeded deck order, and outcomes. One module (ADR 0014): resolution is private implementation behind `apply`. |
| `EncounterAction` | First-class player, Boss, Hazard, Minion, and damage requests. |
| `TimelineResolver` | Authored Boss Beat resolution: each Beat kind's spatial rule and its conversion into generated actions (ADR 0016). Internal collaborator below the engine seam. |
| `CardResolver` | Top Card and Charge Stack effects, including Keyword Charge Modifiers. Internal collaborator below the engine seam. |
| `BoardState` / `BoardQuery` | Scene-free placement, Hazards, target-pattern geometry, range, and movement legality. Target-pattern vocabulary, bindings, and reference-only asset mapping are defined in [Prototype Rules](prototype-rules.md#reusable-target-pattern-catalog). |
| Scene projections | Read-only state shaped for existing controls and panels. |

`BoardQuery.resolve_target_pattern(board_hexes, catalog_id, origin, options = {})` is the public headless seam for reusable Target Pattern geometry. It returns `catalog_id`, `selection_binding`, `origin`, `anchor`, `facing`, and stable ordered on-board axial `impacts`; consumers apply targeting filters or presentation after this result instead of recomputing geometry.

Targeted Boss Hits use the smallest authored selector seam on `BossProgramBeat.target_selector`. Current runnable content supports Raking Claw with `target_selector = "tank"` and `damage_keywords = ["tank_hit"]`; `TimelineResolver` carries those authored facts into the generated Damage action so Encounter Records can distinguish selector-owned Tank attrition from avoidable board-pattern damage.

Target-Bound Boss Patterns use `BoardQuery.resolve_target_bound_pattern(board_hexes, source_piece, candidate_pieces, target_selector, catalog_id, options = {})`. This headless seam resolves the selected Piece before geometry, snaps source-to-selected-target orientation to one legal hex-edge Facing, resolves the existing directional Target Pattern catalog, and reports selected Piece identity separately from affected Piece IDs. Same-hex source/target cases are invalid unless a future authored fallback explicitly opts in.

## Verification

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe content,rules,parity
```

`content` validates all authored Resources. `rules` tests the engine seam headlessly. `parity` drives the visible interaction handlers and proves their projected state agrees with the engine for representative Encounter flows.
