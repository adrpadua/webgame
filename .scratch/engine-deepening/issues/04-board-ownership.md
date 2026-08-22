# 04 — Let the board own the board (first slice: removePiece)

Status: delivered (this session)

`board.ts` had deep functions over a fully exposed struct, and no way to remove a piece — so removal was a raw entity-delete/counter-drop pair repeated at every consuming site, which is how the "a Counter never outlives its host" invariant (D-045) ended up implemented three times eagerly (the detonation, the Minion Defeat inside damage, the incapacitation) with the round-upkeep sweep as a fourth, lazy copy.

## Delivered

- **`removePiece(state, entityId)`** in `board.ts` — the one way a piece leaves the board mid-Encounter: entity delete plus Counter drop as a single move, stated once. It takes the whole `EncounterState`, unlike the `BoardState` functions around it, because the invariant spans both stores — that is the point of it. Import direction is clean: `board.ts → counters.ts`, no cycle.
- **All three eager sites converted**: `detonate_minion` (`resolve.ts`), Minion Defeat inside `applyDamage` (`resolve.ts` — one site the survey missed used raw deletes there too), and `incapacitateHero` (`downed.ts`, which was already half-right, using `clearCounters` beside a raw entity delete). The round-upkeep sweep in `counters.ts` remains as the documented lazy backstop for hosts no eager path sees (hex and slot hosts).
- **One mutation anchor re-pointed**: "a detonating Minion stays on the board" now removes the `removePiece` call; same mutant semantics (the Minion and its Counters survive the blast), still killed by the D-063 tests.

## Remaining slices, recorded not taken

Per the review's incremental framing: facing ownership (three movement paths, three facing rules — `move_hero` pokes the entity after `moveEntity`, deliberate per-kind differences per ADR 0029 make this a design conversation, not a mechanical move) and geometry-over-`BoardState` (`neighbors`/`frontArc`/`forwardCone` taking the raw hex record forces ~15 files to reach inside — wide mechanical churn, worth its own slice). The 107 direct `.board.*` accesses shrink commit by commit, not in one bang.

## Evidence

Behavior-preserving: end state of every removal identical (`clearCounters` checks-then-deletes where the raw pair deleted blindly — same result); zero test edits; 660/660 green with typecheck and lint clean before the gate.

(gate results stamped below on completion)
