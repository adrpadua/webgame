# 06 — Split engine.test.ts along its seams

Status: delivered (this session)

The repo's #1 churn file (5,532 lines, 38 top-level describes, 55 commits in six months) covered a dozen module seams in one place, so every engine change of any kind concentrated its test churn there.

## Delivered

- **Twelve seam test files**, each holding its module's describes verbatim: `catalogContent` (the whole validation battery), `programs`, `beats`, `escalation`, `movement`, `minions`, `counters`, `firedCard`, `damage`, `round`, `slotRules`, `replay` — joining the focused files that already existed (`events`, `terminal`, `party`, `attrition`, `legalActions`, `commandSpace`).
- **`testkit.ts`** — the shared fixtures and staging helpers (`start`, `hero`, `boss`, `card`, `immortalHero`, `startBroodSecond`, `standingMinionCatalog`, `stepPhases`, `answerDemands`, `answeredRound`), extracted whole; test support only, never imported by the app, and not a `.test` file so vitest doesn't try to run it.
- **The proof of preservation is arithmetic**: 665 tests before, 665 after, across 50 files (39 − 1 + 12); every describe moved as an unmodified slice; import lists derived mechanically (a tsc-driven prune of 495 unused names). No mutation anchors point at test files, so none moved.

## Recorded, not taken

The survey's two deeper findings stay open as future work, deliberately outside this mechanical split: the 97 hand-built state mutations (vs 10 `runScenario` uses) that Scenario staging should progressively absorb, and the three `index.ts` exports that exist only for tests (`escalationActionsForRoundEnd`, `buildProgramSequence`, `programPredictability`) — retiring them needs their tests re-seamed, a per-module conversation now that each module has its own file.

## Evidence

Typecheck, lint, and the full suite (665/665, 50 files) green before the gate.

(gate results stamped below on completion)
