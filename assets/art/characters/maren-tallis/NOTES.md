# Maren Tallis — banked board art

Two pieces arrived from the design side on 2026-08-20 and were assigned to
Maren by the design lead: a full-body concept (green-and-white robed staff
caster, green channelled orb, brown branching staff) and a six-row idle
sprite contact sheet on the standard NW/NE/E/SE/SW/W gutter. Her design
doc's visual language was revised to match — see
[../../../docs/content/heroes/maren-tallis-design.md](../../../docs/content/heroes/maren-tallis-design.md).

**The image files are not yet in the repo** — they came through a chat
surface that lands nothing on disk. Drop them here as:

- `concept-full-body.png`
- `idle-contact-sheet.png`

## The facing gutter is wrong, the known way

The design side confirms this sheet has the same diagonal compass swap as
both Embermaw sheets and Elian's (see
[../../../docs/content/art-prompts/board-sprite-sheets.md](../../../docs/content/art-prompts/board-sprite-sheets.md),
"The Label Gutter Is Not Evidence"): the bands labelled `NW/NE` and `SW/SE`
are swapped pairwise; `E` and `W` are honest. Per that doc, **rename the rows
rather than re-rolling**. Verify against her face — never the staff or the
orb, which ride one side of the body and give a confident wrong answer, the
mistake that cost Elian's sheet three rebuilds — then build with the rows the
sheet actually drew:

```bash
python3 tools/build_sprite_sheet.py assets/art/characters/maren-tallis/idle-contact-sheet.png \
  web/src/assets/maren-tallis-idle.png \
  --rows NE,NW,E,SE,SW,W --mirror W=E,NW=NE,SW=SE
```

(Row order assumes the gutter's top-to-bottom NW,NE,E,SE,SW,W with the
diagonal swap applied; confirm against the faces before building, exactly as
the sheet doc instructs.)

Then run the Sprite Inspector acceptance checks from the sheet doc before
wiring the built sheet into `web/src/board/sheets.ts`.
