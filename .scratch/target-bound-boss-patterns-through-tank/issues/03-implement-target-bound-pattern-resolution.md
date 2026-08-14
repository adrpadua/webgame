# Implement Target-Bound Pattern Resolution

Status: resolved
Owner: Architecture
Blocked by: 01, 02

## Outcome

If delivery-depth approval includes implementation, extend the existing geometry seam with source-to-selected-target Facing snap, target inclusion, beyond-target continuation, and clipping. Do not touch live default encounter content.

## Implementation return

State: completed.

Outcome: `BoardQuery.resolve_target_bound_pattern(board_hexes, source_piece, candidate_pieces, target_selector, catalog_id, options = {})` now composes the existing Target Selector and Target Pattern seams. It resolves the selected Tank first, derives source-to-selected-target Facing snapped to one legal hex edge, resolves the existing directional Target Pattern from the source origin, supports authored selected-Piece inclusion and beyond-selected continuation, clips off-board cells, and exposes selected Piece identity separately from affected Piece IDs. Same-hex source/target cases return `valid = false` with `invalid_reason = "same_hex_no_direction"` unless a future authored fallback explicitly opts in.

Non-goals preserved: no default Embermaw resource edits, Raking Claw/Cinder Breath change, player-card targeting UI, arbitrary angle, player-facing persistent facing, general migration, live encounter behavior, or scene presentation.

Changed paths:

- `scripts/hex/BoardQuery.gd`
- `scripts/debug/target_bound_pattern_probe.gd`
- `scripts/debug/run_probes.ps1`
- `docs/artifacts/probe-harness.md`
- `docs/rules/headless-rules-sdk.md`
- `.scratch/target-bound-boss-patterns-through-tank/issues/03-implement-target-bound-pattern-resolution.md`

Validation:

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\debug\run_probes.ps1 -Probe target_bound_patterns` -> `TARGET_BOUND_PATTERN_PROBE_OK facings=6`; `PROBE_SUITE_OK count=1`.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\debug\run_probes.ps1 -Probe target_patterns,target_bound_patterns,resolver` -> `TARGET_PATTERN_RESOLVER_PROBE_OK patterns=9 facings=6`; `TARGET_BOUND_PATTERN_PROBE_OK facings=6`; `ENCOUNTER_RESOLVER_PROBE_OK`; `PROBE_SUITE_OK count=3`.

Next owner: Test Automation should independently verify issue 04 against the BoardQuery seam, including source-to-target snap, legal Facing only, selected Tank inclusion, continuation, clipping, and selected-versus-affected Piece distinction.
