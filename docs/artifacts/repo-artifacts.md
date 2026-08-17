# Repo Artifacts

Partly historical: the Repository Homes and Clients sections below are current, but the script, scene, probe, and `.tres` card inventories catalogue the frozen Godot tree (ADR 0019) and the ADR index stops at 0002. Treat this as a map of where things sit, not as a description of what runs.

## Repository Homes

- [assets](../../assets)
  - Source art, audio, fonts, and UI media; see its README for the layout
- [resources](../../resources)
  - Frozen Godot `.tres` copies of the same content, kept as reference only (ADR 0019/0020). `data/` is authoritative
- [data](../../data)
  - The live content root: schema-validated JSON for cards, keywords, charge modifiers, boss programs, encounters, hazards, minions, decks, and Scenarios (ADR 0020)
- [notes](../../notes)
  - Working notes, research, and prototype screenshots

## Clients

- [web](../../web)
  - The Encounter Workbench, the live playable surface: a TypeScript encounter engine with a React HUD and a Phaser board (ADR 0019)

### Frozen

- [scenes/Main.tscn](../../scenes/Main.tscn)
  - The Godot prototype scene, frozen with the rest of the Godot codebase (ADR 0019)
  - Wired a top bar, hand, action bar, board, status panel, movement button, and phase controls. The web HUD has since replaced the persistent top bar and status panel with a Stat Panel opened by tapping a piece

## Domain and Decision Docs

- [CONTEXT.md](../../CONTEXT.md)
  - Domain glossary for encounter, timeline, slots, tempo, and other canonical terms
- [docs/adr/0001-encounter-round-and-enrage.md](../adr/0001-encounter-round-and-enrage.md)
  - Scripted two-window encounter structure
- [docs/adr/0002-use-a-persistent-action-bar-with-charge-stacks.md](../adr/0002-use-a-persistent-action-bar-with-charge-stacks.md)
  - Persistent action bar with charge stacks
- [docs/artifacts/project-coordination.md](project-coordination.md)
  - Cross-task source-of-truth map, confirmed handoffs, open questions, and milestone gate
- [docs/artifacts/deck-evaluation-measurement-plan.md](deck-evaluation-measurement-plan.md)
  - QA-facing plan for measuring deck viability and play-feel from Encounter Records, probes, and short human rubrics
- [docs/artifacts/deck-eval-notes](deck-eval-notes)
  - Human-scored deck-evaluation note template and future review notes

## Content Docs

- [docs/content/README.md](../content/README.md)
  - Content-docs index and directory purpose
- [docs/content/deck-evaluation-rubric.md](../content/deck-evaluation-rubric.md)
  - Design-facing scorecard for deck Viability and Play-feel in the current boss-raid prototype
- [docs/content/decks/elian-voss-starter.md](../content/decks/elian-voss-starter.md)
  - Current tank starter decklist and role notes
- [docs/content/encounters/embermaw-prototype.md](../content/encounters/embermaw-prototype.md)
  - Current prototype encounter spec
- [docs/content/boss-scripts/embermaw-script.md](../content/boss-scripts/embermaw-script.md)
  - Current Embermaw boss script loop and action notes
- [docs/artifacts/embermaw-vertical-slice.md](embermaw-vertical-slice.md)
  - Completed vertical-slice behavior, responsive-layout contract, visual skin, and verification commands
- [docs/artifacts/accessibility.md](accessibility.md)
  - Player HUD target-size, contrast-state, and keyboard-focus contract

## Visual Assets

- [assets/art/environment/0x72-dungeon-tileset-ii](../../assets/art/environment/0x72-dungeon-tileset-ii)
  - CC0 dungeon illustration from 0x72's `16x16 DungeonTileset II`
  - Used as a subdued arena and global background texture
  - Local source and license record: [LICENSES.md](../../assets/art/environment/0x72-dungeon-tileset-ii/LICENSES.md)

## Player Card Resources

Tank deck resources in [resources/cards/tank](../../resources/cards/tank):

- `anchor_presence.tres`
  - Slow presence-growth card. Deleted from `data/` by ADR 0022; the `.tres` survives only in the frozen tree
- `fortify.tres`
  - Slow armor spike
- `guard_stance.tres`
  - Quick armor basic
- `intercept.tres`
  - Quick armor plus minion hit
- `rallying_cry.tres`
  - Quick heal and energy gain. Energy was removed by ADR 0011
