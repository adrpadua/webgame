#!/usr/bin/env python3
"""Compose the ready-to-send board sprite prompts from their sources.

The prompt library's rule is that style lives in exactly one file, so that
correcting the direction is one edit rather than a sweep. A pre-composed
prompt breaks that rule by construction: it is a copy of the preamble and a
copy of the template with the slots filled.

This script is the repair. The composed file is generated, never hand-edited,
so the copy cannot drift from what it was copied from — edit
_style-preamble.md or board-sprite-sheets.md and run this again.

Usage: python3 tools/compose_sprite_prompts.py
"""

import pathlib
import re
import sys

PROMPTS = pathlib.Path(__file__).resolve().parent.parent / 'docs' / 'content' / 'art-prompts'
OUT = PROMPTS / 'embermaw-sprite-prompts.md'

# The slot values are canon copied from boss-and-minion.md. They live here
# rather than being parsed out of that file's tables because a prompt is
# allowed to say something the concept sheet does not — BOARD_READ and
# IDLE_MOTION have no equivalent there.
PIECES = {
    'Embermaw': {
        'PIECE_NAME': 'Embermaw',
        'ONE_LINE_HOOK': 'a living furnace that treats an arena as a kiln to be heated evenly',
        'MATERIALS': (
            'ember coral with visible heat veins, blackened fragmentary oathsteel plating hanging off it '
            'like shed containment, and a furnace throat glowing deep in its body'
        ),
        'BOARD_READ': (
            'the furnace throat — its position on the body is what tells a player which way the heat is '
            'about to go'
        ),
        'IDLE_MOTION': (
            'heat swelling and fading along the coral veins, the throat brightening and dimming as it '
            'draws breath, and loose plates settling'
        ),
        'SCALE': (
            'low and wide, filling most of its cell, and clearly the largest thing in the game — about one '
            'and a half times the height of a human figure and considerably broader'
        ),
    },
    # A phase variant is the main template plus the addendum block, because
    # what makes it hard is not the creature — it is staying identical to a
    # sheet that already shipped. Its slot values say only what changed; the
    # addendum does the work of forbidding everything else from changing.
    'Embermaw, Phase II': {
        'PIECE_NAME': 'Embermaw',
        'ONE_LINE_HOOK': (
            'a living furnace that treats an arena as a kiln to be heated evenly, now shed of the plating '
            'that was holding it in'
        ),
        'MATERIALS': (
            'bare ember coral with the heat veins exposed across the whole body, snapped anchor stubs and '
            'empty mounts along its back and flanks where blackened oathsteel plating used to sit, and an '
            'unshuttered furnace throat'
        ),
        'BOARD_READ': (
            'the furnace throat, now unshuttered and the single clearest thing on the piece — its position '
            'still tells a player which way the heat is about to go, and it has to carry that read without '
            'the plating that used to frame it'
        ),
        'IDLE_MOTION': (
            'heat moving through veins that nothing covers any more, the throat working open and closed as '
            'it draws breath, and the broken plate mounts flexing with it'
        ),
        'SCALE': (
            'identical to the first sheet — low and wide, filling most of its cell, about one and a half '
            'times the height of a human figure and considerably broader. This form is not larger than the '
            'first'
        ),
        'PHASE_CHANGE': (
            'the blackened oathsteel plating has been shed. On the first sheet it hung off the body like '
            'failing containment; here it is gone, leaving snapped anchor stubs and empty mounts, the coral '
            'beneath fully exposed, and the furnace throat unshuttered. It reads as a furnace that has lost '
            'its casing — not as a different creature, and not merely as an angrier one'
        ),
    },
    'Whelp': {
        'PIECE_NAME': 'Whelp',
        'ONE_LINE_HOOK': 'a splintered furnace spark that broke off the Embermaw and kept burning',
        'MATERIALS': (
            'small shards of ember coral around a too-bright core, with a few flecks of blackened '
            'oathsteel caught in the growth'
        ),
        'BOARD_READ': (
            'the too-bright core showing through the shards, so it reads as a piece of the boss rather '
            'than a separate creature'
        ),
        'IDLE_MOTION': (
            'the core pulsing unevenly and the shards shifting around it, as if it is barely holding '
            'together'
        ),
        'SCALE': (
            'compact and low to the ground, about half the height of a human figure, occupying only the '
            'middle of its cell'
        ),
    },
}

