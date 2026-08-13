# Product Backlog

Status: active intake
Owner: Product Management

## Purpose

Hold PM-owned feature proposals before they become implementation work. Product discovery and user approval happen here; delivery planning happens through the orchestrator.

## Flow

1. Capture a proposal in `issues/` with `Status: needs-triage`.
2. Keep unresolved product decisions in the issue or its linked canonical document.
3. After user approval, change the issue to `Status: ready-for-agent`.
4. Send the approved issue path to the orchestrator for decomposition and assignment.
5. Move implementation-specific work into its own `.scratch/<feature>/` directory when the orchestrator opens the delivery effort.

## Boundaries

- This is not a second implementation tracker.
- `map.md` is the PM priority view; issue files are the proposal records.
- Rules, architecture, UI behavior, and test contracts remain in their established canonical documents.
