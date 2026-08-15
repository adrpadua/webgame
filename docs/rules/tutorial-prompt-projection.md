# Tutorial Prompt Projection

`EncounterEngine.get_tutorial_prompt_projection(presentation_state = {})` is the scene-free teaching seam for the seven authored Embermaw Tutorial Prompt Contracts. It derives relevance from existing authoritative Encounter facts; it never creates a legal action, changes phase progression, changes a Card or Boss Program, or records prompt exposure as an Encounter outcome.

The interface returns a stable priority-ordered `prompts` list plus `current_prompt_id`. Every prompt carries its `id`, `priority`, `surface`, `anchor`, `authoritative_basis`, `show_once`, `dismissal`, `completion`, and `accessible_full_text`. `current_prompt_id` is the highest-priority relevant prompt whose caller-owned show-once state remains available; `one_at_a_time` is always `true`.

`presentation_state` is a presentation-only map keyed by prompt ID. Its optional `dismissed` and `completed` booleans determine only the returned dismissal/completion and show-once fields. UI/UX owns persistence for Raid Run and encounter history; the engine neither stores it nor accepts it as a rules input. Reopenable cards and the text-first Help list consume this same contract later, without recreating trigger rules.

## Fixed Presentation Policy In The Model

Every prompt has `dismissal.allowed = true` and a `contextual_card` surface. `boss_timeline` has `show_once.scope = raid_run`; `guarded_front`, `charge_a_slot`, `iron_guard_armor`, `riposte_ready`, `slow_fortify`, and `whelp_pressure` have `show_once.scope = encounter`. `accessible_full_text` is lightly instructional: it describes a pressure and relevant response, but does not mark a legal action as mandatory.

## Authoritative Teaching Predicates

| Prompt | Projection basis |
| --- | --- |
| `boss_timeline` | Round 1 before a Hero action, the current ordered Instant and Incoming Beat IDs, and phase. |
| `guarded_front` | The next unresolved authored Tank Hit, Boss/hero coordinates and facing, and the projected `guarded_front_hex`. |
| `charge_a_slot` | Current player window, available hand cards, and Slots that can legally accept a Charge. |
| `iron_guard_armor` | The next unresolved Tank Hit plus the currently legal Iron Guard load/charge/fire sequence that can resolve before it. |
| `riposte_ready` | The active `riposte_ready` Status Effect, its authoritative grant event/reason and expiry, and any currently legal Shield Slam payoff Slot. |
| `slow_fortify` | Slow Window plus the currently legal Fortify load, charge, or fire opportunities. |
| `whelp_pressure` | Living Whelps, legally targetable charged Sweeping Blow targets, and explicit `route_blocking_relevance` facts. |

`route_blocking_relevance` is authoritative only when `BoardQuery.is_legal_route_blocker` proves that a living Whelp occupies an adjacent destination that would otherwise be a legal voluntary move. It includes the Whelp ID, blocked destination, and reason `adjacent_legal_move_occupied`. A distant Whelp, a non-Whelp Minion, or a Whelp on a voluntarily blocked Hazard hex does not create route pressure. UI must render this fact; it must not reconstruct it from enemy count, artwork, or board geometry.

## Verification

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe tutorial_prompt_projection
```

`TUTORIAL_PROMPT_PROJECTION_PROBE_OK prompts=7` proves intended and invalid/irrelevant states for every authored trigger, including the explicit Whelp route-blocker and legal Sweeping Blow facts. It is scene-free and makes no UI, action, timing, content, analytics, or Encounter Record changes.
