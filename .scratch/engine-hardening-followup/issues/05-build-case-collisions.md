# 05 — Build portability: module-casing collisions (review 2, P0)

Status: delivered (this session)

Four UI component/helper pairs differed only by basename capitalization (`BeatCard.tsx`/`beatCard.ts`, `HeroFrame.tsx`/`heroFrame.ts`, `PartyFrames.tsx`/`partyFrames.ts`, `StatusIcons.tsx`/`statusIcons.ts`). On this repo's case-sensitive gate machines the import specifier can only resolve the intended file, so every gate ran green — but on a case-insensitive checkout (the reviewer's macOS clone) the same specifier can resolve the lowercase helper first, and a clean production build fails with missing-export and inconsistent-casing errors (TS1149, TS1261, TS2305, TS2724). Verified here: all four pairs existed on main; the failure class is invisible to this repo's own gates by construction.

## Delivered

- The four helpers renamed to semantically distinct names (the review's suggestions, adopted): `beatCardModel.ts`, `heroFrameModel.ts`, `partyFrameModel.ts`, `statusIconEntries.ts`, with their test files following (`*.test.ts` renames alongside). Ten import sites updated; no export renamed, no behavior touched.
- Seven mutation-audit anchors re-pointed by path (six in `beatCardModel.ts`, one in `partyFrameModel.ts`); the anchored code is unchanged.
- **The guard**: `scripts/check-module-casing.mjs` fails when any directory holds two module files whose names-without-extension collide case-insensitively — the precise class, checkable on any filesystem. Wired into `verify:local` ahead of the suite. A module and its `.test` file never collide because the `.test` suffix is part of the name.

Red proven before green: run against the pre-fix tree, the guard names exactly the four shipped pairs and exits 1; post-fix it is silent, and UI tests (152), typecheck, and a production build all pass.

Not adopted from the review: a clean-checkout build in the normal validation path — the guard catches this class deterministically and cheaply on every machine, while a second full build per gate would roughly double the slowest gate stage to re-detect what the guard already refuses.

## Evidence

Isolated gate green end to end on `c29cbe9`, with the new casing guard running as the gate's second step: guard silent, log:ids clean, 651 tests passed, lint, build, and browser smoke clean, mutation audit **127/127 caught, 0 survived, 0 stale** — all seven re-pointed anchors killing through the renamed files and tests. EXIT:0. Red half recorded above: against the pre-fix tree the guard names exactly the four shipped pairs and exits 1.
