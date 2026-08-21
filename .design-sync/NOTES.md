# design-sync notes

Corrections and standing facts for this repo's sync. Read before syncing; add to
it whenever a sync turns up something the next one would otherwise re-learn.

## This repo is off the converter's script, deliberately

`/design-sync`'s bundled converter expects a JS/TS design system with a `dist/`
it can bundle with esbuild. This repo has no such thing: the shipped UI is a
React app under `web/`, and the design system published to Claude Design is
*generated from it* by a Python builder rather than compiled from it.

    design/oathcraft_tokens.py         the token tables
    design/current-game-ui/build.py    the canvas builder — component renderers + CSS
    design/design-system/build_ds.py   the design-system builder — imports the above

So the layout is produced by `build_ds.py`, which is legitimate (the upload
format is the contract, the converter is one path to it). What is *not*
negotiable is verification: every card is rendered in a real browser and read
before upload. `tools/check_ds_cards.py` is that gate — it loads every
`preview/*.html` in Chromium and fails on an unstyled card, a zero-size card, a
plate whose content sits inside its own cut, or a row overrunning its box.

There is no `_ds_sync.json` anchor and there should not be one: its hash recipe
describes the converter's own artifacts, none of which exist here. Every sync
re-verifies every card, which for 28 cards is cheap and is the honest trade.

## The project

`Oathcraft Design System`, `18ee2c44-b52e-4e74-8200-740520bda415`. The namespace
the builder stamps into `_ds_manifest.json` embeds the id's first block —
`OathcraftDesignSystem_18ee2c` — so pass it to the builder or the manifest ends
up naming a project that does not exist.

## Two remote files are the app's, not ours

`_ds_bundle.js` and `_adherence.oxlintrc.json` exist in the project but are
written by Claude Design's own self-check, not by `build_ds.py`. **Never include
them in a delete pass**, or the app has to regenerate them on next open. The
reconciliation delete is scoped to `preview/**` for exactly this reason.

## Nothing is authored twice

`build_ds.py` imports the canvas builder's renderers and CSS rather than
restating them. A component that changes in `web/src/ui/` is ported once, into
`design/current-game-ui/build.py`, and both the canvas and the design system
follow. A card that draws its own markup instead of calling a renderer is a bug
waiting to go stale — that is how the Counter chip survived four months past the
component's retirement.

## The `.ds-` namespace on preview chrome

Preview chrome classes are namespaced `ds-` because the component classes are
the *real* ones. `.card` was already the Compact Card; the collision crushed
every hand card on a preview to 45px of content before the overrun check caught
it. Do not un-namespace them.

## 2026-08-21 — party frames sync

- Ported `PartyFrames.tsx` and `StatusIcons.tsx` into the canvas builder; added
  the Party Frames and Status Icons cards; retired the Counter chip from the
  Hero Frame and Rails cards.
- The health bar's `wb-downed-track` (the hatched track a Downed ally wears) is
  defined in `web/src/index.css`, not in the component — a port that reads only
  the `.tsx` renders a Downed frame with a plain dark track and loses the state.
- Role → cloth step is a presentation rule living in `PartyFrames.tsx`
  (`roleAccent`), not in the token file: Tank 500, Healer 300, Damage 400. Two
  Damage seats share a step deliberately; they are one Role.

- `design/current-game-ui/raid-card-tactics-hud.html` is a **frozen export**, not
  a build output: a 245KB published-artifact snapshot of the canvas from commit
  0f9dac2, with the editor and the content packaged into one file. `build.py`
  does not regenerate it, so it still carries the retired Counter chip and knows
  nothing about the party frames. Nothing reads it and nothing uploads it. Left
  alone here; if it is meant to stay current it needs a regeneration path of its
  own, and if it is not, it should say so at the top of the file.

### One finding this sync did not fix, because it is not the sync's to fix

`docs/content/oathcraft-interface-direction.md` (lines ~40, ~48) still describes
Signal cloth as a **per-Hero** accent with `#2F5680` standing in for Shield
Wall's. The party frames settled it as **per-Role** — three assigned steps. The
material's own rule ("a material, not a value", allowed to grow within the ramp)
survived; only the per-Hero framing is stale.

The design system's own README and cloth card now state the shipped rule, so
nothing uploaded to Claude Design is wrong. But the canon doc is the source
those were written from, and it is owned by whoever authors the interface
direction — not by a sync run. Left for its authors, deliberately, rather than
rewritten here.
