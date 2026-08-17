#!/usr/bin/env python3
"""Knock a generated backdrop down under the board's own colour ceilings.

The backdrop is the only board asset that ships as finished colour rather than
as a value mask a runtime tint multiplies, so the discipline that a tint used
to enforce has to be baked in. Two ceilings decide it, and both come from
docs/content/oathcraft-board-direction.md rather than from taste:

  Value.  The tile floor is the lit plane. Nothing behind it may be brighter
  than the floor's own fill, or the tiles read as dark holes punched in a
  lighter ground instead of a floor standing above it.

  Warm.   Warm saturation ranks by imminence: a telegraphed beat outranks the
  Boss, which outranks a Minion, which outranks scorched ground. A backdrop is
  less imminent than any of them, so its warm peak belongs below the scorched
  step — well below the brightest thing a telegraph can put on screen.

Both are enforced as a soft ceiling rather than a clamp. The curve is identity
to third order in the shadows, so the basalt keeps its modelling, and it
asymptotes to the ceiling, so no pixel can cross it however bright it started.
The alternative — scaling the whole image down — costs the shadows, which are
most of the picture.

Usage:
  python3 tools/tone_backdrop.py in.png out.png [--warm-ceiling '#2c150a']
"""

import argparse
import numpy as np
from PIL import Image

# Token values, matching web/src/index.css. Same contract as palette.ts: these
# are copies, and a copy that has drifted from its token is a defect.
STEEL_900 = '#1b2434'  # the tile floor's fill — the value ceiling
CORAL_950 = '#2c150a'  # one step below scorched ground — the warm ceiling
# What a Brood Call telegraph actually composites to over a tile: coral-400 at
# 32% alpha. Reported for context — the loudest warm pixel the board can draw.
BROOD_COMPOSITE = '#5a3c36'


def parse_hex(value):
    value = value.lstrip('#')
    return np.array([int(value[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)


def to_linear(srgb):
    a = srgb / 255.0
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def to_srgb(linear):
    a = np.clip(linear, 0.0, 1.0)
    out = np.where(a <= 0.0031308, a * 12.92, 1.055 * a ** (1 / 2.4) - 0.055)
    return np.clip(out * 255.0 + 0.5, 0, 255).astype(np.uint8)


def luminance(linear):
    return linear[..., 0] * 0.2126 + linear[..., 1] * 0.7152 + linear[..., 2] * 0.0722


def tone(path_in, path_out, value_ceiling, warm_ceiling, warm_span):
    image = Image.open(path_in).convert('RGB')
    srgb = np.asarray(image).astype(np.float64)
    linear = to_linear(srgb)
    before = luminance(linear)

    # How warm each pixel is, as a 0..1 blend rather than a threshold, so the
    # two ceilings meet gradually and no edge appears where they change over.
    warmth = np.clip((srgb[..., 0] - srgb[..., 2]) / warm_span, 0.0, 1.0)
    ceiling = value_ceiling + (warm_ceiling - value_ceiling) * warmth

    # tanh: identity to third order near zero, asymptotic to the ceiling. The
    # shadows pass through untouched; only what approaches the ceiling bends.
    scaled = np.where(before > 0, ceiling * np.tanh(before / ceiling) / np.maximum(before, 1e-9), 1.0)
    toned = linear * scaled[..., None]

    Image.fromarray(to_srgb(toned)).save(path_out)
    return before, luminance(toned)


def describe(label, before, after, value_ceiling, warm_ceiling):
    over = 100 * (after > value_ceiling * 1.001).mean()
    print(
        f'  {label:28s} median {np.median(before):.4f} -> {np.median(after):.4f}   '
        f'max {before.max():.4f} -> {after.max():.4f}   over ceiling {over:.2f}%'
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('destination')
    # Off by default, and that is the finding rather than a convenience. A
    # value ceiling reads well on paper — keep the whole backdrop under the
    # floor it sits behind — but the board covers its own centre with opaque
    # tiles, so most of the pixels the ceiling catches are never visible. What
    # it does catch is the modelling in the surrounding ruins, which flattens.
    # The warm ceiling is the correction that was actually needed.
    parser.add_argument('--value-ceiling', default='none', help="hex, or 'none' to leave value alone (default)")
    parser.add_argument('--warm-ceiling', default=CORAL_950, help='hex; defaults to one step under scorched')
    parser.add_argument('--warm-span', type=float, default=48.0, help='red-minus-blue at which a pixel counts as fully warm')
    args = parser.parse_args()

    # 1.0 is white in linear light, so the curve is effectively identity for
    # anything a backdrop contains.
    value_ceiling = 1.0 if args.value_ceiling == 'none' else luminance(to_linear(parse_hex(args.value_ceiling)))
    warm_ceiling = luminance(to_linear(parse_hex(args.warm_ceiling)))
    print(f'{args.source} -> {args.destination}')
    print(f'  value ceiling {args.value_ceiling} L={value_ceiling:.4f} · warm ceiling {args.warm_ceiling} L={warm_ceiling:.4f}')
    print(f'  for scale, a Brood Call telegraph composites to {BROOD_COMPOSITE} '
          f'L={luminance(to_linear(parse_hex(BROOD_COMPOSITE))):.4f}')
    before, after = tone(args.source, args.destination, value_ceiling, warm_ceiling, args.warm_span)
    describe('whole image', before, after, value_ceiling, warm_ceiling)
    h, w = before.shape
    box = (slice(int(h * .2), int(h * .8)), slice(int(w * .2), int(w * .8)))
    describe('centre, under the board', before[box], after[box], value_ceiling, warm_ceiling)


if __name__ == '__main__':
    main()
