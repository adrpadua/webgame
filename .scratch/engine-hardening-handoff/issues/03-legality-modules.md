# 03 — Legality modularization (P3)

Status: delivered (Architecture: this session)

Split `legality.ts`'s case bodies into focused validators behind the unchanged public `legality(catalog, state, action)` seam. No second predicate, no rules change, no test expectation changes beyond imports. Pure housekeeping; safe for any session.

## Delivered

The seam is untouched: `legality(catalog, state, action)` remains the single public predicate, and no test changed — the issue's own bar for "no second authority."

The structure chosen departs from the handoff's sketched six-file directory, deliberately: five of those files would have been shallow modules (a 15-line validator behind a 4-parameter signature), while the actual strain was one cluster — `fire_slot`, 133 of 294 lines. So:

- `legality.ts` keeps the seam and the per-command validators as named file-local functions (`loadSlotLegality`, `chargeSlotLegality`, `reviveAllyLegality`, `diminishedActionLegality`, `moveHeroLegality`, `discardForStaminaLegality`), turning the dispatch into a table of contents.
- `fireLegality.ts` holds the one deep cluster — `fireSlotLegality` with its six order-sensitive targeting families kept as ONE focused function, because the `targetVerdict`/`bossVerdict` threading is the rule: later families key off the verdict still being unset, and splitting that across fragments would trade one deep implementation for six shallow interfaces passing verdict state around.
- `verdicts.ts` carries the shared verdict grammar (`legal`/`illegal`), internal to the module, avoiding an import cycle between the seam and its cluster.

Five mutation-audit anchors re-pointed onto the new bodies (three follow the cluster to `fireLegality.ts`, two outdent in place), each verified to match exactly once before the audit ran.

## Evidence

611 tests green with zero test-file edits; typecheck clean; isolated gate green end to end — lint, build, browser smoke, and the mutation audit at **115/115 caught, 0 survived, 0 stale**, all five re-anchored legality mutants killing through the new file layout.
