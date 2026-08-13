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

Godot-ready gameplay resources belong in [resources](D:/dev/webgame/resources). Keep the original art or audio source here and reference imported/processed assets from scenes or `.tres` resources as the project grows.

For every externally sourced asset, keep its license, attribution, and source URL in a nearby `LICENSES.md` file or in the asset's folder.

Current third-party source assets:

- [art/open-duelyst/LICENSES.md](D:/dev/webgame/assets/art/open-duelyst/LICENSES.md): CC0 OpenDuelyst battlefield, board, and neutral boss presentation assets.

- [0x72 DungeonTileset II](D:/dev/webgame/assets/art/environment/0x72-dungeon-tileset-ii): CC0 dungeon scene used as the tactical arena backdrop
