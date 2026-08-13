# Spikes and Probes Harness

The harness keeps the **Encounter** rules and player-facing presentation independently verifiable while the prototype evolves. It is a runner over existing Godot headless scripts, not a competing test framework.

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe rules,resolver
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Scenario full_charge_cleanup
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Godot 'C:\path\to\Godot_console.exe'
```

The default suite is intentionally named and stable. The runner gives each Probe a 15-second ceiling and fails on a non-zero Godot exit, engine error, or failed assertion:

| Probe | Contract |
| --- | --- |
| `content` | Every designer-authored Resource loads and satisfies the content contract, with actionable path-based failures. |
| `rules` | Scene-free **Encounter** rules, action records, Slots, Status Effects, Hazards, and Boss Timeline execution. |
| `parity` | Visible direct-manipulation flows project the same rules state and outcomes owned by `EncounterEngine`. |
| `resolver` | Spatial resolution of authored Boss Timeline beats from an `EncounterSnapshot`. |
| `encounter` | New-player direct-manipulation flow through several complete Rounds. |
| `layout` | Desktop responsive-layout bounds. |
| `mobile` | Portrait HUD hierarchy and mobile interaction contract. |
| `accessibility` | Touch target, focus, and command contrast contract. |
| `replay` | Seeded, replayable Full-Charge Cleanup scenario and JSON failure-artifact schema. |

## Lifecycle

A **Spike** is a short-lived, decision-seeking experiment. Put it in `scripts/debug/` with a descriptive `_spike.gd` name, state its question and exit condition at the top, and do not add it to the default suite.

A **Probe** protects a decided, observable contract. Put it in `scripts/debug/` with a descriptive `_probe.gd` name; run it headlessly; give success output a stable `*_OK` marker; use explicit assertion messages in the project vocabulary; and add it to `run_probes.ps1` only when it is deterministic and worth retaining.

When a Spike answers its question, either delete it or promote the durable assertion into a Probe. Record an enduring rule in `docs/rules/` and an architectural choice in `docs/adr/`; keep evidence and playtest observations in `notes/` or `docs/artifacts/`.

Encounter scenarios use setup-only fixtures, then only legal `EncounterAction` records. The runner can execute one named scenario with `-Scenario <id>`. Probe failures write normalized JSON evidence beneath Git-ignored `tmp/probe-artifacts/<scenario-id>/`; retain those artifacts until diagnosis is complete, then clean them with `Remove-Item -Recurse -Force ./tmp/probe-artifacts`.

## Why this shape

The repository already has the key seam: ADR 0009 makes `EncounterEngine` the scene-free source of truth, while the scene probes cover the adaptation layer. The harness makes that separation routine: a mechanic first earns a rules-level Probe, and a player-visible contract then earns a focused scene/UI Probe. This is the useful part of Duelyst's SDK split without importing its server, PvP, replay, or collectible-card infrastructure.
