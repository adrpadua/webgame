# Embermaw Vertical Slice

Historical artifact: this records the earlier Energy/Tempo build. Current rules and controls are authoritative in `docs/rules/prototype-rules.md` and `docs/content/design-team-handoff.md`.

The contextual tutorial prompt surface is a presentation consumer of authored contracts in [embermaw-prototype.md](../content/encounters/embermaw-prototype.md#contextual-teaching-contracts). It consumes the authoritative `EncounterEngine` projection only and must not infer gameplay from HUD state.

This document records the completed first playable encounter delivered in the current prototype.

## Playable Loop

The playable scope is one `Elian Voss` tank versus `Embermaw`.

- The encounter opens on the authored board with visible coordinates, colored tile outlines, and legal hex-edge facing arrows.
- The round sequence is `Boss Instant` -> `Quick Window` -> `Boss Incoming` -> `Slow Window`.
- The encounter clock defaults to eight rounds and is authored by [resources/encounters/embermaw_prototype.tres](D:/dev/webgame/resources/encounters/embermaw_prototype.tres).
- Boss actions show and resolve separate `Tank Hit` and `Raid Hit` values. In the one-player slice, raid hits resolve against Elian Voss.
- The player wins by defeating Embermaw and loses through health depletion or enrage. Terminal results lock gameplay and expose `Restart Encounter`.
- Encounter history is retained in `EncounterState` for debugging, but is deliberately absent from the player HUD.

## Player Surface

- Elian Voss uses the authored 20-card starter deck.
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

Status: confirmed. Owner: UI/UX.

The portrait mobile HUD keeps a logical design canvas of `390x844` for probes, layout rules, and interaction sizing, but the default non-headless display override now opens at `488x1056` so the playable capture window is easier to inspect. Godot stretch remains `canvas_items` with explicit `keep` aspect preservation, so the larger default window is a clean `1.25x` presentation of the same portrait canvas rather than a new layout breakpoint or a distorted stretch.

Rationale: the prior default window was too small for external observation and manual capture, even though the internal portrait probes already exercised the correct logical HUD. Keeping the probe-sized logical canvas preserves every existing mobile contract while making the default live window more legible for playtest and review. Follow-up: QA should independently verify that the default non-headless window still presents the same portrait hierarchy and that no new distortion or layout breakpoint appears.

Mobile reading order:

1. Compact live status and a contextual prompt
2. Board: the largest central region, with the hex grid, facing, and target selection
3. Action Bar: two persistent landscape, art-led Slots in a compact horizontal row; Top Cards, tucked Charge Stack edges, charge capacity, and Empty/Loaded/Ready/Primed/Activated/Locked markers are distinct without color alone
4. Hand: a shallow centered fan of illustrated portrait Compact Cards; the selected card lifts and enlarges while adjacent cards remain visible, with drag, tap selection, and hold-to-inspect intact
5. Turn tracker and contextual Continue affordance when progression is available

First-Loadout guidance is intentionally terse and action-first. On the opening portrait view, the prompt says `Put a card in a Slot, then tap Play.` Empty compact Slots read as `CARD SLOT` with `DROP`, and the full Help pane explains the visible vocabulary in player language: a lifted card is selected, `LOAD` marks a legal destination, and enemy danger hexes are called out as `DANGER`. This slice is presentation-only and keeps the current approved interaction authority: `Play` remains the primary mobile action, Help remains the secondary support control, and no separate mobile Undo control is introduced in this slice.

Rationale: the first decision should be legible without reading a long guide or inferring meaning from color. Follow-up: any future mobile Undo or phase-reset control must come through a separate approved intake instead of being inferred or bundled into this first-Loadout presentation slice.

The desktop status panels and detailed right-side inspector are hidden on mobile so they do not compete with the board. The former command grid is not rendered; direct card and Slot interactions drive the player flow. Full instructions live in the toggleable `?` help pane. Portrait mobile now applies explicit safe bounds to every prompt-adjacent required control across both the logical `390x844` design viewport and the default `488x1056` non-headless presentation.

Tutorial guidance is one short, non-blocking contextual card at a time. Its Dismiss control changes caller-owned presentation progress only; it never advances an encounter phase, creates an action, or protects a required gesture. The card remains inside the same physical safe lane as the prompt text and leaves the board, Action Bar, and hand visible. Help supplements the normal guide with a text-first history of shown tips; selecting an entry and tapping Review reopens that item as its contextual card. This history is presentation-only and is neither an Encounter Record nor a gameplay fact.

Status: confirmed. Owner: UI/UX.

Owned safe lanes:

- Prompt and Status Effect text use the physical portrait canvas, not the wider stretched root, as their readable left/right bounds.
- The contextual prompt must remain fully inside that safe text lane as well; its readable text cannot touch or cross the physical viewport edge in either supported portrait presentation.
- `Play` occupies the action-bar lane and stays aligned to the compact Action Bar's right edge with explicit inner padding.
- `?` occupies the far-right safe lane with explicit edge padding against the physical viewport.

Pressure behavior:

- Required controls never clip, leave the physical viewport, or lose their target size.
- If `Play` + `?` cannot coexist on one line without overlap, the controls row grows and `?` wraps onto a second line while `Play` stays in the action-bar lane.
- Help and Status Effect text continue to wrap inside their safe content column rather than expanding past the portrait viewport.

Rationale: the stretched root can be wider than the physical portrait viewport, especially in the default capture-friendly presentation. Safe lanes keep required controls fully on-screen and readable without redesigning the HUD or changing interaction authority. Follow-up: Architecture should verify this remains a presentation-only seam, and QA should verify the supported portrait viewport matrix plus negative clipped/off-screen assertions.

Health bars above the player, boss, and minion tokens provide the live combat readout. Encounter history remains outside the HUD.

Board navigation is presentation-only. A one-finger drag that begins on open board space pans the zoomed board; a two-finger pinch zooms around the gesture center and may pan at the same time. Touches beginning on a unit remain available to the unit's existing tap and drag interactions. Desktop players may zoom with the mouse wheel and pan with the middle or right mouse button. Zoom and pan are clamped so the tactical board cannot be lost, and each encounter opens in a fully fitted view. These transforms do not alter hex legality, facing, actions, rules state, or Encounter Records.

### Riposte Ready Status

Status: confirmed. Owner: UI/UX, derived from the Game Design and Architecture Combat Postures contracts.

When the authoritative engine projection contains `Riposte Ready` on Elian Voss, the portrait HUD shows a compact Status Effect pane in the mobile status stack. It names `Riposte Ready`, states that a Tank Hit was fully blocked, identifies the first-following-Quick expiry boundary, and names Shield Slam as the legal consuming card with `+2` Boss damage. The tooltip expands the trigger as a Guarded Front Tank Hit with `0` Health loss and includes the trigger Round/phase from the active Status Effect snapshot.

The pane is presentation-only: it does not create trigger, expiry, consumption, payoff, legality, or timing rules. It reads active Status Effect fields from `EncounterEngine.status_effects`. After a legal Shield Slam consumes the effect, the pane clears because the authoritative Status Effect is gone, and the existing feedback line briefly reports the `+2` payoff from the resolved `status_event` plus generated Boss-damage Resolution Fact. The HUD does not expose Encounter Records as a combat log, does not add a posture meter, and does not show inactive or hypothetical Riposte states.

Rationale: the player needs to know why the opening exists, what closes it, and what card spends it without confusing Riposte Ready for a new resource. A compact Status Effect pane keeps the decision visible near the prompt while preserving the Bottom Interaction Zone for cards and Slots. Follow-up: QA should verify legibility and overlap in portrait, while Architecture should verify the UI remains an adapter over status projections and action facts.

The portrait regression probe at [scripts/debug/mobile_hud_probe.gd](D:/dev/webgame/scripts/debug/mobile_hud_probe.gd) lays out once at the `390x844` logical design viewport, then checks that the rendered Help rectangle remains readable, tappable, distinct from Play, and fully inside both the logical canvas and the `488x1056` default presentation. It also checks mobile visibility rules, board-before-action-bar ordering, required-control safe padding, unclipped button labels, and the absence of a player-facing combat log. A non-headless run captures the Help-hidden and Help-open default-presentation images without reapplying the physical display size as a layout breakpoint.

## Visual Skin

The board and global background use a low-opacity dungeon illustration from 0x72's `16x16 DungeonTileset II`.

- Used file: [dungeon-scene.png](D:/dev/webgame/assets/art/environment/0x72-dungeon-tileset-ii/dungeon-scene.png)
- Source: [0x72's itch.io page](https://0x72.itch.io/dungeontileset-ii)
- License and local attribution: [LICENSES.md](D:/dev/webgame/assets/art/environment/0x72-dungeon-tileset-ii/LICENSES.md)
- License: `CC0-1.0`

The texture is deliberately subdued so tactical tile outlines, character facings, card timing, and combat text remain legible.

## Card Presentation

The Hand and Action Bar use an art-first presentation. Compact Cards show timing and type icons, card art, a narrow title band, and visual Charge Value; resting cards contain no rules paragraph. Selecting or dragging one current Hand card dims unrelated cards and labels legal outcomes as `LOAD`, `REPLACE`, `CHARGE`, or `MOVE`. When duplicate Card resources exist in Hand, selection belongs to the tapped visual Compact Card instance so exactly one card lifts; `Main` still receives only the Card resource used by the existing action contract. Selected titles render in full with dynamic fitting inside the fixed title band.

Status: confirmed for first-Loadout comprehension. Owner: UI/UX.

The selected Compact Card now carries an explicit `SEL` badge in addition to lift, border, and dimming. Empty compact Slots present as destinations before selection, using `CARD SLOT` plus `DROP`, and still promote `LOAD` once a selected Hand card can legally land there. Enemy telegraph hexes add an explicit `DANGER` cue and tooltip copy so threat tiles are not distinguished by color alone.

Rationale: newcomers should be able to identify the selected card, the place a card can go, and the boss-threat surface at a glance. Follow-up: QA should validate the new cues at portrait scale, while Architecture should confirm the new copy remains a projection of existing Slot and board state rather than a new rules seam.

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
