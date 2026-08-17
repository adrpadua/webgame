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

The exception is the tile, floor, and crest blocks in [board-and-tiles.md](board-and-tiles.md). Those are self-contained and take **no** preamble: the preamble describes painterly material rendering that a monochrome hex ring cannot express, and prepending it only dilutes the geometric instruction that decides whether the asset works. The hex tile floor is the strictest case — the interface direction's one-texture-per-surface rule leaves it no surface detail at all, and the preamble's material paragraph would argue for some.

[board-sprite-sheets.md](board-sprite-sheets.md) is a narrower exception. It takes the preamble and overrides one paragraph of it — the rendering style, because a board piece is pixel art and a card is not. The materials, palette, and shape language still come from the shared file, which is what keeps a piece and its own card the same character.

## Templates

| Template | Produces | Output path |
| --- | --- | --- |
| [hero-concept.md](hero-concept.md) | Full-body Hero concept sheets | `assets/art/concepts/<hero-slug>/` |
| [card-ability-art.md](card-ability-art.md) | Card and action-bar ability illustrations | `assets/art/cards/<hero-slug>/` |
| [board-and-tiles.md](board-and-tiles.md) | Hover and target tiles, boss crest, hex tile floor, arena backdrop | `assets/art/board/` |
| [boss-and-minion.md](boss-and-minion.md) | Raid boss and minion art | `assets/art/bosses/`, `assets/art/minions/` |
| [board-sprite-sheets.md](board-sprite-sheets.md) | Six-facing idle sheets for pieces on the board | `assets/art/characters/<entity-slug>/` |

Supporting files: [`_style-preamble.md`](_style-preamble.md) holds the locked style contract, [`_tools.md`](_tools.md) holds the tool decisions.

Pre-composed and ready to send:

- [elian-voss-card-prompts.md](elian-voss-card-prompts.md) — all eleven authored Elian cards with every slot filled, sequenced for a single generation session.
- [board-art-prompts.md](board-art-prompts.md) — hover tile, target tile, and boss crest, with export sizes and wiring steps.
- [embermaw-sprite-prompts.md](embermaw-sprite-prompts.md) — the Embermaw, Embermaw Phase II, and Whelp idle sheets. **Generated, never hand-edited**: run `python3 tools/compose_sprite_prompts.py` after editing the preamble or the sprite template.

Regenerate any of these from the preamble and their class template if those change.

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

> **Paused as of 2026-08-16 — do not follow this section yet.** Finished card art is banked, not wired: commit it under `assets/art/cards/<hero-slug>/` and stop. Everything below targets the Godot client, which is frozen until the web version feels like a real game, and the web surface has no way to consume card art. See [Replacement Backlog](#replacement-backlog) for the full reasoning. The steps here stay accurate and apply unchanged whenever the freeze lifts.
>
> **Two board assets are outside this pause**, because they target the live board rather than the frozen one: the hex tile floor and the arena backdrop in [board-and-tiles.md](board-and-tiles.md). Neither is wired either, but both would wire into `web/src/board/`, and that file states where. Nothing in this section applies to them.

Generating the image is half the job. The two halves of the codebase consume art differently, and only one of them can be done without touching code.

**Card art is data-driven.** `CardData.get_artwork()` resolves in three steps: the `artwork` export on the card resource if set, then a hardcoded `ART_BY_CARD_ID` lookup by card id, then `PLACEHOLDER_ART`. No card in `resources/cards/tank/` sets `artwork` today, so all eleven currently fall through to the second step and draw paladin placeholders.

That makes the clean path for new card art a resource edit, not a script edit: drop the PNG in `assets/art/cards/<hero-slug>/`, let Godot import it, and set `artwork` on the card's `.tres`. It overrides the fallback with no code change.

The fallback itself lives in `scripts/cards/PlaceholderCardArt.gd`, which holds two things with different lifetimes. `BY_CARD_ID` is temporary and dies once every card sets `artwork`. `EMPTY_SLOT` is permanent — it is what the UI draws where there is no card at all, which real card art does not replace. That file documents which half to delete and when.

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
| `open-duelyst/tile_board@2x.png` | Vendored, unreferenced | Superseded by the hex tile floor in [board-and-tiles.md](board-and-tiles.md); delete rather than wire |
| `environment/0x72-dungeon-tileset-ii/dungeon-scene.png` | Vendored, unreferenced | Superseded; nothing to generate |
| `prototype/paladin/*.webp` | Live — serving all eleven Elian cards | [card-ability-art.md](card-ability-art.md) |
| `prototype/paladin-placeholder.png` | Live — fallback for any unmapped card | [card-ability-art.md](card-ability-art.md) |

The card art is the largest single job. Eight paladin placeholder images currently serve eleven cards, so three pairs share art: `fortify` and `iron_guard` both draw `shield.webp`, `shield_slam` and `sweeping_blow` both draw `aoe.webp`, and `rallying_cry` and `taunting_challenge` both draw `taunt.webp`. Generating the set replaces the borrowed art and ends the sharing at the same time, since [card-ability-art.md](card-ability-art.md) gives each of the eleven its own fiction and beat.

Those eleven are also the exit condition for this library in its current form. Prompt-based direction has a ceiling: every generation re-describes the style in prose and hopes for compliance, which is why drift is a standing risk and why a whole file exists to fight it. Once roughly fifteen approved assets accumulate, a trained style model carries the direction in weights instead of adjectives, and becomes the better tool. [`_tools.md`](_tools.md) records that path and when to revisit it.

**Finished art is banked, not wired.** Decided 2026-08-16. Commit each approved generation under `assets/art/cards/elian-voss/` named for its card in hyphenated form, matching `guard-stance.png` for `guard_stance`, and do not perform the wiring described below. Every wiring path here is Godot, and Godot is paused until the web version feels like a real game — an extension of the freeze in [ADR 0019](../../adr/0019-rebuild-the-encounter-engine-in-typescript-as-the-rules-source-of-truth.md). The web surface cannot consume card art either: `data/cards/*.json` has no art field and nothing under `web/src/` reads card imagery. Adding one is deliberately out of scope, so the art is accumulating against the trained-style-model path above rather than against a renderer. The wiring instructions stay here for whenever a freeze lifts.
