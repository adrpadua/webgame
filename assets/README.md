# Source Assets

This directory holds source media that is not itself a Godot gameplay resource.

| Location | Put here |
| --- | --- |
| `art/characters/` | Character, boss, minion, and portrait source art |
| `art/environment/` | Tiles, arenas, backgrounds, and environment source art |
| `audio/music/` | Music tracks and stems |
| `audio/sfx/` | Interface, combat, and ambient sound effects |
| `fonts/` | Font files licensed for the project |
| `ui/` | Interface textures, icon sources, and frame assets |

Godot-ready gameplay resources belong in [resources](../resources). Keep the original art or audio source here and reference imported/processed assets from scenes or `.tres` resources as the project grows.

For every externally sourced asset, keep its license, attribution, and source URL in a nearby `LICENSES.md` file or in the asset's folder.

## Placeholder Status

Every third-party asset below is a **placeholder**. The committed art direction is the clean hand-drawn, cel-shaded look in [hand-drawn-character-art-style.md](../docs/content/hand-drawn-character-art-style.md), grounded in the material language of [world-style-bible.md](../docs/content/world-style-bible.md). None of the borrowed art expresses that direction; it exists so the tactical surface is legible while the real art is produced, and it is expected to be replaced rather than extended.

Do not treat the current board, backdrop, or crest look as art direction, and do not source more assets to match it.

Current third-party source assets:

- [art/open-duelyst/LICENSES.md](art/open-duelyst/LICENSES.md): CC0 OpenDuelyst battlefield, board, and neutral boss presentation assets. Live placeholder skin — the backdrop, board and hover tiles, target tile, and neutral boss crest are preloaded by `scripts/Main.gd`, `scripts/hex/HexGrid.gd`, `scripts/hex/HexTile.gd`, and `scripts/hex/HexPiece.gd`.

- [0x72 DungeonTileset II](art/environment/0x72-dungeon-tileset-ii): CC0 dungeon scene. Present and Godot-imported, but referenced by no scene or script and drawn nowhere. Retained only as a licensed candidate backdrop; it is not the current arena skin.
