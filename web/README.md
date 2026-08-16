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
prepare, charge, or move; drag or press the Hero to preview routes; tap the
program strip to expand or collapse it. Every drag also has a tap path — tap
a Compact Card to select it, then tap a Slot or a move-pad direction — and
replacing an occupied Slot always asks for confirmation, since it discards
the Top Card and its Charge Stack.

Press and hold anything named on the HUD — a Compact Card, a Slot, a boss
beat chip, a Hero stat, the round track, the boss bar — for a Detail Popup
with that object's numbers and full authored text. The HUD itself stays down
to names, numbers, and colour; the sentences live one press away. Holding
`Enter` or `Space` on a focused control does the same thing from a keyboard.

A first visit opens the `embermaw_first_turn` Encounter with the scripted
first turn running: a single guided Round that walks preparing both Slots,
charging one, firing it in the Quick Window, stepping out of the telegraphed
breath cone, and firing the slow Slot — dimming every control the current
step did not name. It retires itself when the Round ends or when the player
skips it, and a returning player opens the standard `embermaw_prototype`
Encounter instead.

## Layout

- `src/engine/` — Encounter Engine: `resolve(state, action)`, legality,
  seeded RNG with audit trail, boss beat resolution, phase orchestration.
  A lint rule keeps `react`/`phaser`/store imports out.
- `src/content/` — loads and validates `data/*.json` through the engine's
  zod schemas.
- `src/store/` — zustand wrapper that owns the session timeline (snapshot
  history with time travel, Resolution Fact log, Scenario replay/export);
  preserves the running Encounter across HMR. `onboarding.ts` holds the
  UI-only onboarding state (guide visibility, scripted-first-turn
  completion, dismissed coach tips), deliberately off the session timeline.
- `src/board/` — the Phaser hex board. It renders engine snapshots and
  reports hex-level intents; it owns no game state. `effects.ts` translates
  a resolved batch of Resolution Facts into the board feedback the scene
  plays, so animation can never claim something the rules did not resolve.
- `src/ui/` — React: hand, Action Bar, phase control, HUD, debug rail
  (Scenario picker, time travel, fact log, seed control), plus the
  onboarding layer: a reusable `Modal` surface, the `HoldPopover`
  tap-and-hold detail surface (with the explanatory copy collected in
  `holdDetails.ts`), the state-derived `firstTurnScript.ts` and its
  `FirstTurnCue` bar, the illustrated How to Play guide (auto-opens on
  first visit, reopens from the `?` button), state-driven `CoachMark`
  prompts, and the transient `PhaseBanner`. All motion freezes under
  `prefers-reduced-motion`.
- `scripts/generateScenarios.ts` — policy search over the engine that
  authors the committed victory/defeat Scenarios in `data/scenarios/`
  (run with `npx vite-node scripts/generateScenarios.ts`).
- `scripts/runHeadless.ts` — headless Node runner: plays Scenarios and
  verifies Encounter Records (`schema_version: 2`, see
  `docs/artifacts/encounter-records.md`) by deterministic replay.
