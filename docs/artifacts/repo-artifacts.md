# Repo Artifacts

This document catalogs the major gameplay artifacts currently present in the repo.

## Repository Homes

- [assets](D:/dev/webgame/assets)
  - Source art, audio, fonts, and UI media; see its README for the layout
- [resources](D:/dev/webgame/resources)
  - Designer-authored Cards, Keywords, Charge Modifiers, Boss Programs, Hazards, Minions, and Encounters
- [data](D:/dev/webgame/data)
  - Reserved for structured authored data when a loader needs it
- [notes](D:/dev/webgame/notes)
  - Working notes, research, and prototype screenshots

## Scenes

- [scenes/Main.tscn](D:/dev/webgame/scenes/Main.tscn)
  - Main playable prototype scene
  - Wires the top bar, hand, action bar, board, status panel, movement button, and phase controls

## Domain and Decision Docs

- [CONTEXT.md](D:/dev/webgame/CONTEXT.md)
  - Domain glossary for encounter, timeline, slots, tempo, and other canonical terms
- [docs/adr/0001-encounter-round-and-enrage.md](D:/dev/webgame/docs/adr/0001-encounter-round-and-enrage.md)
  - Scripted two-window encounter structure
- [docs/adr/0002-use-a-persistent-action-bar-with-charge-stacks.md](D:/dev/webgame/docs/adr/0002-use-a-persistent-action-bar-with-charge-stacks.md)
  - Persistent action bar with charge stacks
- [docs/artifacts/project-coordination.md](D:/dev/webgame/docs/artifacts/project-coordination.md)
  - Cross-task source-of-truth map, confirmed handoffs, open questions, and milestone gate
- [docs/artifacts/deck-evaluation-measurement-plan.md](D:/dev/webgame/docs/artifacts/deck-evaluation-measurement-plan.md)
  - QA-facing plan for measuring deck viability and play-feel from Encounter Records, probes, and short human rubrics
- [docs/artifacts/deck-eval-notes](D:/dev/webgame/docs/artifacts/deck-eval-notes)
  - Human-scored deck-evaluation note template and future review notes

## Content Docs

- [docs/content/README.md](D:/dev/webgame/docs/content/README.md)
  - Content-docs index and directory purpose
- [docs/content/deck-evaluation-rubric.md](D:/dev/webgame/docs/content/deck-evaluation-rubric.md)
  - Design-facing scorecard for deck Viability and Play-feel in the current boss-raid prototype
- [docs/content/decks/elian-voss-starter.md](D:/dev/webgame/docs/content/decks/elian-voss-starter.md)
  - Current tank starter decklist and role notes
- [docs/content/encounters/embermaw-prototype.md](D:/dev/webgame/docs/content/encounters/embermaw-prototype.md)
  - Current prototype encounter spec
- [docs/content/boss-scripts/embermaw-script.md](D:/dev/webgame/docs/content/boss-scripts/embermaw-script.md)
  - Current Embermaw boss script loop and action notes
- [docs/artifacts/embermaw-vertical-slice.md](D:/dev/webgame/docs/artifacts/embermaw-vertical-slice.md)
  - Completed vertical-slice behavior, responsive-layout contract, visual skin, and verification commands
- [docs/artifacts/accessibility.md](D:/dev/webgame/docs/artifacts/accessibility.md)
  - Player HUD target-size, contrast-state, and keyboard-focus contract

## Visual Assets

- [assets/art/environment/0x72-dungeon-tileset-ii](D:/dev/webgame/assets/art/environment/0x72-dungeon-tileset-ii)
  - CC0 dungeon illustration from 0x72's `16x16 DungeonTileset II`
  - Used as a subdued arena and global background texture
  - Local source and license record: [LICENSES.md](D:/dev/webgame/assets/art/environment/0x72-dungeon-tileset-ii/LICENSES.md)

## Player Card Resources

Tank deck resources in [resources/cards/tank](D:/dev/webgame/resources/cards/tank):

- `anchor_presence.tres`
  - Slow presence-growth card
- `fortify.tres`
  - Slow armor spike
- `guard_stance.tres`
  - Quick armor basic
- `intercept.tres`
  - Quick armor plus minion hit
- `rallying_cry.tres`
  - Quick heal and energy gain
- `shield_slam.tres`
  - Quick boss hit
- `sweeping_blow.tres`
  - Quick minion hit
- `taunting_challenge.tres`
  - Quick armor plus boss ping
- `unyielding_step.tres`
  - Slow mixed defense and boss pressure

Legacy/general sample card resources in [resources/cards](D:/dev/webgame/resources/cards):

- `gather_strength.tres`
- `grow_presence.tres`
- `strike_hex.tres`

## Legacy Boss Action Resources

Historical pre-SDK Boss actions are isolated under [resources/legacy/boss_actions](D:/dev/webgame/resources/legacy/boss_actions). They are not designer-facing content and are not loaded by Encounters.

