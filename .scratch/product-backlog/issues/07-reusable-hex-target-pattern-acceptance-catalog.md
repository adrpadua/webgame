# Add Reusable Hex Target-Pattern Acceptance Catalog

Status: resolved

## Player Problem

Future card and Boss patterns need to feel dependable: when a player sees a cone, line, ring, or facing-based attack, they should be able to trust that it resolves on the same legal hexes every time.

The project already has useful scene-free geometry in `BoardQuery` plus a human reference library at `C:\Users\adrpa\OneDrive\Boss Battle\Code Scripts\outputs\TargetPatterns\`, but it does not yet have a canonical reusable acceptance catalog for common hex patterns. Without that catalog, future content risks drifting across facings, board edges, and target families, especially when a shown pattern is reused by multiple cards or Boss actions.

## Desired Outcome

Create an engine-validated acceptance catalog for reusable hex target patterns.

The player-facing promise is consistency: reusable pattern geometry should be authoritative, deterministic, and explainable, so future attacks that present the same shape resolve on the same legal cells regardless of facing or edge position.

Geometry is engine-authoritative and testable. Visual reference assets are human reference only and must not become runtime behavior.

## Scope

- Define a reusable catalog for these initial core pattern IDs:
  - `Target`
  - `Radius`
  - `Ring`
  - `FrontCone`
  - `BackCone`
  - `FrontLine`
  - `BackLine`
  - `Sides`
  - `Cross`
- Define the catalog contract around axial-coordinate geometry and the six legal hex-edge facings: `E`, `NE`, `NW`, `W`, `SW`, `SE`.
- Require resolver results to expose:
  - pattern ID;
  - origin or selected anchor;
  - resolved facing where applicable; and
  - a stable ordered list of impacted on-board axial hexes.
- Require pattern geometry to resolve before combatant or target filtering.
- Require edge behavior to retain only legal on-board affected hexes, with no phantom cells, wraparound, or image-derived result.
- Require each catalog entry to state its valid selection binding: no anchor, hex, piece, or direction.
- Require deterministic headless acceptance coverage for every core pattern in all six facings at both a central and an edge origin with semantic coordinate assertions.
- Map reference asset filenames to catalog IDs, parameters, and orientation in design documentation only.

## Explicit Non-Goals

- No player target-selection UX, preview UI, or aiming interface in this issue.
- No new player card targeting behavior, effects, or authored content rollout.
- No changes to current Embermaw encounter behavior.
- No requirement to promote all supplied reference patterns into first-class APIs.
- Keep bespoke shapes such as `Pinwheel`, `Stripes`, `SafeButt`, and `RaidWide` Boss-specific or composed until a concrete reusable need is approved.
- No use of PNG or SVG reference files as runtime behavior or source-of-truth geometry.

## Acceptance Evidence

Before this intake can close as delivered, evidence must show that:

1. The catalog defines the initial core pattern IDs `Target`, `Radius`, `Ring`, `FrontCone`, `BackCone`, `FrontLine`, `BackLine`, `Sides`, and `Cross`.
2. Pattern geometry uses axial coordinates and only the six legal hex-edge facings `E`, `NE`, `NW`, `W`, `SW`, and `SE`.
3. Each resolver result exposes pattern ID, origin or selected anchor, resolved facing where applicable, and a stable ordered list of impacted on-board axial hexes.
4. Pattern geometry resolves before combatant or target filtering.
5. Edge cases retain only legal on-board hexes, with no phantom cells, wraparound, or image-derived output.
6. Each catalog entry documents its valid selection binding: no anchor, hex, piece, or direction.
7. A deterministic headless probe exercises every core pattern in all six facings at both a central and an edge origin with semantic coordinate assertions.
8. Design documentation maps reference asset filenames to catalog IDs, parameters, and orientation without bulk-importing or using the image files as runtime behavior.

## Affected Areas

| Area | Product impact |
| --- | --- |
| Game Design | Owns pattern vocabulary, catalog naming, reference-asset mapping, and player-facing intent for reusable shapes. |
| Architecture | Owns the authoritative geometry API/result contract and preserves `EncounterEngine` plus `BoardQuery` as the rules authority. |
| Test Automation | Owns deterministic semantic acceptance coverage and replay-safe verification for the reusable pattern catalog. |
| UI/UX | Is a later consumer only and must use engine-resolved results rather than recomputing geometry. |
| Product Management | Keeps reusable-pattern scope separate from future target-selection UI, live card behavior, and encounter tuning proposals. |

## Canonical Documents To Consult Or Update

- [CONTEXT.md](../../../CONTEXT.md): board, facing, targeting, Hazard, and rules vocabulary.
- [Headless Rules SDK](../../../docs/rules/headless-rules-sdk.md): `EncounterEngine` authority and `BoardState` / `BoardQuery` seam.
- [Prototype rules](../../../docs/rules/prototype-rules.md): legal facings and current targeting boundary.
- [Probe harness](../../../docs/artifacts/probe-harness.md): deterministic headless probe contract.
- [Project coordination ledger](../../../docs/artifacts/project-coordination.md): cross-role ownership and handoff state.
- Human reference asset library: `C:\Users\adrpa\OneDrive\Boss Battle\Code Scripts\outputs\TargetPatterns\` (reference only; not runtime authority).

## Confirmed Product Decisions

- Geometry is engine-authoritative and testable; visual assets are human reference only.
- The initial core reusable catalog is exactly `Target`, `Radius`, `Ring`, `FrontCone`, `BackCone`, `FrontLine`, `BackLine`, `Sides`, and `Cross`.
- Pattern geometry resolves before combatant or target filtering.
- Edge behavior keeps only legal on-board hexes and never emits phantom cells, wraparound, or image-derived results.
- Catalog entries must document their valid selection binding.
- Scope expansion into player-targeting UI, live card content, or encounter tuning must return to PM and the user.

## Remaining Delivery Decisions

Product intent is clear enough for intake, but this proposal remains `needs-triage` until the user explicitly approves delivery planning. On approval, delivery may choose the smallest safe catalog-file shape, API naming details, and probe grouping as long as the confirmed geometry/result contract and non-goals are preserved.

## Risks And Dependencies

- If reusable geometry and bespoke encounter shapes are not clearly separated, the team could prematurely promote one-off Boss patterns into general APIs.
- If consumers recompute pattern geometry instead of using authoritative engine results, player-facing presentation could diverge from actual rules behavior.
- If edge handling is underspecified, future content could become inconsistent near board boundaries even when central tests pass.
- The value of this proposal depends on semantic coordinate assertions, not image matching or loose visual approximation.

## Approval Record

On 2026-08-13, Game Design routed a user-requested PM intake for a reusable hex target-pattern acceptance catalog after completing a design grill whose recommendations were explicitly accepted. Later on 2026-08-13, the user explicitly approved proposal 07 for delivery planning. This item is now `ready-for-agent`. The Orchestrator must acknowledge this exact path, create separate implementation tracking, preserve the confirmed outcome and non-goals, and return any scope expansion into player-targeting UI, live card content, or encounter tuning to PM and the user.
