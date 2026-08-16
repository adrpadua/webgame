# Art Prompt Library

Status: active production tooling. Reusable prompt sets for generating game art that matches the committed direction, written for conversational image models where the prompt is natural-language prose and references are attached as images rather than passed as flags.

This library exists to replace the placeholder art catalogued in [assets/README.md](../../../assets/README.md). It does not change rules or content behavior.

## Pick The Tool First

[`_tools.md`](_tools.md) records which generator each asset class goes to and why. Read it before starting a new class — the templates assume those choices, and one of them changes how you compose.

The short version: tiles and the boss crest go to a **vector generator**, because they need true alpha and crisp edges at 46–68 px. Everything else goes to a conversational image model with reference attachment. Midjourney was considered and rejected; `_tools.md` records the reasoning so it does not get re-litigated.

## How To Compose A Prompt

Most prompts are two pieces, pasted in order:

1. **[`_style-preamble.md`](_style-preamble.md)** — the locked style contract. Identical for every asset, every time.
2. **One asset-class template** — the part that varies, with `{{SLOTS}}` you fill in.

Then attach any reference images the template asks for, and generate.

The split is the whole point. Style lives in exactly one file, so correcting the direction is one edit rather than a sweep through every prompt, and two assets generated a month apart still agree about what the game looks like. Resist the temptation to paste style wording into a template — that is how a prompt set quietly stops being a set.

The exception is the tile and crest blocks in [board-and-tiles.md](board-and-tiles.md). Those are self-contained and take **no** preamble: the preamble describes painterly material rendering that a monochrome hex ring cannot express, and prepending it only dilutes the geometric instruction that decides whether the asset works.

## Templates

| Template | Produces | Output path |
| --- | --- | --- |
| [hero-concept.md](hero-concept.md) | Full-body Hero concept sheets | `assets/art/concepts/<hero-slug>/` |
| [card-ability-art.md](card-ability-art.md) | Card and action-bar ability illustrations | `assets/art/cards/<hero-slug>/` |
| [board-and-tiles.md](board-and-tiles.md) | Hover and target tiles, boss crest, arena backdrop | `assets/art/board/` |
| [boss-and-minion.md](boss-and-minion.md) | Raid boss and minion art | `assets/art/bosses/`, `assets/art/minions/` |

Supporting files: [`_style-preamble.md`](_style-preamble.md) holds the locked style contract, [`_tools.md`](_tools.md) holds the tool decisions.

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

## Getting A Generated Asset Into The Game

Generating the image is half the job. The two halves of the codebase consume art differently, and only one of them can be done without touching code.

**Card art is data-driven.** `CardData.get_artwork()` resolves in three steps: the `artwork` export on the card resource if set, then a hardcoded `ART_BY_CARD_ID` lookup by card id, then `PLACEHOLDER_ART`. No card in `resources/cards/tank/` sets `artwork` today, so all eleven currently fall through to the second step and draw paladin placeholders.

That makes the clean path for new card art a resource edit, not a script edit: drop the PNG in `assets/art/cards/<hero-slug>/`, let Godot import it, and set `artwork` on the card's `.tres`. It overrides the fallback with no code change. Once every card sets `artwork`, the `ART_BY_CARD_ID` table and its paladin imports become dead and should be deleted rather than left as a decoy.

**Board art is hardcoded.** Tiles and the crest are `preload` constants compiled into `scripts/hex/HexTile.gd` and `scripts/hex/HexPiece.gd`, so replacing either requires editing the script that names it.

The backdrop is the exception: its path lives once in `scripts/art/ArenaArt.gd` as `ArenaArt.BACKDROP`, and both drawing sites reference it from there. Swapping the backdrop is a one-line edit in that file. The tile and crest constants could follow the same pattern when their replacements land.

**Then verify in the game, not the file browser.** This is where board art fails, because the runtime tint is applied after everything above.

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
| `prototype/paladin/*.webp` | Live — serving all eleven Elian cards | [card-ability-art.md](card-ability-art.md) |
| `prototype/paladin-placeholder.png` | Live — fallback for any unmapped card | [card-ability-art.md](card-ability-art.md) |

The card art is the largest single job. Eight paladin placeholder images currently serve eleven cards, so three pairs share art: `fortify` and `iron_guard` both draw `shield.webp`, `shield_slam` and `sweeping_blow` both draw `aoe.webp`, and `rallying_cry` and `taunting_challenge` both draw `taunt.webp`. Generating the set replaces the borrowed art and ends the sharing at the same time, since [card-ability-art.md](card-ability-art.md) gives each of the eleven its own fiction and beat.

Those eleven are also the exit condition for this library in its current form. Prompt-based direction has a ceiling: every generation re-describes the style in prose and hopes for compliance, which is why drift is a standing risk and why a whole file exists to fight it. Once roughly fifteen approved assets accumulate, a trained style model carries the direction in weights instead of adjectives, and becomes the better tool. [`_tools.md`](_tools.md) records that path and when to revisit it.
