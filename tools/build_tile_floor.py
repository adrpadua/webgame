#!/usr/bin/env python3
"""Draw the hex tile floor, which is geometry rather than illustration.

docs/content/art-prompts/board-and-tiles.md specifies this asset down to the
last constraint, and what it specifies is a regular hexagon with a chamfer and
two hard value steps. A generator would approximate that; this states it.

The rules the drawing obeys, and why each one is there:

  Value only, no hue.  The scene multiplies the tile by a colour token, so pure
  white becomes that token exactly and every darker value becomes a shade of
  it. The body sits near 50% grey to leave headroom for a lit edge, which a
  near-white slab would not have.

  One key light from the upper left, hard-stepped.  Three flat values, no
  gradient: the upper-left edges catch a light band, the lower-right ones a
  dark one, and the body between them is a single value.

  No interior detail.  The interface direction permits four textures and says
  no surface carries two; the board tile has already spent its one on the
  per-hex value jitter the scene applies.

  A symmetrical cut.  One asset is repeated across the whole grid, so any
  distinctive nick would repeat two dozen times and read as a pattern.

Usage: python3 tools/build_tile_floor.py assets/art/board/tile-floor.png
"""

import math
import pathlib
import sys
from PIL import Image, ImageDraw

# The face the board draws, from hexCorners(x, y, HEX_SIZE - 2) in
# web/src/board/layout.ts with HEX_SIZE = 36.
FACE_W, FACE_H = 59, 68
EXPORT_SCALE = 4
# Drawn far larger and downsampled, so the vertices land clean without the
# renderer being asked for antialiasing it does not have.
SUPERSAMPLE = 8

CHAMFER = 4.5
BODY = 128        # ~50% grey: the slab, and the value the tint lands on
LIT = 200         # the upper-left chamfer
KEY = 255         # the one band that becomes the tint colour exactly
SHADOW = 70       # the lower-right chamfer

# Edge i runs from vertex i to vertex i+1. With a pointy-top hexagon the two
# upper edges and the left edge take the key; the right and lower edges are
# turned away from it.
EDGE_VALUE = [SHADOW, SHADOW, SHADOW, LIT, KEY, LIT]


# A pointy-top hexagon's widest points sit at 30 degrees, where the cosine is
# 0.866 rather than 1, so a radius equal to half the canvas leaves the flats
# short of the sides. Dividing it out is what makes the hexagon fill its frame
# — the board positions this on hexCorners and any margin would read as a gap
# between every pair of tiles.
def hexagon(cx, cy, half_w, half_h):
    radius_w = half_w / math.cos(math.radians(30))
    return [
        (cx + radius_w * math.cos(math.radians(60 * i - 30)), cy + half_h * math.sin(math.radians(60 * i - 30)))
        for i in range(6)
    ]


def main(out_path):
    scale = EXPORT_SCALE * SUPERSAMPLE
    width, height = FACE_W * scale, FACE_H * scale
    image = Image.new('LA', (width, height), (0, 0))
    draw = ImageDraw.Draw(image)

    cx, cy = width / 2, height / 2
    # A hair of overshoot so the boundary pixels take full ink rather than a
    # partial sample, which would read as a faint pale rim once tinted.
    outer = hexagon(cx, cy, width / 2 + scale / 2, height / 2 + scale / 2)
    inner = hexagon(cx, cy, width / 2 - CHAMFER * scale, height / 2 - CHAMFER * scale)

    # The chamfer first, one flat value per edge, then the body over its inner
    # boundary. Drawing the body last keeps the value steps hard: no edge of
    # the chamfer is ever blended into the face.
    for index, value in enumerate(EDGE_VALUE):
        quad = [outer[index], outer[(index + 1) % 6], inner[(index + 1) % 6], inner[index]]
        draw.polygon(quad, fill=(value, 255))
    draw.polygon(inner, fill=(BODY, 255))

    image = image.resize((FACE_W * EXPORT_SCALE, FACE_H * EXPORT_SCALE), Image.LANCZOS)
    pathlib.Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    image.convert('LA').save(out_path)
    print(f'{out_path}: {image.width}x{image.height}, drawn for a {FACE_W}x{FACE_H} face')


main(sys.argv[1] if len(sys.argv) > 1 else 'assets/art/board/tile-floor.png')
