# Embermaw Vertical Slice

Historical artifact: this records the earlier Energy/Tempo build. Current rules and controls are authoritative in `docs/rules/prototype-rules.md` and `docs/content/design-team-handoff.md`.

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
- Hand, deck, discard, Armor, Presence, health, Action Bar Slots, and boss timeline are visible in the running UI. Stamina is paid by discarding a hand card to move; it is not a persistent HUD meter.
- Cards drag from hand to action-bar slots; click/tap selection remains available as a fallback.
- Slots preserve their Top Card, consume only charge cards on activation, and enforce the authored timing and charge-lock rules.
- Movement discards one hand card, requires an adjacent empty hex, and updates player facing to the traversed legal hex edge.
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

1. Compact live status and a contextual prompt
2. Board: the largest central region, with the hex grid, facing, and target selection
3. Action Bar: two persistent landscape, art-led Slots in a compact horizontal row; Top Cards, tucked Charge Stack edges, charge capacity, and Empty/Loaded/Ready/Primed/Activated/Locked markers are distinct without color alone
4. Hand: a shallow centered fan of illustrated portrait Compact Cards; the selected card lifts and enlarges while adjacent cards remain visible, with drag, tap selection, and hold-to-inspect intact
5. Turn tracker and contextual Continue affordance when progression is available

The desktop status panels and detailed right-side inspector are hidden on mobile so they do not compete with the board. The former command grid is not rendered; direct card and Slot interactions drive the player flow. Full instructions live in the toggleable `?` help pane. `Continue` and `?` share one reserved controls row beneath the open help pane, or beneath the compact prompt header while help is closed: `Continue` is centered and `?` aligns to the right edge, so these controls never overlap status or guidance. Health bars above the player, boss, and minion tokens provide the live combat readout. Encounter history remains outside the HUD.

Board navigation is presentation-only. A one-finger drag that begins on open board space pans the zoomed board; a two-finger pinch zooms around the gesture center and may pan at the same time. Touches beginning on a unit remain available to the unit's existing tap and drag interactions. Desktop players may zoom with the mouse wheel and pan with the middle or right mouse button. Zoom and pan are clamped so the tactical board cannot be lost, and each encounter opens in a fully fitted view. These transforms do not alter hex legality, facing, actions, rules state, or Encounter Records.

### Riposte Ready Status

Status: confirmed. Owner: UI/UX, derived from the Game Design and Architecture Combat Postures contracts.

When the authoritative engine projection contains `Riposte Ready` on Aegis Guardian, the portrait HUD shows a compact Status Effect pane in the mobile status stack. It names `Riposte Ready`, states that a Tank Hit was fully blocked, identifies the first-following-Quick expiry boundary, and names Shield Slam as the legal consuming card with `+2` Boss damage. The tooltip expands the trigger as a Guarded Front Tank Hit with `0` Health loss and includes the trigger Round/phase from the active Status Effect snapshot.

The pane is presentation-only: it does not create trigger, expiry, consumption, payoff, legality, or timing rules. It reads active Status Effect fields from `EncounterEngine.status_effects`. After a legal Shield Slam consumes the effect, the pane clears because the authoritative Status Effect is gone, and the existing feedback line briefly reports the `+2` payoff from the resolved `status_event` plus generated Boss-damage Resolution Fact. The HUD does not expose Encounter Records as a combat log, does not add a posture meter, and does not show inactive or hypothetical Riposte states.

Rationale: the player needs to know why the opening exists, what closes it, and what card spends it without confusing Riposte Ready for a new resource. A compact Status Effect pane keeps the decision visible near the prompt while preserving the Bottom Interaction Zone for cards and Slots. Follow-up: QA should verify legibility and overlap in portrait, while Architecture should verify the UI remains an adapter over status projections and action facts.

The portrait regression probe at [scripts/debug/mobile_hud_probe.gd](D:/dev/webgame/scripts/debug/mobile_hud_probe.gd) checks the `390x844` design viewport, mobile visibility rules, board-before-action-bar ordering, command availability, and the absence of a player-facing combat log.

## Visual Skin

The board and global background use a low-opacity dungeon illustration from 0x72's `16x16 DungeonTileset II`.

- Used file: [dungeon-scene.png](D:/dev/webgame/assets/art/environment/0x72-dungeon-tileset-ii/dungeon-scene.png)
- Source: [0x72's itch.io page](https://0x72.itch.io/dungeontileset-ii)
- License and local attribution: [LICENSES.md](D:/dev/webgame/assets/art/environment/0x72-dungeon-tileset-ii/LICENSES.md)
- License: `CC0-1.0`

The texture is deliberately subdued so tactical tile outlines, character facings, card timing, and combat text remain legible.

## Card Presentation

The Hand and Action Bar use an art-first presentation. Compact Cards show timing and type icons, card art, a narrow title band, and visual Charge Value; resting cards contain no rules paragraph. Selecting or dragging one current Hand card dims unrelated cards and labels legal outcomes as `LOAD`, `REPLACE`, `CHARGE`, or `MOVE`. When duplicate Card resources exist in Hand, selection belongs to the tapped visual Compact Card instance so exactly one card lifts; `Main` still receives only the Card resource used by the existing action contract. Selected titles render in full with dynamic fitting inside the fixed title band.

The player may drag a Compact Card to a legal destination or tap the card and then tap a labeled legal Slot or `MOVE` hex. Both paths call the same existing load, charge, or movement handlers. Slot and board cues are projections of current Encounter, Hand, phase, Slot, and movement-legality state; previewing them submits no actions and never enters Encounter Records. Full rules remain in Card Inspection, which dismisses on release or outside tap.

Loading, tucking, activation, and Full-Charge Cleanup use short layout-stable feedback. Reduced-motion mode skips those transitions while preserving the final icon, label, border, and emphasis state. This presentation changes no Card effect, Slot timing, Charge Stack persistence, movement cost, targeting, Continue behavior, or no-combat-log HUD boundary.

The current paladin illustrations are local prototype placeholders. Their source and production-use constraints are recorded in [card-art-placeholder-provenance.md](card-art-placeholder-provenance.md).

## Verification

Run these from `D:\dev\webgame`:

```powershell
& "C:\Users\adrpa\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64_console.exe" --headless --path "D:\dev\webgame" --script res://scripts/debug/playthrough_smoke.gd

& "C:\Users\adrpa\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64_console.exe" --headless --path "D:\dev\webgame" --script res://scripts/debug/layout_probe.gd --quit-after 5

& "C:\Users\adrpa\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64_console.exe" --headless --path "D:\dev\webgame" --script res://scripts/debug/mobile_hud_probe.gd --quit-after 5

& "C:\Users\adrpa\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64_console.exe" --headless --path "D:\dev\webgame" --script res://scripts/debug/board_navigation_probe.gd

& "C:\Users\adrpa\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64_console.exe" --headless --path "D:\dev\webgame" --script res://scripts/debug/action_bar_art_probe.gd

& "C:\Users\adrpa\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64_console.exe" --headless --path "D:\dev\webgame" --script res://scripts/debug/riposte_status_ui_probe.gd --quit-after 900
```

The playthrough smoke test covers the phase loop, persistent action bar, paid movement, legal facing update, invalid targeting, card-driven victory, health defeat, enrage defeat, boss damage profiles, and starter-deck count.
