# Verdant Caster — banked art, identity open

Two pieces arrived from the design side on 2026-08-20: a full-body concept
(green-and-white robed staff caster, green channelled orb, brown branching
staff) and a six-row idle sprite contact sheet on the standard NW/NE/E/SE/SW/W
gutter. **The image files are not yet in the repo** — they came through a chat
surface that does not land files on disk. Drop them here as:

- `concept-full-body.png`
- `idle-contact-sheet.png`

## The facing gutter is wrong, the known way

The design side confirms this sheet has the same diagonal compass swap as
both Embermaw sheets and Elian's (see
[../../../docs/content/art-prompts/board-sprite-sheets.md](../../../docs/content/art-prompts/board-sprite-sheets.md),
"The Label Gutter Is Not Evidence"): the bands labelled `NW/NE` and `SW/SE`
are swapped pairwise; `E` and `W` are honest. Per that doc, **rename the rows
rather than re-rolling**. Verify against the figure's face — never the staff
or the orb, which ride one side of the body — then build with the rows the
sheet actually drew:

```bash
python3 tools/build_sprite_sheet.py assets/art/characters/verdant-caster/idle-contact-sheet.png \
  web/src/assets/verdant-caster-idle.png \
  --rows NE,NW,E,SE,SW,W --mirror W=E,NW=NE,SW=SE
```

(Row order above assumes the gutter's top-to-bottom NW,NE,E,SE,SW,W with the
diagonal swap applied; confirm against the faces before building, exactly as
the sheet doc instructs — Elian's sheet cost three rebuilds to learn this.)

## Identity: not yet assigned

Who this character is has not been decided in the design record. The two open
readings:

- **Maren Tallis's board art.** She is the Hero who currently lacks a sprite —
  but her design doc specifies river-silt reds and bleached parchment against
  Elian's blues, a Medicant Rig (braces, vessels, ledger hardware), and
  explicitly *not* a generic staff caster. This art matches none of that.
- **The first Damage Hero's concept.** The same message directed the Brand
  trial retune that makes the Damage seats load-bearing (D-084), and the paper
  White Mage arrived the same way before becoming Maren. A green battle-caster
  reads naturally as the Damage seat's first concept.

Do not wire this art to a Hero until the design side names them. Wiring it to
Maren against her authored design language would need that language formally
revised first.
