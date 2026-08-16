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
node scripts/smoke.mjs   # after build: browser round loop, Scenario replay,
                         # time travel, and headless record verification
npm run headless -- --scenario embermaw_victory_line   # headless Scenario run
npm run headless -- --replay <record.json>             # verify a v2 record
```

## Play on an iPad (or any device)

The Workbench is a fully static build, so it deploys to GitHub Pages via
`.github/workflows/deploy-workbench.yml` on every push to `main` (or the
active workbench branch) that touches `web/`, `data/`, or the workflow file
itself.

Pages is enabled for this repository (Settings → Pages → Source: "GitHub
Actions"), so every deploy lands at `https://adrpadua.github.io/webgame/` —
open it in Safari on the iPad and use **Share → Add to Home Screen** for a
full-screen app. The repo is private but the published site is public to
anyone with the URL. Any static host (Netlify, Cloudflare Pages) works the
same way, with `VITE_BASE` set to that host's serving path.

Touch is first-class on iPadOS Safari: drag Compact Cards with a finger to
prepare, charge, or move; hold a card for Card Inspection; drag or press the
Hero to preview routes; tap the program strip to expand or collapse it.
Every drag also has a tap path — tap a Compact Card to select it, then tap a
Slot or a move-pad direction — and replacing an occupied Slot always asks
for confirmation, since it discards the Top Card and its Charge Stack.

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
- `scripts/runHeadless.ts` — headless Node runner: plays Scenarios and
  verifies Encounter Records (`schema_version: 2`, see
  `docs/artifacts/encounter-records.md`) by deterministic replay.
