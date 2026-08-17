#!/usr/bin/env python3
"""Turn a facing contact sheet into an engine-ready sprite sheet.

The art arrives as a labelled contact sheet: a left gutter of facing names,
then a grid of poses on an opaque near-black ground, each cell drawn at its
own scale and sitting wherever the render put it. A game needs the opposite of
all three — no labels, alpha instead of ground, and every frame on one grid
with the feet in the same place, or the character bobs when the animation
plays.

Two things here are less obvious than they look.

Keying by "how far is this pixel from the background colour" eats the armour:
Elian's plate is oathsteel navy, which is genuinely close to the ground it
stands on. So the ground is found by flood fill from the border instead —
background is the region connected to the edge, and a dark pixel enclosed by
the silhouette is armour no matter how dark it is.

The shield panels throw a soft glow onto the ground, and a hard key would cut
a halo-shaped hole around them. Pixels the fill reached keep a partial alpha
proportional to how much brighter than the ground they are, so the glow
survives as glow.

Usage: build_sprite_sheet.py <source.png> <out.png> [--rows NW,NE,E,SE,SW,W]
"""

import argparse
import sys
from collections import deque

try:
    from PIL import Image
except ImportError:  # pragma: no cover - the script is a manual asset step
    sys.exit('Pillow is required: python3 -m pip install Pillow')

# The row order the contact sheet is drawn in, top to bottom.
DEFAULT_ROWS = ['NW', 'NE', 'E', 'SE', 'SW', 'W']

# Frames in one idle loop: the four columns of a sheet.
POSE_COLUMNS = 4

# The engine's facing indices (web/src/engine/facing.ts). The sheet is packed
# in this order rather than the sheet's own, so a scene can index rows by
# facing directly instead of carrying a lookup table.
FACING_INDEX = {'E': 0, 'NE': 1, 'NW': 2, 'W': 3, 'SW': 4, 'SE': 5}

# How far off the ground colour a pixel must be before the flood fill refuses
# to cross it. The ground carries film grain of about +/-3, so this only has
# to clear the noise.
FILL_TOLERANCE = 26
# Below this the glow is indistinguishable from grain; above it, fully opaque.
GLOW_FLOOR = 10
GLOW_CEIL = 70


