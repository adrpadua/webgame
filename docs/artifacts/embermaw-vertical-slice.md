# Embermaw Vertical Slice

This document records the completed first playable encounter delivered in the current prototype.

## Playable Loop

The playable scope is one `Aegis Guardian` tank versus `Embermaw`.

- The encounter opens on the authored board with visible coordinates, colored tile outlines, and legal hex-edge facing arrows.
- The round sequence is `Boss Instant` -> `Quick Window` -> `Boss Incoming` -> `Slow Window`.
- The encounter clock defaults to eight rounds and is authored by [resources/encounters/embermaw_prototype.tres](D:/dev/webgame/resources/encounters/embermaw_prototype.tres).
- Boss actions show and resolve separate `Tank Hit` and `Raid Hit` values. In the one-player slice, raid hits resolve against Aegis Guardian.
- The player wins by defeating Embermaw and loses through health depletion or enrage. Terminal results lock gameplay and expose `Restart Encounter`.
- Encounter history is retained in `EncounterState` for debugging, but is deliberately absent from the player HUD.

## Player Surface

- Aegis Guardian uses the authored 20-card starter deck.
- Hand, deck, discard, Energy, Tempo, Armor, Presence, health, action-bar slots, and boss timeline are visible in the running UI.
- Cards drag from hand to action-bar slots; click/tap selection remains available as a fallback.
- Slots preserve their top card, consume only charge cards on activation, and enforce the existing timing, charge-lock, Tempo, and Energy rules.
- Quick movement costs one Tempo, requires an adjacent empty hex, and updates player facing to the traversed legal hex edge.
- Invalid targeting, wrong-window activation, and illegal movement produce visible feedback.

## Responsive Layout

- `Main` binds itself to the active viewport at startup and whenever the window changes size.
- The authored design viewport is `1280x720`, with a resizable window and canvas-item stretch mode.
- The hand, action bar, board, and encounter clock remain in the primary visible layout; the board presents each combatant's health bar above its token.
- The secondary right-side information and control column scrolls on short windows rather than forcing the root UI beyond the viewport.

The layout probe at [scripts/debug/layout_probe.gd](D:/dev/webgame/scripts/debug/layout_probe.gd) asserts the root layout remains within a `1280x720` viewport.

## Mobile HUD

Portrait mobile is the primary HUD mode. It activates when the physical game window is narrow or taller than it is wide; this intentionally reads the actual window size rather than Godot's stretched logical canvas.

Mobile reading order:

1. Compact live status: round and phase, Aegis Guardian health/Energy/Tempo, Embermaw health
2. Hand: horizontally scrollable, with drag and tap selection intact
3. Board: the largest central region, with the hex grid, facing, and target selection
4. Action Bar: two persistent slots in a horizontal row
5. Command grid: Prepare, Charge, Activate, Move, Next, and post-encounter Restart

The desktop status panels and detailed right-side inspector are hidden on mobile so they do not compete with the board. Invalid-action feedback appears directly below mobile status. Coordinate visibility remains available through the `Coords` control. Health bars above the player, boss, and minion tokens provide the live combat readout.

The portrait regression probe at [scripts/debug/mobile_hud_probe.gd](D:/dev/webgame/scripts/debug/mobile_hud_probe.gd) checks the `390x844` design viewport, mobile visibility rules, board-before-action-bar ordering, command availability, and the absence of a player-facing combat log.

## Visual Skin

The board and global background use a low-opacity dungeon illustration from 0x72's `16x16 DungeonTileset II`.

- Used file: [dungeon-scene.png](D:/dev/webgame/assets/art/environment/0x72-dungeon-tileset-ii/dungeon-scene.png)
- Source: [0x72's itch.io page](https://0x72.itch.io/dungeontileset-ii)
- License and local attribution: [LICENSES.md](D:/dev/webgame/assets/art/environment/0x72-dungeon-tileset-ii/LICENSES.md)
- License: `CC0-1.0`

The texture is deliberately subdued so tactical tile outlines, character facings, card timing, and combat text remain legible.

## Verification

Run these from `D:\dev\webgame`:

```powershell
& "C:\Users\adrpa\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64_console.exe" --headless --path "D:\dev\webgame" --script res://scripts/debug/playthrough_smoke.gd

& "C:\Users\adrpa\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64_console.exe" --headless --path "D:\dev\webgame" --script res://scripts/debug/layout_probe.gd --quit-after 5

& "C:\Users\adrpa\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64_console.exe" --headless --path "D:\dev\webgame" --script res://scripts/debug/mobile_hud_probe.gd --quit-after 5
```

The playthrough smoke test covers the phase loop, persistent action bar, paid movement, legal facing update, invalid targeting, card-driven victory, health defeat, enrage defeat, boss damage profiles, and starter-deck count.
