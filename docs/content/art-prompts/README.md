# Art Prompt Library

Status: active production tooling. Reusable prompt sets for generating game art that matches the committed direction, written for conversational image models where the prompt is natural-language prose and references are attached as images rather than passed as flags.

This library exists to replace the placeholder art catalogued in [assets/README.md](../../../assets/README.md). It does not change rules or content behavior.

## How To Compose A Prompt

Every prompt is two pieces, pasted in order:

1. **[`_style-preamble.md`](_style-preamble.md)** — the locked style contract. Identical for every asset, every time.
2. **One asset-class template** — the part that varies, with `{{SLOTS}}` you fill in.

Then attach any reference images the template asks for, and generate.

The split is the whole point. Style lives in exactly one file, so correcting the direction is one edit rather than a sweep through every prompt, and two assets generated a month apart still agree about what the game looks like. Resist the temptation to paste style wording into a template — that is how a prompt set quietly stops being a set.

## Templates

| Template | Produces | Output path |
| --- | --- | --- |
| [hero-concept.md](hero-concept.md) | Full-body Hero concept sheets | `assets/art/concepts/<hero-slug>/` |
| [card-ability-art.md](card-ability-art.md) | Card and action-bar ability illustrations | `assets/art/cards/<hero-slug>/` |
| [board-and-tiles.md](board-and-tiles.md) | Hover and target tiles, boss crest, arena backdrop | `assets/art/board/` |
| [boss-and-minion.md](boss-and-minion.md) | Raid boss and minion art | `assets/art/bosses/`, `assets/art/minions/` |

## Generation Order

Order matters, because later assets are generated against earlier ones:

1. **Hero concept** first. It becomes the reference image for everything that Hero owns.
2. **Card art** second, always with the concept sheet attached.
3. **Boss and minion** art, which can proceed independently of Heroes.
4. **Board and tiles** last, tuned against the art that will sit on top of them.

## Holding Consistency Across A Set

Text alone will not hold a character across twenty images. Three habits do most of the work:

- **Attach the anchor.** [`elian-voss-clean-concept.png`](../../../assets/art/concepts/elian-voss/elian-voss-clean-concept.png) is the calibration target for the entire library — it was produced from the hero template and landed the direction. Attach it when generating a new Hero so the roster reads as one game. Attach the relevant Hero sheet for every card.
- **Generate a family in one session.** The Guard card ladder, or the hover and target tile pair, should be produced together while context is warm. Assets meant to be compared should never be generated a week apart.
- **Regenerate, do not patch.** If an image drifts, fix the slot wording and re-run. Hand-editing one output to match the set leaves you with an asset no prompt can reproduce.

## Verifying Output

Every template ends with an acceptance check; run it before saving anything into `assets/`.

Two failure modes are worth naming here because they cost the most time:

**Board art must be verified in the game, not in the image viewer.** Tiles and the backdrop are drawn through runtime color modulation, so an image that looks right standing alone can be wrong once multiplied. [board-and-tiles.md](board-and-tiles.md) lists the exact tint each asset receives.

**Silhouette readability is checked by shrinking, not squinting.** The game is portrait-first mobile on a `390x844` logical viewport, with `76x80` hex cells. Scale the image down to its real size and look again.

## When The Direction Changes

Edit [`_style-preamble.md`](_style-preamble.md), then regenerate the affected sets rather than letting old and new art coexist. If the change is large enough to invalidate the anchor concept, regenerate that first and re-anchor everything else to the new one.

The preamble paraphrases [world-style-bible.md](../world-style-bible.md) and [hand-drawn-character-art-style.md](../hand-drawn-character-art-style.md) into model-ready prose. Those two documents remain authoritative; if the preamble contradicts them, the preamble is the bug.

## Replacement Backlog

What the placeholders are, and which template retires each one:

| Placeholder | Status | Retired by |
| --- | --- | --- |
| `open-duelyst/magaari_ember_highlands_background.jpg` | Live — window and board backdrop | [board-and-tiles.md](board-and-tiles.md), arena backdrop |
| `open-duelyst/tile_hover@2x.png` | Live — hover state | [board-and-tiles.md](board-and-tiles.md), hover tile |
| `open-duelyst/tile_target.png` | Live — target state | [board-and-tiles.md](board-and-tiles.md), target tile |
| `open-duelyst/boss_neutral_crest_hex@2x.png` | Live — boss hex marker | [board-and-tiles.md](board-and-tiles.md), boss crest |
| `open-duelyst/tile_board@2x.png` | Vendored, unreferenced | Optional; needs wiring before it would appear |
| `environment/0x72-dungeon-tileset-ii/dungeon-scene.png` | Vendored, unreferenced | Superseded; nothing to generate |
| `prototype/paladin/*.webp` | Placeholder ability icons | [card-ability-art.md](card-ability-art.md), once a Paladin kit is authored |

Cards in `resources/cards/tank/` currently carry no art at all — the eleven authored Elian Voss cards are the largest single generation job in the backlog, and [card-ability-art.md](card-ability-art.md) lists the fiction and beat for each.
