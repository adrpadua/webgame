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
node scripts/check-browser.mjs   # is the browser this repo pins installed?
npm run mutate   # the mutation audit: reintroduce each documented rule's
                 # defect and fail if the suite does not notice
npm run verify:local     # THE GATE. Everything above in one command, cheapest
                         # first: browser check, tests, lint, build, smoke,
                         # mutation audit. There is no CI validation — this is
                         # it. Runs automatically on push once the hook is
                         # installed; `git push --no-verify` skips it.
                         # The smoke half covers the scripted first turn,
                         # ordinary round play, Scenario replay, time travel,
                         # headless record verification, the notification
                         # zones, and a 390x844 portrait guard (whole board on
                         # screen, 44px targets, no scroll).
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
`.github/workflows/deploy-workbench.yml` after every merge to `main`. That
workflow is the only one in this repository, and deploying is all it does.

**Validation is not in CI. It is `npm run verify:local`, and it runs on push
through the pre-push hook.** One command, one place, runnable by anyone with
the repository checked out, and it fails for reasons about the diff.

That is the end of a road worth remembering, because each step had the same
cause. The browser suite left CI first: `playwright install --with-deps`
shells out to apt-get on a hosted runner, and on 2026-08-18 a slow Ubuntu
mirror wedged three runs for 14 to 24 minutes each and then failed them. A
gate that fails for reasons you cannot act on is one everybody learns to
ignore, which is worse than not having it. It moved to a self-hosted runner
next — which is a machine that can be switched off, so the gate's honesty
depended on somebody's laptop being awake, and a skipped job reports success.
The rest followed for the same reason. A check you can run yourself, in one
command, is a check you can trust and can fix.

A pull request **from a fork never reaches the self-hosted runner** — the
smoke job is guarded on the head repository, because that job would otherwise
execute a stranger's code on someone's own machine. The post-merge deployment
only installs dependencies, creates the Pages build, and publishes it.

Pages is enabled for this repository (Settings → Pages → Source: "GitHub
Actions"), so every deploy lands at `https://adrpadua.github.io/webgame/` —
open it in Safari on the iPad and use **Share → Add to Home Screen** for a
full-screen app. The repo is private but the published site is public to
anyone with the URL. Any static host (Netlify, Cloudflare Pages) works the
same way, with `VITE_BASE` set to that host's serving path.

Touch is first-class on iPadOS Safari: drag Compact Cards with a finger to
prepare, charge, or move; press the Hero to preview routes, or drag it onto a
legal hex — the Hand then lifts its cards and the one tapped pays for the
step. Every drag also has a tap path — tap a Compact Card
to select it, then tap a Slot or a move-pad direction — and replacing an
occupied Slot always asks for confirmation, since it discards the Top Card and
its Charge Stack.

Press and hold anything named on the HUD — a Compact Card, a Slot, a phase
mark, the round track, the Escalation gauge, a Hero stat, the boss bar — for a
Detail Popup with that object's numbers and full authored text. The HUD itself
stays down to names, numbers, and colour; the sentences live one gesture away.
On a desktop the same popups open on hover, one element at a time, so hovering
a single phase mark explains that window while holding the track on a phone
draws the whole Round. Holding `Enter` or `Space` on a focused control
does the same thing from a keyboard.

A Boss Beat's own numbers arrive on its Beat Card, which the Row deals one beat
at a time and which is the control that resolves it. There is no persistent
Boss Program strip (D-060): the fight above the board is two lines — the Round
track, and the Escalation gauge under it.

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
  zod schemas. `CatalogContext.tsx` injects the loaded catalog into the
  component tree: it is a constant, so it is provided rather than held as
  store state that a dozen components would subscribe to (ADR 0035).
- `src/store/` — zustand, composed from two slices. `sessionSlice.ts` owns
  the session timeline (snapshot history with time travel, Resolution Fact
  log, Scenario replay/export) and `interactionSlice.ts` owns the in-flight
  gesture; `workbench.ts` composes them into one store, because a gesture
  resolving *is* a timeline entry. `sessionTimeline.ts` holds the timeline's
  pure rules, `selectors.ts` the named readings — which return primitives,
  because the engine's `structuredClone` contract leaves the state tree with
  no structural sharing and nothing else can compare (ADR 0035).
  `devBridge.ts` and `hmr.ts` carry the automation hook and the
  preserve-across-hot-update dance, kept off the store so importing it has
  no side effects. `onboarding.ts` holds the UI-only onboarding state (guide
  visibility, scripted-first-turn completion, dismissed coach tips),
  deliberately off the session timeline.
- `src/board/` — the Phaser hex board. It renders engine snapshots and
  reports hex-level intents; it owns no game state. `effects.ts` translates
  a resolved batch of Resolution Facts into the board feedback the scene
  plays, so animation can never claim something the rules did not resolve.
- `src/ui/` — React, grouped by feature, each group holding its components
  together with the pure module that decides what they show and that
  module's tests. `App.tsx` at the root is composition only.
  - `actionBar/` — the Action Bar's Slots and its two rails (advance, undo),
    the Slot Replacement confirmation, and `slots.ts`.
  - `chrome/` — the persistent band above the board: Round track and the
    Escalation gauge.
  - `hand/` — the Compact Card row and `handFace.ts`, which decides which
    face a card wears for the current gesture.
  - `hero/` — the Hero Frame and its Signature control (D-065).
  - `overlays/` — everything that floats over the board, and
    `notifications.ts`, the table that ranks them into the three zones.
  - `onboarding/` — the How to Play guide (auto-opens on first visit,
    reopens from the `?` button), state-driven `CoachMark` prompts, and the
    state-derived `firstTurnScript.ts` with its `FirstTurnCue` bar.
  - `common/` — the reusable `Modal` surface, the `HoldPopover`
    tap-and-hold detail surface (explanatory copy collected in
    `holdDetails.ts`), the icon sets, and `theme.ts`.
  - `debug/` — the design rail (Scenario picker, time travel, fact log,
    seed control) and the sprite inspector, rendered in the dev server or
    under `?debug=1`.

  All motion freezes under `prefers-reduced-motion`.
- `scripts/generateScenarios.ts` — policy search over the engine that
  authors the committed victory/defeat Scenarios in `data/scenarios/`
  (run with `npx vite-node scripts/generateScenarios.ts`).
- `scripts/runHeadless.ts` — headless Node runner: plays Scenarios and
  verifies Encounter Records (`schema_version: 2`, see
  `docs/artifacts/encounter-records.md`) by deterministic replay.