- `raid_opening.tres`
  - opening tank hit
- `tail_whip.tres`
  - tank hit plus front-line cleave
- `ember_breath.tres`
  - heavier tank hit
- `brood_call.tres`
  - summon action
- `crushing_bite.tres`
  - damage plus boss self-heal

## Encounter Resources

Encounter configuration in [resources/encounters](D:/dev/webgame/resources/encounters):

- `embermaw_prototype.tres`
  - encounter clock and authored enrage text for the current vertical slice

## Core Gameplay Scripts

- [scripts/Main.gd](D:/dev/webgame/scripts/Main.gd)
  - Main scene coordinator
  - Translates drag-drop interactions into `EncounterAction` records and renders engine projections
- [scripts/sdk/EncounterEngine.gd](D:/dev/webgame/scripts/sdk/EncounterEngine.gd)
  - Authoritative rules owner for the live scene and headless simulation
- [scripts/player/PlayerState.gd](D:/dev/webgame/scripts/player/PlayerState.gd)
  - Read-only Hero, Hand, and Action Bar projection for the UI
- [scripts/turns/TurnManager.gd](D:/dev/webgame/scripts/turns/TurnManager.gd)
  - Read-only phase and Round projection
- [scripts/encounter/EncounterState.gd](D:/dev/webgame/scripts/encounter/EncounterState.gd)
  - Read-only outcome and presentation log projection
- [scripts/encounter/EncounterData.gd](D:/dev/webgame/scripts/encounter/EncounterData.gd)
  - Authored encounter configuration schema
- [scripts/boss/BossState.gd](D:/dev/webgame/scripts/boss/BossState.gd)
  - Read-only Boss Timeline projection
- [scripts/boss/BossActionData.gd](D:/dev/webgame/scripts/boss/BossActionData.gd)
  - Boss action resource schema
- [scripts/cards/CardData.gd](D:/dev/webgame/scripts/cards/CardData.gd)
  - Designer-facing Card resource schema

## Board and Piece Scripts

- [scripts/hex/HexGrid.gd](D:/dev/webgame/scripts/hex/HexGrid.gd)
  - Hex board rendering, direct manipulation, telegraphs, and route previews over SDK board state
- [scripts/hex/HexTile.gd](D:/dev/webgame/scripts/hex/HexTile.gd)
  - Individual hex tile UI, coordinate display, and drag-drop tile target behavior
- [scripts/hex/HexPiece.gd](D:/dev/webgame/scripts/hex/HexPiece.gd)
  - Board token rendering, health, facing, and drag behavior
- [scripts/combat/Facing.gd](D:/dev/webgame/scripts/combat/Facing.gd)
  - Canonical hex-edge facing directions and normalization

## UI Scripts

- [scripts/ui/HandView.gd](D:/dev/webgame/scripts/ui/HandView.gd)
  - Hand row renderer
- [scripts/ui/CardButton.gd](D:/dev/webgame/scripts/ui/CardButton.gd)
  - Compact draggable card UI
- [scripts/ui/ActionBarView.gd](D:/dev/webgame/scripts/ui/ActionBarView.gd)
  - Action bar list renderer
- [scripts/ui/ActionBarSlot.gd](D:/dev/webgame/scripts/ui/ActionBarSlot.gd)
  - Drop-enabled slot UI
- [scripts/ui/CombatantPanel.gd](D:/dev/webgame/scripts/ui/CombatantPanel.gd)
  - Boss and player summary panels
- [scripts/ui/FacingBadge.gd](D:/dev/webgame/scripts/ui/FacingBadge.gd)
  - Facing indicator support UI

## Prototype Validation

- [docs/artifacts/probe-harness.md](D:/dev/webgame/docs/artifacts/probe-harness.md)
  - Stable headless Probe suite, runner, and Spike-to-Probe promotion rules
- [scripts/debug/run_probes.ps1](D:/dev/webgame/scripts/debug/run_probes.ps1)
  - One-command runner for the stable headless Probe suite

- [scripts/debug/playthrough_smoke.gd](D:/dev/webgame/scripts/debug/playthrough_smoke.gd)
  - Headless smoke test for the complete encounter loop, outcomes, targeting, damage profiles, persistent slots, and paid movement
- [scripts/debug/layout_probe.gd](D:/dev/webgame/scripts/debug/layout_probe.gd)
  - Headless layout check for the authored `1280x720` responsive canvas
- [scripts/debug/mobile_hud_probe.gd](D:/dev/webgame/scripts/debug/mobile_hud_probe.gd)
  - Headless portrait HUD check for the `390x844` mobile layout
- [scripts/debug/accessibility_probe.gd](D:/dev/webgame/scripts/debug/accessibility_probe.gd)
  - Headless touch-target and visible-focus validation for the portrait HUD
