#!/usr/bin/env python3
"""Lower a piece's warm presence until it sits where the board ranks it.

docs/content/oathcraft-board-direction.md ranks warm by imminence, and a
Minion sits below the Boss. Both are drawn art, so no runtime tint can
correct the order — it has to be in the pixels.

The correction is a uniform scale in linear light rather than a ceiling. A
ceiling compresses the brightest pixels hardest, and on a Whelp those are the
too-bright core that is its whole board read — the feature that says a piece
of the furnace broke off. Scaling everything by one factor lowers the piece
while leaving the core exactly as far above its shards as it was.

The factor is solved from the target rather than typed, so the number in the
command is the thing being aimed at.

Usage:
  python3 tools/tone_sprite.py in.png out.png --warm-median 0.0878
"""

import argparse
import numpy as np
from PIL import Image

# A pixel counts as warm when red leads blue by this much. Below it the pixel
# is lit metal or shadow, and says nothing about how hot the piece reads.
WARM_LEAD = 60


def to_linear(srgb):
    a = srgb / 255.0
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def to_srgb(linear):
    a = np.clip(linear, 0.0, 1.0)
    out = np.where(a <= 0.0031308, a * 12.92, 1.055 * a ** (1 / 2.4) - 0.055)
    return np.clip(out * 255.0 + 0.5, 0, 255).astype(np.uint8)


def luminance(linear):
    return linear[..., 0] * 0.2126 + linear[..., 1] * 0.7152 + linear[..., 2] * 0.0722


def warm_mask(srgb, alpha):
    return (alpha > 128) & ((srgb[..., 0] - srgb[..., 2]) > WARM_LEAD)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('destination')
    parser.add_argument('--warm-median', type=float, required=True, help='the warm median luminance to land on')
    args = parser.parse_args()

    image = Image.open(args.source).convert('RGBA')
    rgba = np.asarray(image).astype(np.float64)
    srgb, alpha = rgba[..., :3], rgba[..., 3]
    linear = to_linear(srgb)
    warm = warm_mask(srgb, alpha)
    if not warm.any():
        raise SystemExit(f'{args.source}: no warm pixels to grade')

    before = float(np.median(luminance(linear)[warm]))

    # Solved by iteration rather than in one step, because the measurement
    # moves with the picture. Darkening a pixel narrows the gap between its red
    # and its blue, so pixels drop out of the warm set as the scale comes down,
    # and the median of what remains sits higher than a single ratio predicts.
    # Measuring the graded image the way the guards measure it — recomputing
    # the mask — is the only figure that means anything, so that is what this
    # converges on. Solving it once left the piece 1.5% under the Boss instead
    # of the margin asked for.
    factor = args.warm_median / before
    for _ in range(40):
        graded = to_srgb(linear * factor)
        graded_linear = to_linear(graded.astype(np.float64))
        settled = warm_mask(graded.astype(np.float64), alpha)
        if not settled.any():
            break
        landed = float(np.median(luminance(graded_linear)[settled]))
        if abs(landed - args.warm_median) < 1e-4:
            break
        factor *= args.warm_median / landed
    graded = to_srgb(linear * factor)
    Image.fromarray(np.dstack([graded, alpha.astype(np.uint8)])).save(args.destination)

    final_mask = warm_mask(graded.astype(np.float64), alpha)
    after = float(np.median(luminance(to_linear(graded.astype(np.float64)))[final_mask]))
    print(f'{args.destination}: warm median {before:.4f} -> {after:.4f} (target {args.warm_median:.4f}, scale {factor:.3f})')


main()
