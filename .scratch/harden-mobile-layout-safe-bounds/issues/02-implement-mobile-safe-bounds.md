# Implement Mobile Safe Bounds

Status: blocked; scope breach requires UI remediation
Owner: UI/UX
Blocked by: Architecture found new Undo/reset control, replay, and Encounter Record lifecycle behavior inside the safe-bounds delta; remove or separately authorize that semantic work before re-verification

## Outcome

Implement the documented safe-bounds mechanism and resolve the reported Undo/top-right clipping without changing the portrait reading order, interaction authority, or Bottom Interaction Zone intent.

## Required evidence

Control-region ownership, explicit pressure behavior, canonical logical and default non-headless layout checks, and focused failing negative coverage for clipped/off-screen/unreadable required controls.

## Non-goals

No silent integration with the parser or current UI regression, no HUD redesign, new controls, or game rules.

## Required return

Return mandatory packet with paths, canonical docs, exact probes, shared-file ownership, and Architecture/QA handoff.
