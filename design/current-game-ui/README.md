# The current Game UI, as a design canvas

The shipped Workbench HUD reproduced from source rather than sketched, published as a
Claude Design canvas: <https://claude.ai/code/artifact/e6ba7d10-5027-442d-8a09-1b4bbbbe8963>

Eight artboards — two whole screens (`Main`, `Loadout`, at the 390x844 portrait target) and
six component boards (`PlateSystem`, `PhaseBand`, `ActionBar`, `HeroFrame`, `HandFaces`,
`Dock`).

## Where the values come from

Nothing here is eyeballed. The palette and the plate geometry are lifted from
`web/src/index.css`, the gauge language from `web/src/ui/theme.ts`, the icon paths from
`web/src/ui/icons.tsx` and `keywordIcons.tsx`, the markup from the components themselves,
and every box size in `metrics.json` was measured off the running app at 390x844.
`board.jpg` is the game's own render, cropped from that same capture with the floating
layers hidden.

That is the point of the exercise: the canvas is a reproduction, so anything that looks
wrong on it is wrong in the app. Two such things showed up while building it, and both are
drawn as they ship rather than quietly corrected — see the notes at the end.

## Rebuilding

    python3 design/current-game-ui/build.py

writes the eight `.dc.html` artboards and `canvas.json` from one generator, so a token that
moves in `index.css` moves in one place here too. To re-seed and republish the canvas after
an edit, follow the `/design` skill's update flow with these working files; the artifact URL
above is the one to update rather than publishing a second canvas.

`build.py` is the source of truth. The `.dc.html` files it emits are generated output, and a
hand edit to one of them is lost on the next run — unless the edit was made in the canvas
editor, in which case extract it back out first (the skill's `--extract` flow) and fold it
into the generator.

## Known defects the artboards reproduce

Both were found by measuring the shipped app, not by reading it:

- **The Signature button truncates its own card title.** `Riposte` renders 45.7px wide at
  `text-[10px] font-black uppercase tracking-wide`, inside a `w-[74px]` plate whose
  `wb-plate-sm` padding leaves 44px of content box. It ships as `RIPOS...`.
- **A three-Charge Top Card overflows its Slot row.** Iron Guard's row measures 106px of
  content in a 97px box: lock head, three tumblers, the timing dot and one want mark do not
  fit four units of the ladder, and the want glyph lands 9px past the Slot's content edge,
  inside the plate's own cut. Sweeping Blow, at two Charges and no want mark, fits exactly.
