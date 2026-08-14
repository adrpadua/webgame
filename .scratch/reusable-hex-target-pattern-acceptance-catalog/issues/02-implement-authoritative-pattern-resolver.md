# Implement Authoritative Pattern Resolver

Status: resolved
Owner: Architecture
Blocked by: 01

## Outcome

Implement the smallest `BoardQuery`/rules-authoritative axial pattern catalog and stable result contract specified by issue 01. Geometry must resolve before filtering and clip to legal board cells.

## Canonical sources

- `CONTEXT.md`
- `docs/rules/headless-rules-sdk.md`
- `docs/rules/prototype-rules.md`
- `docs/artifacts/probe-harness.md`

## Non-goals

No EncounterEngine behavior change, UI/preview, card effect, encounter change, image-driven geometry, or generalized bespoke Boss-pattern API.

## Required return

Use the mandatory return packet with public contract, paths, focused validation, and the exact handoff for Test Automation.

## Implementation return

State: completed.

Outcome: `BoardQuery.resolve_target_pattern(board_hexes, catalog_id, origin, options = {})` now owns the reusable Target Pattern catalog result seam. The result exposes `catalog_id`, `selection_binding`, `origin`, `anchor`, `facing`, and stable ordered on-board `impacts`. Geometry resolves before any combatant, allegiance, range, or target filter; edge cells are clipped by board membership only.

Catalog: `Target`, `Radius`, `Ring`, `FrontCone`, `BackCone`, `FrontLine`, `BackLine`, `Sides`, and `Cross`. Directional patterns accept `options.facing` as one legal hex-edge Facing and `options.range >= 1`; `Radius` accepts `radius >= 0`; `Ring` accepts a non-empty positive `distances` set. `Target` uses the selected Piece's already-resolved current hex as `origin`; this is not a generic Enemy selector.

Non-goals preserved: no `EncounterEngine` behavior change, targeting or preview UI, live card effect, encounter/content behavior, image-driven geometry, bespoke Boss-pattern API, or promotion of `Pinwheel`, `Stripes`, `SafeButt`, or `RaidWide`.

Changed paths:

- `scripts/hex/BoardQuery.gd`
- `scripts/debug/target_pattern_resolver_probe.gd`
- `scripts/debug/run_probes.ps1`
- `docs/artifacts/probe-harness.md`
- `docs/rules/headless-rules-sdk.md`
- `.scratch/reusable-hex-target-pattern-acceptance-catalog/issues/02-implement-authoritative-pattern-resolver.md`

Validation:

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\debug\run_probes.ps1 -Probe target_patterns` -> `TARGET_PATTERN_RESOLVER_PROBE_OK patterns=9 facings=6`; `PROBE_SUITE_OK count=1`.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\debug\run_probes.ps1 -Probe rules,resolver,target_patterns` -> `SDK_ENCOUNTER_HARNESS_OK`; `ENCOUNTER_RESOLVER_PROBE_OK`; `TARGET_PATTERN_RESOLVER_PROBE_OK patterns=9 facings=6`; `PROBE_SUITE_OK count=3`.

Next owner: Test Automation should independently verify issue 03 using the public BoardQuery seam, with central/edge anchors, stable order, binding coverage, legal-board clipping, all nine patterns, and all six legal Facings for directional entries.
