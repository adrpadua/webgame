# 04 — The runtime trust boundary (P2)

Status: delivered (this session)

## Delivered

- **`resolvePlayerCommand(catalog, state, payload: unknown)`** in `engine/submit.ts` — the one runtime-validated player-command entry point. It parses through `scenarioActionSchema` itself (the declared vocabulary, already guarded two ways against `PLAYER_COMMAND_KINDS` at module load), so the live boundary and the replay seam share one schema authority by construction and can never drift. Returns `{accepted: true, action, result}` with the parsed (unknown-keys-stripped) command, or `{accepted: false, reason}`.
- **The division of labour, stated in the module header**: the boundary refuses *malformed* input with no fact — the action never existed; a well-formed but *illegal* command is admitted and refused by `legality()` with a recorded fact, exactly as from a trusted caller. Raw `resolve()` stays the internal, trusted seam; `submitSystemAction` stays the documented off-replay Workbench debug injection.
- **The seam has a real adapter from day one**: the Workbench's `submit` now routes through `resolvePlayerCommand`, so the live submit path continuously exercises the exact validation a future untrusted client will meet (one adapter is a hypothetical seam; this makes it the actual path). A typed UI action failing the parse is a Workbench bug and surfaces on the rejection channel.
- **Tests** (`commandSpace.test.ts`, four new): every system-action kind refused kind by kind, via a mapped type over `SystemActionInput['kind']` — a new system kind cannot compile without an explicit boundary row; malformed player payloads (null, primitives, missing/wrong-typed fields, unknown kinds) refused; the well-formed-but-illegal split pinned (accepted, refused on the record); an accepted command resolves identically to the trusted seam with forged keys stripped.

## Evidence

Typecheck (`parsed.data` assigns to `PlayerCommandInput` with no cast — the schema's inferred type matches the union structurally), lint, and the full suite (664/664) green before the gate; zero existing-test edits.

(gate results stamped below on completion)

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