- `shield_slam.tres`
  - Quick boss hit
- `sweeping_blow.tres`
  - Quick minion hit
- `taunting_challenge.tres`
  - Quick armor plus boss ping
- `unyielding_step.tres`
  - Slow mixed defense and boss pressure

Legacy/general sample card resources in [resources/cards](../../resources/cards):

- `gather_strength.tres`
- `grow_presence.tres`
- `strike_hex.tres`

## Legacy Boss Action Resources

Historical pre-SDK Boss actions are isolated under [resources/legacy/boss_actions](../../resources/legacy/boss_actions). They are not designer-facing content and are not loaded by Encounters.

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

Encounter configuration in [resources/encounters](../../resources/encounters):

- `embermaw_prototype.tres`
  - encounter clock and authored enrage text for the current vertical slice

## Core Gameplay Scripts

- [scripts/Main.gd](../../scripts/Main.gd)
  - Main scene coordinator
  - Translates drag-drop interactions into `EncounterAction` records and renders engine projections
- [scripts/sdk/EncounterEngine.gd](../../scripts/sdk/EncounterEngine.gd)
  - Authoritative rules owner for the live scene and headless simulation
- [scripts/player/PlayerState.gd](../../scripts/player/PlayerState.gd)
  - Read-only Hero, Hand, and Action Bar projection for the UI
- [scripts/turns/TurnManager.gd](../../scripts/turns/TurnManager.gd)
  - Read-only phase and Round projection
- [scripts/encounter/EncounterState.gd](../../scripts/encounter/EncounterState.gd)
  - Read-only outcome and presentation log projection
- [scripts/encounter/EncounterData.gd](../../scripts/encounter/EncounterData.gd)
  - Authored encounter configuration schema
- [scripts/boss/BossState.gd](../../scripts/boss/BossState.gd)
  - Read-only Boss Timeline projection
- [scripts/boss/BossActionData.gd](../../scripts/boss/BossActionData.gd)
  - Boss action resource schema
- [scripts/cards/CardData.gd](../../scripts/cards/CardData.gd)
  - Designer-facing Card resource schema

## Board and Piece Scripts

- [scripts/hex/HexGrid.gd](../../scripts/hex/HexGrid.gd)
  - Hex board rendering, direct manipulation, telegraphs, and route previews over SDK board state
- [scripts/hex/HexTile.gd](../../scripts/hex/HexTile.gd)
  - Individual hex tile UI, coordinate display, and drag-drop tile target behavior
- [scripts/hex/HexPiece.gd](../../scripts/hex/HexPiece.gd)
  - Board token rendering, health, facing, and drag behavior
- [scripts/combat/Facing.gd](../../scripts/combat/Facing.gd)
  - Canonical hex-edge facing directions and normalization

## UI Scripts

- [scripts/ui/HandView.gd](../../scripts/ui/HandView.gd)
  - Hand row renderer
- [scripts/ui/CardButton.gd](../../scripts/ui/CardButton.gd)
  - Compact draggable card UI
- [scripts/ui/ActionBarView.gd](../../scripts/ui/ActionBarView.gd)
  - Action bar list renderer
- [scripts/ui/ActionBarSlot.gd](../../scripts/ui/ActionBarSlot.gd)
  - Drop-enabled slot UI
- [scripts/ui/CombatantPanel.gd](../../scripts/ui/CombatantPanel.gd)
  - Boss and player summary panels
- [scripts/ui/FacingBadge.gd](../../scripts/ui/FacingBadge.gd)
  - Facing indicator support UI

## Prototype Validation

- [docs/artifacts/probe-harness.md](probe-harness.md)
  - Stable headless Probe suite, runner, and Spike-to-Probe promotion rules
- [scripts/debug/run_probes.ps1](../../scripts/debug/run_probes.ps1)
  - One-command runner for the stable headless Probe suite

- [scripts/debug/layout_probe.gd](../../scripts/debug/layout_probe.gd)
  - Headless layout check for the authored `1280x720` responsive canvas
- [scripts/debug/mobile_hud_probe.gd](../../scripts/debug/mobile_hud_probe.gd)
  - Headless portrait HUD check for the `390x844` mobile layout
- [scripts/debug/accessibility_probe.gd](../../scripts/debug/accessibility_probe.gd)
  - Headless touch-target and visible-focus validation for the portrait HUD
