# 02 — Give the Round one seam

Status: delivered (this session)

`advancePhase` was a script, not a module: five phase scripts inline in one switch, the cycle stated only as hand-written `advanceAction(from, to)` calls, and the Round's boundary bookkeeping as the untitled 91-line tail of the `slow` case. `advancePhase.ts` had never committed without `resolve.ts` (13/13), and the recorded intent to fold Loadout's job into Quick and Slow landed in five engine files.

## Delivered

- **`NEXT_PHASE`** — the cycle declared once as authored data. Still explicit, deliberately not a generalized phase machine (the engine-hardening non-goal stands, stated in the table's comment). The Loadout fold now starts at this table.
- **Named phase scripts** — `loadoutScript`, `instantScript`, `quickScript`, `incomingScript`, `slowScript` — dispatched through a compile-complete `Record<Phase, PhaseScript>`: a phase added to the union cannot ship without deciding its boundary script, the same never-guard shape as the fire-target enumeration.
- **`wrapRound`** — the boundary's bookkeeping ordered in one named place: escalation step → end-of-clock → `round_start` → rescue expiry → refill → advance. What each submitted action *does* deliberately stays with the resolver (`round_start`'s case carries the board tick, Armor wipe, upkeep, and program advance) — those are action resolutions, and the fact stream is their record; what this owns is the order the boundary asks its questions in.
- **Early returns simplified provably**: each script's mid-script `return {state, facts}` became a plain `return` with `checkResolution` hoisted after dispatch — a no-op on an ended draft, so the submitted-action stream is byte-identical.

Scripts' bodies carried over verbatim, comments included. The one mutation anchor in this file (`if (detonated && draft.active) {`) is indentation-agnostic and stays matched.

## Evidence

Typecheck, lint, and the full suite (660/660, sealed replays included) green before the gate; zero test-file edits.

(gate results stamped below on completion)