def ground_colour(image):
    """The ground is whatever the four corners agree on."""
    w, h = image.size
    px = image.load()
    corners = [px[1, 1], px[w - 2, 1], px[1, h - 2], px[w - 2, h - 2]]
    return tuple(sum(c[i] for c in corners) // len(corners) for i in range(3))


def key_out_ground(image, ground):
    """Alpha from a border flood fill, with the glow kept as partial alpha."""
    w, h = image.size
    px = image.load()
    out = Image.new('RGBA', (w, h))
    op = out.load()

    def near_ground(xy):
        r, g, b = px[xy][:3]
        return abs(r - ground[0]) + abs(g - ground[1]) + abs(b - ground[2]) < FILL_TOLERANCE

    reached = bytearray(w * h)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near_ground((x, y)) and not reached[y * w + x]:
                reached[y * w + x] = 1
                queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if near_ground((x, y)) and not reached[y * w + x]:
                reached[y * w + x] = 1
                queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not reached[ny * w + nx] and near_ground((nx, ny)):
                reached[ny * w + nx] = 1
                queue.append((nx, ny))

    for y in range(h):
        row = y * w
        for x in range(w):
            r, g, b = px[x, y][:3]
            if not reached[row + x]:
                # Enclosed by the silhouette: the character, however dark.
                op[x, y] = (r, g, b, 255)
                continue
            # Ground the fill reached. Keep it only to the extent it glows.
            excess = max(r - ground[0], g - ground[1], b - ground[2])
            if excess <= GLOW_FLOOR:
                op[x, y] = (r, g, b, 0)
            else:
                alpha = min(255, round(255 * (excess - GLOW_FLOOR) / (GLOW_CEIL - GLOW_FLOOR)))
                op[x, y] = (r, g, b, alpha)
    return out


def content_bands(mask_counts, threshold=2, min_run=8):
    bands, start = [], None
    for index, value in enumerate(mask_counts):
        if value > threshold and start is None:
            start = index
        elif value <= threshold and start is not None:
            bands.append((start, index - 1))
            start = None
    if start is not None:
        bands.append((start, len(mask_counts) - 1))
    return [band for band in bands if band[1] - band[0] > min_run]


def alpha_profile(image):
    w, h = image.size
    px = image.load()
    cols = [0] * w
    rows = [0] * h
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 24:
                cols[x] += 1
                rows[y] += 1
    return cols, rows


def column_cuts(profile, start, end, count):
    """Split a run of touching poses into `count` columns.

    A narrow figure leaves empty background between poses and the bands fall
    out on their own. A wide one does not: Embermaw's coral spikes and glow
    reach across the gutter into the next cell, so the profile never returns
    to zero and the whole row reads as a single band.

    The grid is still regular, so each boundary is looked for near where an
    even split would put it, and placed at the emptiest column in that window
    — the thinnest part of the bridge rather than a break that is not there.
    """
    span = (end - start + 1) / count
    cuts = [start]
    for index in range(1, count):
        estimate = start + round(span * index)
        window = max(4, round(span * 0.18))
        lo = max(start + 1, estimate - window)
        hi = min(end, estimate + window)
        cuts.append(min(range(lo, hi + 1), key=lambda x: (profile[x], abs(x - estimate))))
    cuts.append(end + 1)
    return [(cuts[i], cuts[i + 1] - 1) for i in range(count)]


# A fragment is treated as bleed from the neighbouring pose when it touches a
# vertical cut and is this small a share of the pose it sits beside. Detached
# parts that belong to a piece — Elian's floating runeglass panels — are far
# larger than this and sit inside the cell rather than against its cut.
BLEED_MAX_SHARE = 0.05

# Vertical breathing room around a pose, and the most that is ever reached
# sideways into the gap beside one.
PAD = 12


def strip_bleed(cell):
    """Erase fragments of the neighbouring pose that crossed the cut.

    Only matters for a sheet whose poses touch: the cut is placed at the
    thinnest part of the bridge, not at a gap, so a coral spike or a spill of
    glow can still land inside the wrong cell. Those arrive as small islands
    against the left or right edge, which is what is tested for — a piece's
    own detached parts are neither small nor against the cut.
    """
    width, height = cell.size
    alpha = cell.split()[3].load()
    visited = bytearray(width * height)
    islands = []
    cleared = 0
    for start_x in range(width):
        for start_y in range(height):
            if visited[start_y * width + start_x] or alpha[start_x, start_y] <= 24:
                continue
            stack = [(start_x, start_y)]
            visited[start_y * width + start_x] = 1
            island = []
            touches_cut = False
            while stack:
                x, y = stack.pop()
                island.append((x, y))
                if x == 0 or x == width - 1:
                    touches_cut = True
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < width and 0 <= ny < height and not visited[ny * width + nx] and alpha[nx, ny] > 24:
                        visited[ny * width + nx] = 1
                        stack.append((nx, ny))
            islands.append((island, touches_cut))
    largest = max((len(island) for island, _ in islands), default=0)
    for island, touches_cut in islands:
        if touches_cut and len(island) < largest * BLEED_MAX_SHARE:
            for x, y in island:
                cell.putpixel((x, y), (0, 0, 0, 0))
            cleared += len(island)
    return cleared


def cell_bbox(image, box):
    """Tight bounds of the visible character inside one grid cell."""
    cropped = image.crop(box)
    bounds = cropped.getbbox()
    if bounds is None:
        return None
    return (box[0] + bounds[0], box[1] + bounds[1], box[0] + bounds[2], box[1] + bounds[3])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('out')
    parser.add_argument('--rows', default=','.join(DEFAULT_ROWS))
    parser.add_argument(
        '--mirror',
        default='',
        help='Comma-separated facings to build by mirroring another, as W=E. '
        'For rows the source drew facing the wrong way.',
    )
    args = parser.parse_args()

    mirrors = {}
    for pair in filter(None, args.mirror.split(',')):
        target, _, source_name = pair.partition('=')
        if target not in FACING_INDEX or source_name not in FACING_INDEX:
            sys.exit(f'--mirror takes FACING=FACING using {sorted(FACING_INDEX)}, got {pair!r}')
        mirrors[target] = source_name

    rows = args.rows.split(',')
    source = Image.open(args.source).convert('RGB')
    ground = ground_colour(source)
    keyed = key_out_ground(source, ground)

    cols, row_counts = alpha_profile(keyed)
    col_bands = content_bands(cols)
    row_bands = content_bands(row_counts)
    if len(row_bands) != len(rows):
        sys.exit(f'expected {len(rows)} pose rows, found {len(row_bands)}')

    # The leftmost band is the facing label gutter when there is one more band
    # than there are poses, or when the poses have merged into a single run.
    if len(col_bands) in (POSE_COLUMNS + 1, 2):
        col_bands = col_bands[1:]
    if len(col_bands) == 1:
        col_bands = column_cuts(cols, col_bands[0][0], col_bands[0][1], POSE_COLUMNS)
    if len(col_bands) != POSE_COLUMNS:
        sys.exit(f'expected {POSE_COLUMNS} pose columns, found {len(col_bands)}')

    # Cut on the bands, then re-measure each pose on its own: the contact
    # sheet draws every cell at a slightly different size and offset.
    #
    # The horizontal padding reaches into the gap beside a pose to pick up the
    # last of its glow, but never past the halfway point to its neighbour —
    # and on a sheet whose poses touch there is no gap to reach into, so it
    # collapses to nothing and the cut holds.
    cells = {}
    bleed = 0
    for row_index, (top, bottom) in enumerate(row_bands):
        for col_index, (left, right) in enumerate(col_bands):
            gap_left = left - (col_bands[col_index - 1][1] if col_index > 0 else -1)
            gap_right = (col_bands[col_index + 1][0] if col_index + 1 < len(col_bands) else keyed.width) - right
            pad_left = max(0, min(PAD, gap_left // 2))
            pad_right = max(0, min(PAD, gap_right // 2))
            cell = keyed.crop((max(0, left - pad_left), max(0, top - PAD), right + 1 + pad_right, bottom + 1 + PAD))
            bleed += strip_bleed(cell)
            bounds = cell.getbbox()
            if bounds is None:
                sys.exit(f'no content in row {row_index} column {col_index}')
            cells[(row_index, col_index)] = cell.crop(bounds)
    if bleed:
        print(f'cleared {bleed}px of bleed from neighbouring poses')

    frame_w = max(pose.width for pose in cells.values())
    frame_h = max(pose.height for pose in cells.values())
    # Even dimensions keep the half-pixel origin off the sprite's centre line.
    frame_w += frame_w % 2
    frame_h += frame_h % 2

    sheet = Image.new('RGBA', (frame_w * POSE_COLUMNS, frame_h * len(FACING_INDEX)), (0, 0, 0, 0))
    row_of_name = {name: index for index, name in enumerate(rows)}
    # Every facing the engine indexes gets a row, whether or not the contact
    # sheet drew one. A sheet may supply only the east side and let the three
    # mirrors stand in for the west, which halves the cells a generator has to
    # keep consistent and makes the left-right pairs exact instead of nearly
    # alike.
    for name in sorted(FACING_INDEX, key=lambda key: FACING_INDEX[key]):
        # A mirrored facing takes its poses from another row, flipped. The
        # source sheet drew W facing the same way as E, and a piece that turns
        # west without turning is worse than a kit whose shield changes arms.
        mirrored = name in mirrors
        source_name = mirrors[name] if mirrored else name
        if source_name not in row_of_name:
            sys.exit(f'facing {name} has neither a row in --rows nor a --mirror source')
        source_row = row_of_name[source_name]
        target_row = FACING_INDEX[name]
        for col_index in range(POSE_COLUMNS):
            pose = cells[(source_row, col_index)]
            if mirrored:
                pose = pose.transpose(Image.FLIP_LEFT_RIGHT)
            # Centre horizontally, stand on the bottom edge: the feet are the
            # one landmark every pose shares, and aligning anything else makes
            # the character bob through the idle cycle.
            #
            # An odd amount of padding cannot be split evenly, so the extra
            # column goes to whichever side keeps a mirrored facing an exact
            # mirror of its source. Rounding the same way for both would leave
            # the pair one pixel out of true — invisible on the board, but it
            # would make "the west side is exactly the east side flipped" a
            # claim that does not survive being checked.
            padding = frame_w - pose.width
            x = col_index * frame_w + (padding - padding // 2 if mirrored else padding // 2)
            y = target_row * frame_h + (frame_h - pose.height)
            sheet.paste(pose, (x, y))

    sheet.save(args.out)
    print(f'{args.out}: {sheet.width}x{sheet.height}, frame {frame_w}x{frame_h}, ground {ground}')
    print('rows in facing order: ' + ', '.join(sorted(FACING_INDEX, key=lambda k: FACING_INDEX[k])))


if __name__ == '__main__':
    main()
