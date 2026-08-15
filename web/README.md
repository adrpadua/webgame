# Encounter Workbench

The browser surface for playing and inspecting Encounters during design
iteration (ADR 0019). The Encounter Engine in `src/engine/` is the rules
source of truth: a pure reducer implementing `CONTEXT.md` and `docs/rules/`,
consuming the schema-validated JSON content in the repo-level `data/`
directory (ADR 0020).

## Run

```bash
npm install
npm run dev      # Workbench at http://localhost:5173 with HMR
npm test         # Encounter Engine Vitest suite
npm run lint     # includes the engine-purity boundary rule
npm run build
node scripts/smoke.mjs   # after build: browser-driven full Round loop
```

## Layout

- `src/engine/` — Encounter Engine: `resolve(state, action)`, legality,
  seeded RNG with audit trail, boss beat resolution, phase orchestration.
  A lint rule keeps `react`/`phaser`/store imports out.
- `src/content/` — loads and validates `data/*.json` through the engine's
  zod schemas.
- `src/store/` — zustand wrapper that owns the session timeline (snapshot
  history with time travel, Resolution Fact log, Scenario replay/export);
  preserves the running Encounter across HMR.
- `src/board/` — the Phaser hex board. It renders engine snapshots and
  reports hex-level intents; it owns no game state.
- `src/ui/` — React: hand, Action Bar, phase control, HUD, debug rail
  (Scenario picker, time travel, fact log, seed control).
- `scripts/generateScenarios.ts` — policy search over the engine that
  authors the committed victory/defeat Scenarios in `data/scenarios/`
  (run with `npx vite-node scripts/generateScenarios.ts`).
