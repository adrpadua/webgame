# 02 — Direct resolver-level terminal-ordering coverage (P4)

Status: delivered (this session)

Extend the D-096 tests so every ending is produced by a real resolver tree or phase script rather than staged by hand, cover the two originally-named pathological cases that had only indirect coverage (detonation-mid-tree, phase-terminal-during-script), and reconsider the `checkResolution` export. D-096 itself is unchanged.

## Delivered

Three new/replaced tests in `engine/terminal.test.ts`, on one probe fixture:

- **Mutual zero through one real tree** (replaces the direct-mutation test): a self-cover Last Stand — lethal `boss_damage` plus a `scale` Reader turning the chosen ally's Brand into `target_damage` — fired at the firing Hero (the P0 self-cover path). One fired batch zeroes the Boss and the last Hero before the single deferred terminal evaluation; both damage facts land unsuppressed and the Boss-asked-first clause resolves it as victory.
- **Detonation-mid-tree**: one blast catches the last living Hero and a Downed body, in the caught list's sorted order. The first damage ends the Encounter at its node boundary; the second is a sibling in the same detonation tree and appears on the stream as a refusal. A second due fuse pins the script edge: the phase script stops submitting once the Encounter is over, so the second Whelp neither detonates nor leaves a fact and is still standing afterward.
- **Phase-terminal-during-script**: a claw program with two lethal instant Beats. The first fells the solo Hero; its own damage fact precedes the boundary intact, and the second Beat's `resolve_boss` is submitted by the unguarded instant-row loop and refused on the stream.

`checkResolution` is no longer exported from `engine/index.ts` — it mutates authoritative state without producing a fact, so public consumers cross `resolve()` or `advancePhase()`; internal callers (`setup.ts`, `advancePhase.ts`) import from `./resolve` directly. The export existed only for the old direct-mutation test, which the real-tree test replaces. Typecheck confirms no other consumer.

## Finding recorded, no behavior change

Building the detonation fixture surfaced an asymmetry the D-096 comment glossed: within a submitted tree, remaining actions are refused with recorded facts; but the quick-phase detonation loop (and the minion end step) `break` once the Encounter ends, so a not-yet-submitted script action leaves no fact at all — while the loadout case's instant-row loop is unguarded and its submissions ARE refused on the stream. The clause-3 comment in `resolve.ts` now states both edges precisely ("a phase script that has not yet submitted an action simply stops instead"), and the tests pin each as-is. Whether the script edges should converge (always-submit-and-refuse would add facts to replay streams — a semantic change) is left as an explicit future decision, not smuggled in here.

## Evidence

Isolated gate green end to end on `1322f13`: log:ids clean, 629 tests passed across 39 files (the three new terminal tests included), lint, build, and browser smoke clean, mutation audit **116/116 caught, 0 survived, 0 stale**, EXIT:0. Typecheck confirms `checkResolution` has no remaining public consumer.
