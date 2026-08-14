# Define Mobile Safe-Bounds Contract and Scope

Status: resolved
Owner: Coordinator

## Outcome

Record the approved scope and validation bar, then define the canonical safe-bounds contract: ownership of control lanes/containers, what adapts under pressure, and in-bounds/readability/target guarantees.

## Canonical sources

- `docs/artifacts/embermaw-vertical-slice.md`
- `docs/artifacts/accessibility.md`
- `docs/artifacts/probe-harness.md`
- approved proposal 10

## Non-goals

No implementation, merger with parser/current mobile-regression work, HUD redesign, or new buttons.

## Required return

After PM/user scope decisions, assign UI/UX the implementation issue with explicit safe-bounds acceptance and an independent Architecture/QA handoff.

## User decisions

On 2026-08-14, the user approved both recommendations:

- The contract covers always-visible required controls and transient prompt-adjacent required controls.
- The validation bar requires fully in-bounds controls, explicit edge padding, and readable non-clipped labels/icons.

These decisions do not authorize an overall HUD redesign, new utility controls, or a merger with the separate active mobile-layout regression.
