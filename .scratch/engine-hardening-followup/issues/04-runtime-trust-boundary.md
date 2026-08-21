# 04 — The runtime trust boundary (P2)

Status: open — pre-multiplayer; required before any client-controlled payload reaches the engine

## Scope

The player/system type split (PR #142) is a compile-time boundary only: types erase at runtime, `isPlayerCommand()` classifies the `kind` discriminator without validating the payload, public `resolve()` accepts the full action union, and `submitSystemAction()` is an intentional Workbench debug seam. None of that is a security boundary, and no surface should claim server authority from the TypeScript split alone.

## Deliverable

One runtime-validated player-command entry point that shares its schema authority with Scenario/replay input (`scenarioActionSchema` is already the declared vocabulary with a two-way module-load guard — the entry point parses through it, never through a parallel schema). Raw system-action resolution stays on an internal or explicitly trusted seam.

## Acceptance criteria

- Every system-action kind is refused at the external boundary, tested kind by kind.
- Malformed payloads of declared player kinds (wrong field types, missing targets) are refused before `legality()` is consulted.
- The Workbench debug seam remains reachable for tests and stays off the replay record, as documented.
- Replay/Scenario input and the live entry point cannot drift: one schema authority, guarded.

## Deferral trigger

No network architecture is required now. This lands before multiplayer or any other untrusted input seam ships.