# Which extra ```text block of board-sprite-sheets.md a piece appends, if any.
# Keyed by the name above rather than by a flag inside the slot values, so the
# slot dict stays what it says it is: template slots and nothing else.
ADDENDA = {
    'Embermaw, Phase II': 1,
}

HEADER = """# Embermaw And Whelp Sprite Prompts

Status: pre-composed and ready to send. The [board-sprite-sheets.md](board-sprite-sheets.md) template with \
every slot filled, so each block below is one complete message — nothing to assemble, nothing to look up.

**This file is generated. Do not edit it.** It is a copy of the style contract and the template, which is \
exactly what the library's one-file rule forbids; the copy is safe only because it is rebuilt from the \
sources rather than maintained. Edit [`_style-preamble.md`](_style-preamble.md) or \
[board-sprite-sheets.md](board-sprite-sheets.md), then run:

```bash
python3 tools/compose_sprite_prompts.py
```

## How To Send One

1. Start a **new chat** per creature. A fresh context is what stops the second sheet inheriting the first \
one's drift.
2. **Attach `assets/art/characters/elian-voss/idle-contact-sheet-gold.png`** and say: *"Match this sheet's \
rendering style, grid layout, and label gutter exactly. Do not copy the character."* The reference carries \
the look far better than the words do.

   **For a phase variant, attach that creature's own accepted first-form sheet instead** — \
`assets/art/characters/embermaw/idle-contact-sheet.png` for Embermaw Phase II. It carries the library's \
rendering and the creature at the same time, and staying identical to it is the whole job.
3. Paste the whole block for that creature as one message.
4. Check the result against the acceptance list in [board-sprite-sheets.md](board-sprite-sheets.md) — \
**facings first**. If two rows face the same way, say which rows and ask for a regeneration; a mirror is \
the fallback, not the plan.
5. Save the accepted image to `assets/art/characters/<slug>/idle-contact-sheet.png` and build it:

```bash
python3 tools/build_sprite_sheet.py assets/art/characters/<slug>/idle-contact-sheet.png web/src/assets/<slug>-idle.png \\
  --rows NE,E,SE --mirror W=E,NW=NE,SW=SE
```

The sheet carries three facings and the builder mirrors them into six. Sheets \
generated before that change hold all six rows; rebuild those with \
`--rows NW,NE,E,SE,SW,W` and the same `--mirror`, which reads the east rows and \
discards the west ones.
"""


def text_block(path, index=0):
    blocks = re.findall(r'```text\n(.*?)```', (PROMPTS / path).read_text(), re.S)
    if len(blocks) <= index:
        sys.exit(f'{path}: expected a ```text block at index {index}')
    return blocks[index].strip()


def main():
    preamble = text_block('_style-preamble.md')
    template = text_block('board-sprite-sheets.md')
    parts = [HEADER]
    for name, values in PIECES.items():
        filled = template
        if name in ADDENDA:
            filled = f"{filled}\n\n{text_block('board-sprite-sheets.md', ADDENDA[name])}"
        for key, value in values.items():
            filled = filled.replace('{{%s}}' % key, value)
        unfilled = re.findall(r'\{\{(\w+)\}\}', filled)
        if unfilled:
            sys.exit(f'{name}: template slots left unfilled: {sorted(set(unfilled))}')
        parts.append(f'\n## {name}\n\n```text\n{preamble}\n\n{filled}\n```\n')
    OUT.write_text('\n'.join(parts))
    print(f'{OUT.relative_to(PROMPTS.parent.parent.parent)}: {OUT.stat().st_size} bytes, {len(PIECES)} prompts')


if __name__ == '__main__':
    main()
