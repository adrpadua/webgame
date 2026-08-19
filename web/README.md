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
npm run hooks:install    # once per clone: installs the pre-push gate below
npm run verify:local     # build + smoke. The browser half of the gate: the
                         # scripted first turn, ordinary round play, Scenario
                         # replay, time travel, headless record verification,
                         # the notification zones, and a 390x844 portrait
                         # guard (whole board on screen, 44px targets, no
                         # scroll). Runs automatically on push once the hook
                         # is installed; `git push --no-verify` skips it.
npm run headless -- --scenario embermaw_solo_ceiling   # headless Scenario run
npm run headless -- --replay <record.json>             # verify a v2 record
npm run film -- --shot hazard   # after build: film a board effect frame by
                                # frame into web/film/ with a contact sheet
```

## Filming a board effect

Board Feedback is animation, and every animation in the board so far was found
to be wrong by watching it rather than by reading it — a flame drawn behind the
Hero, a tint whose arguments were the wrong way round and did nothing at all.
Both passed their unit tests.

`scripts/film.mjs` captures one moment frame by frame and lays the frames out
as a contact sheet, so the shape of a curve is one image rather than a folder:

```bash
npm run build
npm run film -- --list                     # the named shots
npm run film -- --shot hazard              # a Hazard landing, framed on its hex
npm run film -- --fact "Spawn " --scenario embermaw_brood_pressure
```

A shot is a committed Scenario plus the Resolution Fact to stop in front of:
loading the Scenario and stepping forward through time travel replays that step
exactly as the session played it, so no shot has to know which cards to drag.
Frames are captured with `page.screenshot()` rather than a CDP screencast —
the board is a WebGL canvas, and a screencast can hand back a buffer that has
already been presented, which reads as a flicker no player would ever see.
Output lands in `web/film/<shot>/` and is ignored by git.

## Play on an iPad (or any device)

The Workbench is a fully static build, so it deploys to GitHub Pages via
`.github/workflows/deploy-workbench.yml` after every merge to `main`. Pull
requests run the test, mutation-audit, lint, and build gates in CI; the
browser smoke runs locally instead, on push, via the pre-push hook
(`npm run hooks:install`). It was in CI until 2026-08-19 and could not be
relied on there — `playwright install --with-deps` shells out to apt-get on a
hosted runner, and a slow Ubuntu mirror failed the check for reasons no author
could act on. The post-merge deployment only installs dependencies, creates
the Pages build, and publishes it.

Pages is enabled for this repository (Settings → Pages → Source: "GitHub
Actions"), so every deploy lands at `https://adrpadua.github.io/webgame/` —
open it in Safari on the iPad and use **Share → Add to Home Screen** for a
full-screen app. The repo is private but the published site is public to
anyone with the URL. Any static host (Netlify, Cloudflare Pages) works the
same way, with `VITE_BASE` set to that host's serving path.

Touch is first-class on iPadOS Safari: drag Compact Cards with a finger to
prepare, charge, or move; press the Hero to preview routes, or drag it onto a
legal hex — the Hand then lifts its cards and the one tapped pays for the
step; tap the program strip to expand or collapse it. Every drag also has a tap path — tap a Compact Card
to select it, then tap a Slot or a move-pad direction — and replacing an
occupied Slot always asks for confirmation, since it discards the Top Card and
its Charge Stack.

Press and hold anything named on the HUD — a Compact Card, a Slot, a boss
beat chip, a Hero stat, the round track, the boss bar — for a Detail Popup
with that object's numbers and full authored text. The HUD itself stays down
to names, numbers, and colour; the sentences live one gesture away. On a
desktop the same popups open on hover, one element at a time, so hovering a
single boss beat explains that beat while holding the strip on a phone gives
the whole two-track program. Holding `Enter` or `Space` on a focused control
does the same thing from a keyboard.

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
