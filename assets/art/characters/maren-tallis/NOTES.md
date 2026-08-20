# Maren Tallis — banked board art

Two pieces arrived from the design side on 2026-08-20 and were assigned to
Maren by the design lead: a full-body concept (green-and-white robed staff
caster, green channelled orb, brown branching staff) and a six-row idle
sprite contact sheet on the standard NW/NE/E/SE/SW/W gutter. Her design
doc's visual language was revised to match — see
[../../../docs/content/heroes/maren-tallis-design.md](../../../docs/content/heroes/maren-tallis-design.md).

Both files are banked here (`concept-full-body.png`, `idle-contact-sheet.png`)
and the sheet is built and wired: `web/src/assets/maren-tallis-idle.png`,
mapped by `heroSheetKey('maren')` in `web/src/board/sheets.ts`.

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
  --rows NE,NW,E,SW,SE,W --mirror W=E,NW=NE,SW=SE
```

(Row order verified against her face on 2026-08-20: the diagonals are swapped pairwise, E and W are honest — the Embermaw pattern exactly.)
diagonal swap applied; confirm against the faces before building, exactly as
the sheet doc instructs.)

Built 2026-08-20 with exactly that command. The build needed one tool change:
her orb's glow bridges two of the six row gaps, so `build_sprite_sheet.py`
gained the same grid-regular fallback for merged *rows* that columns already
had. Facings verified against her face pre-build; mirrors are exact by
construction. Residual: small glow specks at some cell tops from the
grid-regular row cuts — invisible at board size, worth a look in the Sprite
Inspector if her cells are ever re-cut.

## Sizing

`targetHeight` scales the *frame*, and her frame is not mostly body the way
Elian's is: the staff crown and orb glow stretch her content box, so frame
parity rendered her body at 59.5px against Elian's 68 — visibly too small on
the board. Sized instead for **body parity**: head-to-feet in the NE row,
measured through the densest column so the staff does not count as head.
`targetHeight: 80` renders her body at ~66px, ~97% of Elian's, which reads as
an unarmored healer beside an armored tank rather than as a smaller person.
