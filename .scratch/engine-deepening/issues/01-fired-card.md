# 01 — Deepen the Fired Card into one module

Status: delivered (this session)

The Fired Card — the engine's deepest concept — was smeared over four files: the 258-line `fire_slot` case in `resolve.ts`, a `cardResolver.ts` that in its whole history never once changed without `resolve.ts` (6/6 commits), the `scale`/`spend` Reader executors as `resolve.ts` file-privates, and two line-for-line copies of the effect-mapping switch. The cost-spend → charge arithmetic → scale → resolution-spend ordering was a prose contract at the call site, and `FireEffects` crossed the seam as a mutable bag the caller kept mutating.

## Delivered

- **`firedCard.ts`** — the whole fire resolution behind one seam, `resolveFiredCard(catalog, draft, action, fact, generated)`, mirroring the resolver's other deep cases (displacement, traversal). Inside, in their fixed order: cost spends, the Charge arithmetic (`resolveFire`, absorbed from the deleted `cardResolver.ts` and now module-internal along with `FireEffects`), scale Readers, recipients and the overflow conversion, burst geometry, Counter placements, resolution spends, the generated damage/displacement fan-out, the full-bank rider, the `counter_spent` and `slot_fired` raises, and the draw. The ordering contract is now the implementation, not a comment.
- **One effect-mapping switch.** The Charge Modifier loop and the scale Readers shared two line-for-line copies of "which effect does a bonus land on"; both now call one `addEffect`.
- **`facts.ts`** — the fact grammar (`succeed`, `fail`, `recordSubscriberMatches`) shared by `resolve.ts` and `firedCard.ts`, the `verdicts.ts` shape on the resolver side, so the new seam needs no circular import. `syncHeroEntity` moved to `downed.ts`, where the rest of the body-mirrors-the-sheet logic already lives; `cardDrawActions` lives in `firedCard.ts` (the fired card owns the draw ritual; the diminished ally-draw borrows it).
- **What deliberately did not move**: `cardGatesPass`/`readerSubject`/`readerCount` stay in `counters.ts` — the `gate` verb is legality's (it refuses before a fire exists, ADR 0014), and both sides read the same counting substrate. The Reader grammar now has two principled homes (reading substrate + gate beside the counter store; fire-time application in the fired-card module) instead of four accidental ones.
- **Code moved verbatim** (one 6→2 re-indent, the `addEffect` collapse, and a `draft`→`state` parameter rename in `syncHeroEntity` aside), scripted rather than retyped. `resolve.ts` drops from 1,220 to ~860 lines; the `fire_slot` case is a 4-line delegation.
- **CONTEXT.md** gains the **Fired Card** term (the skill's rule: a deepened module named for a concept enters the glossary).
- **13 mutation-audit anchors re-pointed** from `engine/resolve.ts` to `engine/firedCard.ts`, each verified to match exactly once in the new file and zero times in the old (10 of them re-indented with the code they anchor).

## Evidence

Behavior-preserving by construction and by gate: zero test-file edits, full suite 657/657 green, typecheck and lint clean before the gate.

(gate results stamped below on completion)
