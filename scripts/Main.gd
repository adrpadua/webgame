extends Control

const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterRecordModel := preload("res://scripts/records/EncounterRecord.gd")

const CONTENT_CATALOG := preload("res://resources/content_catalog.tres")
const DUELYST_BACKDROP := preload("res://assets/art/open-duelyst/magaari_ember_highlands_background.jpg")
const MOBILE_SAFE_EDGE_PADDING := 12.0
const MOBILE_ACTION_CONTROL_PADDING := 8.0
const MOBILE_CONTROLS_ROW_HEIGHT := 48.0
const MOBILE_CONTROLS_ROW_WRAP_HEIGHT := 96.0
const MOBILE_CONTROL_ROW_GAP := 12.0
const MOBILE_BOARD_HEIGHT_RATIO := 0.42

@onready var player: Node = $PlayerState
@onready var boss: Node = $BossState
@onready var turn_manager: Node = $TurnManager
@onready var encounter: Node = $EncounterState
@onready var phase_label: Label = %PhaseLabel
@onready var player_panel: Node = %PlayerPanel
@onready var boss_panel: Node = %BossPanel
@onready var intent_label: Label = %IntentLabel
@onready var selected_label: Label = %SelectedLabel
@onready var tempo_label: Label = %TempoLabel
@onready var prepare_button: Button = %PrepareCard
@onready var charge_button: Button = %ChargeCard
@onready var activate_button: Button = %ActivateSlot
@onready var move_button: Button = %MoveButton
@onready var restart_button: Button = %RestartButton
@onready var show_coordinates_checkbox: CheckBox = %ShowCoordinates
@onready var hand_view: Node = %HandView
@onready var action_bar_view: Node = %ActionBarView
@onready var hex_grid: Node = %HexGrid
@onready var encounter_label: Label = %EncounterLabel
@onready var feedback_label: Label = %FeedbackLabel
@onready var action_guide_label: Label = %ActionGuideLabel
@onready var root_container: VBoxContainer = $Root
@onready var top_bar: HBoxContainer = $Root/TopBar
@onready var hand_title: Label = $Root/HandTitle
@onready var hand_scroll: ScrollContainer = $Root/HandScroll
@onready var main_area: BoxContainer = $Root/MainArea
@onready var left_panel: VBoxContainer = $Root/MainArea/LeftPanel
@onready var board_title: Label = $Root/MainArea/LeftPanel/BoardTitle
@onready var right_panel_scroll: ScrollContainer = $Root/MainArea/RightPanelScroll
@onready var mobile_status: Control = %MobileStatus
@onready var mobile_status_top: Control = $Root/MobileStatus/MobileStatusTop
@onready var mobile_round_label: Label = %MobileRoundLabel
@onready var mobile_tempo_label: Label = %MobileTempoLabel
@onready var mobile_end_phase_prompt: Label = %MobileEndPhasePrompt
@onready var mobile_turn_tracker: Label = %MobileTurnTracker
@onready var mobile_tempo_bar: Label = %MobileTempoBar
@onready var tile_info_pane: Panel = %TileInfoPane
@onready var tile_info_badge: Label = %TileInfoBadge
@onready var tile_info_name: Label = %TileInfoName
@onready var tile_info_subtitle: Label = %TileInfoSubtitle
@onready var tile_info_health: ProgressBar = %TileInfoHealth
@onready var tile_info_stats: Label = %TileInfoStats

var selected_card: Resource
var selected_tile: Node
var selected_piece: Node
var selected_slot_index: int = -1
var phase_transition_queued: bool = false
var player_move_primed: bool = false
var suppress_move_prime_once: bool = false
var mobile_continue_button: Button
var mobile_continue_tween: Tween
var mobile_help_button: Button
var mobile_prompt_lane: MarginContainer
var mobile_tutorial_prompt_lane: MarginContainer
var mobile_controls_row: Control
var mobile_help_pane: Panel
var mobile_help_label: Label
var mobile_tutorial_prompt_pane: Panel
var mobile_tutorial_prompt_label: Label
var mobile_tutorial_prompt_dismiss_button: Button
var mobile_tutorial_history_picker: OptionButton
var mobile_tutorial_reopen_button: Button
var mobile_status_effect_pane: Panel
var mobile_status_effect_label: Label
var mobile_prompt_layout_queued: bool = false
var mobile_controls_layout_queued: bool = false
var mobile_controls_wrapped: bool = false
var tutorial_prompt_presentation_state: Dictionary = {}
var tutorial_prompt_history: Array[Dictionary] = []
var tutorial_prompt_review_id: StringName = &""
var mobile_tutorial_prompt: Dictionary = {}
var engine
var encounter_record

func _ready() -> void:
	set_anchors_preset(Control.PRESET_TOP_LEFT)
	get_viewport().size_changed.connect(_fit_to_viewport)
	_build_mobile_prompt_lane()
	_build_mobile_continue_button()
	_build_mobile_help_controls()
	_build_mobile_tutorial_prompt_controls()
	_build_mobile_status_effect_pane()
	_raise_hud_above_board()
	_fit_to_viewport()
	_apply_skin()
	hand_view.bind(player)
	action_bar_view.bind(player)
	hand_view.card_selected.connect(_on_card_selected)
	hand_view.card_inspection_started.connect(_on_card_inspection_started)
	hand_view.card_inspection_ended.connect(_on_card_inspection_ended)
	hand_view.card_drag_started.connect(_on_hand_card_drag_started)
	hand_view.card_drag_ended.connect(_on_hand_card_drag_ended)
	%CardInspectOverlay.dismiss_requested.connect(_on_card_inspection_dismiss_requested)
	mobile_round_label.mouse_filter = Control.MOUSE_FILTER_STOP
	mobile_round_label.gui_input.connect(_on_mobile_round_input)
	mobile_continue_button.pressed.connect(_on_mobile_continue_pressed)
	mobile_help_button.pressed.connect(_on_mobile_help_pressed)
	mobile_tutorial_prompt_dismiss_button.pressed.connect(_on_mobile_tutorial_prompt_dismiss_pressed)
	mobile_tutorial_reopen_button.pressed.connect(_on_mobile_tutorial_reopen_pressed)
	action_bar_view.slot_pressed.connect(_on_slot_pressed)
	action_bar_view.card_dropped.connect(_on_card_dropped_to_slot)
	hex_grid.tile_selected.connect(_on_tile_selected)
	hex_grid.piece_selected.connect(_on_piece_selected)
	hex_grid.piece_dragged_to_tile.connect(_on_piece_dragged_to_tile)
	hex_grid.hand_card_dropped_to_tile.connect(_on_hand_card_dropped_to_tile)
	hex_grid.bind_combatants(player, boss)
	player.resources_changed.connect(_refresh_status)
	player.health_changed.connect(_refresh_status)
	player.facing_changed.connect(_refresh_status)
	player.action_bar_changed.connect(_refresh_status)
	boss.state_changed.connect(_refresh_status)
	boss.facing_changed.connect(_refresh_status)
	turn_manager.phase_changed.connect(func(_phase: StringName) -> void: _refresh_status())
	turn_manager.turn_changed.connect(func(_turn: int) -> void: _refresh_status())
	encounter.log_changed.connect(_refresh_status)
	encounter.state_changed.connect(_refresh_status)
	encounter.encounter_ended.connect(_on_encounter_ended)
	hex_grid.bind_combatants(player, boss)
	hex_grid.set_show_coordinates(show_coordinates_checkbox.button_pressed)
	_start_encounter()

func _fit_to_viewport() -> void:
	_apply_viewport_size(get_viewport_rect().size)

func _apply_viewport_size(viewport_size: Vector2) -> void:
	if viewport_size.x <= 0.0 or viewport_size.y <= 0.0:
		return
	position = Vector2.ZERO
	size = viewport_size
	if is_node_ready():
		_apply_responsive_layout()

func _apply_responsive_layout() -> void:
	var layout_size := size
	var mobile := layout_size.x < 820 or layout_size.x < layout_size.y
	main_area.vertical = mobile
	main_area.size_flags_vertical = Control.SIZE_SHRINK_CENTER if mobile else Control.SIZE_EXPAND_FILL
	top_bar.visible = not mobile
	mobile_status.visible = mobile
	mobile_status_top.visible = not mobile
	mobile_turn_tracker.visible = mobile
	mobile_tempo_bar.visible = false
	right_panel_scroll.visible = not mobile
	hand_title.visible = not mobile
	board_title.visible = not mobile
	root_container.add_theme_constant_override("separation", 6 if mobile else 8)
	hand_scroll.custom_minimum_size.y = 128.0 if mobile else 120.0
	hex_grid.custom_minimum_size = Vector2(0, clampf(layout_size.y * MOBILE_BOARD_HEIGHT_RATIO, 300.0, 430.0)) if mobile else Vector2(320, 260)
	left_panel.custom_minimum_size = Vector2.ZERO if mobile else Vector2(150, 0)
	left_panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER if mobile else Control.SIZE_EXPAND_FILL
	left_panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER if mobile else Control.SIZE_EXPAND_FILL
	hex_grid.size_flags_vertical = Control.SIZE_SHRINK_CENTER if mobile else Control.SIZE_EXPAND_FILL
	action_bar_view.set_compact(mobile)
	action_bar_view.custom_minimum_size.x = 0.0
	action_bar_view.size_flags_horizontal = Control.SIZE_SHRINK_CENTER if mobile else Control.SIZE_EXPAND_FILL
	if mobile:
		root_container.move_child(mobile_status, 0)
		main_area.move_child(hex_grid, 0)
		main_area.move_child(left_panel, 1)
		root_container.move_child(main_area, 1)
		root_container.move_child(hand_scroll, 2)
		root_container.move_child(mobile_turn_tracker, 3)
		root_container.move_child(top_bar, 4)
		root_container.move_child(hand_title, 5)
	else:
		root_container.move_child(top_bar, 0)
		root_container.move_child(hand_title, 1)
		root_container.move_child(hand_scroll, 2)
		root_container.move_child(main_area, 3)
		root_container.move_child(mobile_status, 4)
		root_container.move_child(mobile_turn_tracker, 5)
		main_area.move_child(left_panel, 0)
		main_area.move_child(hex_grid, 1)
		main_area.move_child(right_panel_scroll, 2)
	_layout_tile_info_pane()
	_refresh_status()

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.11, 0.11, 0.12), true)
	draw_texture_rect(DUELYST_BACKDROP, Rect2(Vector2.ZERO, size), false, Color(0.78, 0.90, 1.0, 0.14))
	draw_circle(Vector2(size.x * 0.72, size.y * 0.24), min(size.x, size.y) * 0.22, Color(0.35, 0.14, 0.10, 0.22))
	draw_circle(Vector2(size.x * 0.28, size.y * 0.58), min(size.x, size.y) * 0.18, Color(0.08, 0.22, 0.28, 0.18))
	draw_rect(Rect2(0.0, size.y * 0.74, size.x, size.y * 0.26), Color(0.08, 0.07, 0.06, 0.48), true)

func _refresh_status() -> void:
	phase_label.text = "Round %d/%d - %s" % [turn_manager.turn_number, encounter.round_limit, turn_manager.get_phase_name()]
	encounter_label.text = "%s  |  %s" % [
		"Encounter active" if encounter.active else encounter.outcome.capitalize(),
		encounter.reason if not encounter.reason.is_empty() else "Defeat Embermaw before enrage.",
	]
	player_panel.update_display(
		"Player",
		player.hero_name,
		player.health,
		player.max_health,
		player.armor,
		"HP %d/%d   Armor %d\nHand %d  Deck %d  Discard %d\nRefill target %d  Presence %d" % [
			player.health,
			player.max_health,
			player.armor,
			player.hand.size(),
			player.deck.size(),
			player.discard.size(),
			player.max_hand_size,
			player.presence,
		],
		player.facing,
		Color(0.24, 0.72, 0.85)
	)
	boss_panel.update_display(
		"Boss",
		boss.boss_name,
		boss.health,
		boss.max_health,
		0,
		"HP %d/%d\nInstant %s\nIncoming %s" % [
			boss.health,
			boss.max_health,
			boss.get_instant_title(),
			boss.get_incoming_title(),
		],
		boss.facing,
		Color(0.92, 0.38, 0.31)
	)
	intent_label.text = "%s\n\n%s\n\nLast: %s" % [boss.get_track_text(&"instant"), boss.get_track_text(&"incoming"), boss.last_action_text]
	tempo_label.text = "Step: %s\nHand: %d / %d\nFacing: %s" % [player.current_window.capitalize(), player.hand.size(), player.max_hand_size, player.get_facing_name()]
	var card_text: String = selected_card.get("title") if selected_card != null else "none"
	var tile_text: String = str(selected_tile.axial) if selected_tile != null else "none"
	var piece_text: String = selected_piece.display_name if selected_piece != null else "none"
	var slot_text := str(selected_slot_index + 1) if selected_slot_index >= 0 else "none"
	selected_label.text = "Selected card: %s\nSelected slot: %s\nSelected hex: %s\nSelected piece: %s" % [card_text, slot_text, tile_text, piece_text]
	action_guide_label.text = _get_action_guide_text()
	mobile_round_label.text = _get_mobile_round_track()
	mobile_tempo_label.text = _get_mobile_hand_track()
	mobile_turn_tracker.text = _get_mobile_round_track()
	mobile_tempo_bar.text = _get_mobile_hand_track()
	mobile_tempo_label.tooltip_text = "Hand cards power charging and pay for movement. Refill to %d at round end." % player.max_hand_size
	mobile_tempo_bar.tooltip_text = mobile_tempo_label.tooltip_text
	mobile_turn_tracker.tooltip_text = "Cards in hand, discard pile, current window, and round progress. Tap to continue when prompted."
	var mobile_prompt_text := _get_mobile_prompt_text()
	mobile_end_phase_prompt.text = mobile_prompt_text
	mobile_end_phase_prompt.visible = not mobile_prompt_text.is_empty()
	_layout_mobile_prompt()
	_update_mobile_tutorial_prompt()
	_update_mobile_status_effect_pane()
	_update_mobile_continue_button()
	_update_mobile_help_controls()
	mobile_round_label.tooltip_text = "Round %d of %d: %s. %s" % [
		turn_manager.turn_number,
		encounter.round_limit,
		turn_manager.get_phase_name(),
		"Tap to end this window." if encounter.active and _should_show_end_phase_prompt() else "Tap to restart." if not encounter.active else "Current phase.",
	]
	action_bar_view.set_selected_slot(selected_slot_index)
	_refresh_card_destination_context()
	prepare_button.visible = false
	charge_button.visible = false
	activate_button.visible = false
	move_button.visible = false
	%AdvancePhase.disabled = not encounter.active
	restart_button.visible = not encounter.active
	_refresh_tile_info_pane()
	hex_grid.set_movement_preview_enabled(_has_legal_basic_move())
	_queue_automatic_phase_transition()

func _on_card_selected(card: Resource) -> void:
	selected_card = card
	_refresh_status()

func _on_hand_card_drag_started(card: Resource) -> void:
	if not encounter.active or not player.hand.has(card):
		return
	selected_card = card
	_refresh_card_destination_context()

func _on_hand_card_drag_ended(card: Resource) -> void:
	if selected_card == card:
		selected_card = null
	_refresh_card_destination_context()

func _on_card_inspection_started(card: Resource) -> void:
	%CardInspectOverlay.show_card(card)

func _on_card_inspection_ended(_card: Resource) -> void:
	%CardInspectOverlay.hide_card()

func _on_card_inspection_dismiss_requested() -> void:
	%CardInspectOverlay.hide_card()

func _refresh_card_destination_context() -> void:
	var has_current_card: bool = encounter.active and selected_card != null and player.hand.has(selected_card)
	hand_view.set_selected_card(selected_card if has_current_card else null)
	action_bar_view.set_card_context(selected_card if has_current_card and player.current_window in [&"loadout", &"quick", &"slow"] else null)
	hex_grid.set_hand_card_move_context(selected_card if has_current_card and player.current_window == &"quick" else null)

func _can_project_card_to_slot(index: int, card: Resource) -> bool:
	return player.can_project_card(index, card)

func _on_slot_pressed(index: int) -> void:
	selected_slot_index = index
	var slot: Dictionary = player.get_slot(index)
	var top_card: Resource = slot.get("top_card")
	if encounter.active and selected_card != null and player.hand.has(selected_card) and _can_project_card_to_slot(index, selected_card):
		_on_card_dropped_to_slot(index, selected_card)
		return
	if top_card != null and encounter.active:
		_on_activate_slot_pressed()
		return
	if top_card == null:
		_set_feedback("Drag a hand card onto this slot.")
	_refresh_status()

func _on_card_dropped_to_slot(index: int, card: Resource) -> void:
	if not encounter.active:
		_set_feedback("Restart the encounter to use cards.")
		return
	selected_slot_index = index
	selected_card = card
	var slot: Dictionary = player.get_slot(index)
	var top_card: Resource = slot.get("top_card")
	var load_action = EncounterActionModel.load_slot(engine.primary_hero_id, index, card)
	var action = load_action if top_card == null or engine.legality(load_action)["legal"] else EncounterActionModel.charge_slot(engine.primary_hero_id, index, card)
	var resolved = engine.apply(action)
	_sync_from_engine()
	if resolved.succeeded:
		selected_card = null
	else:
		_set_feedback(resolved.reason)
	_refresh_status()

func _on_tile_selected(tile: Node) -> void:
	if encounter.active and selected_card != null and player.hand.has(selected_card) and engine.legality(EncounterActionModel.move_hero(engine.primary_hero_id, tile.axial, selected_card))["legal"]:
		_on_hand_card_dropped_to_tile(selected_card, tile)
		return
	selected_tile = tile
	selected_piece = tile.pieces[0] if not tile.pieces.is_empty() else null
	player_move_primed = false
	_refresh_move_previews()
	_refresh_status()

func _on_mobile_round_input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton or event is InputEventScreenTouch):
		return
	if event.pressed:
		return
	if encounter.active:
		_on_advance_phase_pressed()
	else:
		_on_restart_pressed()

func _on_mobile_continue_pressed() -> void:
	if encounter.active:
		_on_advance_phase_pressed()

func _on_piece_selected(piece: Node) -> void:
	selected_piece = piece
	var tile: Node = hex_grid.get_piece_tile(piece)
	if tile != null:
		selected_tile = tile
	if suppress_move_prime_once:
		suppress_move_prime_once = false
		player_move_primed = false
	else:
		player_move_primed = false
	_refresh_move_previews()
	_refresh_status()

func _on_piece_dragged_to_tile(piece: Node, tile: Node) -> void:
	selected_tile = tile
	selected_piece = piece
	_set_feedback("Drag a hand card directly to an adjacent empty hex to spend it for movement.")
	_refresh_status()

func _on_hand_card_dropped_to_tile(card: Resource, tile: Node) -> void:
	if not encounter.active:
		_set_feedback("Restart the encounter to move.")
		return
	_move_player_to_tile(tile, card)

func _on_prepare_card_pressed() -> void:
	if not encounter.active or selected_card == null or selected_slot_index < 0:
		_set_feedback("Select a hand card and action-bar slot first.")
		return
	var resolved = engine.apply(EncounterActionModel.load_slot(engine.primary_hero_id, selected_slot_index, selected_card))
	_sync_from_engine()
	if resolved.succeeded:
		selected_card = null
	else:
		_set_feedback("That card can only replace this slot during the Loadout Step.")
	_refresh_status()

func _on_charge_card_pressed() -> void:
	if not encounter.active or selected_card == null or selected_slot_index < 0:
		_set_feedback("Select a hand card and action-bar slot first.")
		return
	var resolved = engine.apply(EncounterActionModel.charge_slot(engine.primary_hero_id, selected_slot_index, selected_card))
	_sync_from_engine()
	if resolved.succeeded:
		selected_card = null
	else:
		_set_feedback("The selected slot cannot take another charge.")
	_refresh_status()

func _on_activate_slot_pressed() -> void:
	if not encounter.active or selected_slot_index < 0:
		_set_feedback("Select an action-bar slot first.")
		return
	var slot: Dictionary = player.get_slot(selected_slot_index)
	var top_card: Resource = slot.get("top_card")
	if top_card == null:
		_set_feedback("That action-bar slot is empty.")
		return
	var target_id: StringName = selected_piece.piece_id if selected_piece != null and top_card.target_type == CardData.TargetType.PIECE else &""
	var resolved = engine.apply(EncounterActionModel.fire_slot(engine.primary_hero_id, selected_slot_index, target_id))
	_sync_from_engine()
	if not resolved.succeeded:
		_set_feedback(resolved.reason)
		return
	_set_status_payoff_feedback()
	_check_encounter_end()
	_refresh_status()

func _on_move_button_pressed() -> void:
	if not _can_basic_move():
		_set_feedback("Drag a hand card directly to an adjacent empty hex to move.")
		return
	_set_feedback("Drag a hand card directly to the selected hex to spend it for movement.")

func _on_advance_phase_pressed() -> void:
	if not encounter.active:
		return
	engine.advance_phase()
	_sync_from_engine()
	if _check_encounter_end():
		return
	selected_card = null
	selected_slot_index = -1
	player_move_primed = false
	_refresh_move_previews()
	_refresh_status()

func _on_restart_pressed() -> void:
	_start_encounter()

func _start_encounter() -> void:
	if encounter_record != null and encounter_record.is_active() and engine != null:
		encounter_record.seal(engine, &"abandoned", "Restarted by player.")
	var encounter_data: Resource = CONTENT_CATALOG.default_encounter
	engine = EncounterEngineModel.new()
	engine.start(encounter_data)
	encounter_record = EncounterRecordModel.new()
	encounter_record.begin(engine, encounter_data)
	player.bind_engine(engine, engine.primary_hero_id)
	boss.bind_engine(engine)
	turn_manager.bind_engine(engine)
	encounter.bind_engine(engine)
	hex_grid.sync_from_engine(engine)
	selected_card = null
	selected_tile = null
	selected_piece = null
	selected_slot_index = -1
	tutorial_prompt_presentation_state.clear()
	tutorial_prompt_history.clear()
	tutorial_prompt_review_id = &""
	mobile_tutorial_prompt = {}
	player_move_primed = false
	_refresh_move_previews()
	_set_feedback("Loadout: arrange Top Cards, then continue to the Boss Instant.")
	_refresh_status()

func _on_encounter_ended(outcome: StringName, reason: String) -> void:
	_set_feedback("%s: %s" % [outcome.capitalize(), reason])

func _check_encounter_end() -> bool:
	_sync_from_engine()
	return not engine.active

func _set_feedback(text: String) -> void:
	feedback_label.text = text

func _move_player_to_tile(tile: Node, stamina_card: Resource) -> bool:
	if tile == null:
		return false
	var resolved = engine.apply(EncounterActionModel.move_hero(engine.primary_hero_id, tile.axial, stamina_card))
	if not resolved.succeeded:
		_set_feedback(resolved.reason)
		return false
	_sync_from_engine()
	selected_tile = tile
	selected_piece = hex_grid.player_piece
	player_move_primed = false
	suppress_move_prime_once = true
	_refresh_move_previews()
	_refresh_status()
	return true

func _sync_from_engine() -> void:
	if engine == null:
		return
	player.sync_from_engine()
	boss.sync_from_engine()
	turn_manager.sync_from_engine()
	encounter.sync_from_engine()
	hex_grid.sync_from_engine(engine)
	if encounter_record != null:
		encounter_record.sync(engine)
		if not engine.active:
			encounter_record.seal(engine)

func abort_encounter(reason: String = "Aborted by player.") -> void:
	if encounter_record != null and encounter_record.is_active() and engine != null:
		encounter_record.seal(engine, &"abandoned", reason)

func _exit_tree() -> void:
	abort_encounter("Application closed before the Encounter ended.")

func _refresh_move_previews() -> void:
	if hex_grid == null or hex_grid.tiles.is_empty():
		return
	for tile in hex_grid.tiles.values():
		hex_grid.refresh_tile_outline(tile)
	if not player_move_primed:
		return
	for tile in hex_grid.tiles.values():
		if _can_basic_move_to(tile):
			tile.set_outline_color(Color(0.96, 0.72, 0.22))

func _refresh_tile_info_pane() -> void:
	tile_info_pane.visible = selected_tile != null
	if selected_tile == null:
		return
	_layout_tile_info_pane()
	var piece: Node = selected_piece
	if piece == null and not selected_tile.pieces.is_empty():
		piece = selected_tile.pieces[0]
	if piece != null:
		_show_piece_tile_info(selected_tile, piece)
	else:
		_show_empty_tile_info(selected_tile)

func _show_piece_tile_info(tile: Node, piece: Node) -> void:
	var owner: StringName = piece.get("piece_owner")
	_apply_tile_info_palette(owner)
	tile_info_badge.text = _piece_badge(owner)
	tile_info_name.text = piece.display_name
	tile_info_subtitle.text = "%s unit  |  Hex %d,%d" % [String(owner).capitalize(), tile.axial.x, tile.axial.y]
	tile_info_health.visible = true
	tile_info_health.max_value = max(1, piece.max_health)
	tile_info_health.value = clamp(piece.health, 0, piece.max_health)
	tile_info_stats.text = "%s %d/%d   %s %d   %s %s\n%s %s" % [
		"♥",
		piece.health,
		piece.max_health,
		"⚔",
		piece.attack,
		"↗",
		piece.get_facing_name(),
		"Terrain",
		_tile_state_text(tile),
	]

func _show_empty_tile_info(tile: Node) -> void:
	_apply_tile_info_palette(&"tile")
	tile_info_badge.text = _tile_badge(tile)
	tile_info_name.text = "Hex %d,%d" % [tile.axial.x, tile.axial.y]
	tile_info_subtitle.text = _tile_state_text(tile)
	tile_info_health.visible = false
	tile_info_stats.text = "%s %s\n%s" % [
		"Range",
		hex_grid.hex_distance(hex_grid.get_piece_coords(hex_grid.player_piece), tile.axial) if hex_grid.player_piece != null else "-",
		"Drag here to move." if _can_basic_move_to(tile) else "No unit on this tile.",
	]

func _layout_tile_info_pane() -> void:
	if tile_info_pane == null:
		return
	var mobile: bool = size.x < 820 or size.x < size.y
	var pane_size: Vector2 = Vector2(minf(size.x - 36.0, 354.0), 104.0) if mobile else Vector2(320.0, 128.0)
	tile_info_pane.size = pane_size
	tile_info_pane.custom_minimum_size = pane_size
	if mobile:
		var top_anchor: float = mobile_status.global_position.y + mobile_status.size.y + 6.0 if mobile_status != null else 48.0
		tile_info_pane.position = Vector2(18.0, clampf(top_anchor, 40.0, size.y - tile_info_pane.size.y - 10.0))
	else:
		tile_info_pane.position = Vector2(size.x - pane_size.x - 18.0, size.y - pane_size.y - 18.0)

func _piece_badge(owner: StringName) -> String:
	match owner:
		&"player":
			return "🛡"
		&"boss":
			return "☄"
		_:
			return "⚔"

func _tile_badge(tile: Node) -> String:
	if tile.terrain_id == &"scorched":
		return "🔥"
	if tile.telegraph_id != &"":
		return "!"
	return "◇"

func _tile_state_text(tile: Node) -> String:
	var states: Array[String] = []
	if tile.terrain_id != &"":
		states.append(String(tile.terrain_id).capitalize())
	if tile.telegraph_id != &"":
		states.append("Threat: %s" % String(tile.telegraph_id).capitalize())
	if states.is_empty():
		return "Clear"
	return "  |  ".join(states)

func _apply_tile_info_palette(owner: StringName) -> void:
	var fill := Color(0.05, 0.08, 0.10, 0.99)
	var border := Color(0.35, 0.58, 0.66, 0.92)
	var badge_fill := Color(0.16, 0.23, 0.27)
	var badge_border := Color(0.54, 0.74, 0.80)
	var health_fill := Color(0.30, 0.72, 0.82)
	var subtitle := Color(0.70, 0.78, 0.82)
	match owner:
		&"boss", &"enemy":
			fill = Color(0.13, 0.07, 0.055, 0.99)
			border = Color(0.94, 0.42, 0.26, 0.96)
			badge_fill = Color(0.27, 0.10, 0.08)
			badge_border = Color(1.0, 0.56, 0.36)
			health_fill = Color(0.95, 0.30, 0.20)
			subtitle = Color(0.95, 0.68, 0.56)
		&"tile":
			fill = Color(0.08, 0.085, 0.075, 0.99)
			border = Color(0.62, 0.55, 0.38, 0.92)
			badge_fill = Color(0.18, 0.17, 0.13)
			badge_border = Color(0.78, 0.68, 0.40)
			health_fill = Color(0.78, 0.68, 0.40)
			subtitle = Color(0.82, 0.76, 0.60)
	tile_info_pane.add_theme_stylebox_override("panel", _make_info_pane_style(fill, border))
	tile_info_badge.add_theme_stylebox_override("normal", _make_badge_style(badge_fill, badge_border))
	tile_info_subtitle.add_theme_color_override("font_color", subtitle)
	tile_info_health.add_theme_stylebox_override("fill", _make_progress_style(health_fill, health_fill))

func _on_show_coordinates_toggled(pressed: bool) -> void:
	hex_grid.set_show_coordinates(pressed)

func _queue_automatic_phase_transition() -> void:
	if phase_transition_queued or not encounter.active or not _should_advance_phase_automatically():
		return
	phase_transition_queued = true
	call_deferred("_advance_automatic_phase")

func _advance_automatic_phase() -> void:
	phase_transition_queued = false
	if encounter.active and _should_advance_phase_automatically():
		_on_advance_phase_pressed()

func _should_advance_phase_automatically() -> bool:
	if turn_manager.phase == turn_manager.Phase.INSTANT or turn_manager.phase == turn_manager.Phase.INCOMING:
		return true
	return false

func _should_show_end_phase_prompt() -> bool:
	if not encounter.active:
		return false
	if turn_manager.phase != turn_manager.Phase.QUICK and turn_manager.phase != turn_manager.Phase.SLOW:
		return false
	return not _has_player_window_action()

func _build_mobile_continue_button() -> void:
	mobile_controls_row = Control.new()
	mobile_controls_row.name = "MobileControlsRow"
	mobile_controls_row.visible = false
	mobile_controls_row.custom_minimum_size = Vector2(0, MOBILE_CONTROLS_ROW_HEIGHT)
	mobile_controls_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	mobile_controls_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mobile_status.add_child(mobile_controls_row)

	mobile_continue_button = Button.new()
	mobile_continue_button.name = "MobileContinueButton"
	mobile_continue_button.text = "Play"
	mobile_continue_button.visible = false
	mobile_continue_button.custom_minimum_size = Vector2(74, 48)
	mobile_continue_button.mouse_filter = Control.MOUSE_FILTER_STOP
	mobile_continue_button.tooltip_text = "Play: advance to the next window."
	mobile_controls_row.add_child(mobile_continue_button)

func _build_mobile_help_controls() -> void:
	mobile_help_button = Button.new()
	mobile_help_button.name = "MobileHelpButton"
	mobile_help_button.text = "?"
	mobile_help_button.visible = false
	mobile_help_button.custom_minimum_size = Vector2(48, 48)
	mobile_help_button.mouse_filter = Control.MOUSE_FILTER_STOP
	mobile_help_button.tooltip_text = "Help: show guide."
	mobile_controls_row.add_child(mobile_help_button)

	mobile_help_pane = Panel.new()
	mobile_help_pane.name = "MobileHelpPane"
	mobile_help_pane.visible = false
	mobile_help_pane.mouse_filter = Control.MOUSE_FILTER_STOP
	mobile_help_pane.custom_minimum_size = Vector2(0, 164)
	mobile_help_pane.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	mobile_status.add_child(mobile_help_pane)
	mobile_status.move_child(mobile_help_pane, mobile_controls_row.get_index())

	mobile_help_label = Label.new()
	mobile_help_label.name = "MobileHelpLabel"
	mobile_help_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	mobile_help_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	mobile_help_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	mobile_help_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mobile_help_label.offset_left = 12.0
	mobile_help_label.offset_top = 10.0
	mobile_help_label.offset_right = -12.0
	mobile_help_label.offset_bottom = -10.0
	mobile_help_label.add_theme_font_size_override("font_size", 10)
	mobile_help_label.add_theme_color_override("font_color", Color(0.98, 0.91, 0.74))
	mobile_help_pane.add_child(mobile_help_label)

	mobile_tutorial_history_picker = OptionButton.new()
	mobile_tutorial_history_picker.name = "MobileTutorialHistoryPicker"
	mobile_tutorial_history_picker.visible = false
	mobile_tutorial_history_picker.mouse_filter = Control.MOUSE_FILTER_STOP
	mobile_tutorial_history_picker.tooltip_text = "Tutorial history: choose shown guidance to review."
	mobile_help_pane.add_child(mobile_tutorial_history_picker)

	mobile_tutorial_reopen_button = Button.new()
	mobile_tutorial_reopen_button.name = "MobileTutorialReopenButton"
	mobile_tutorial_reopen_button.text = "Review"
	mobile_tutorial_reopen_button.visible = false
	mobile_tutorial_reopen_button.custom_minimum_size = Vector2(74, 48)
	mobile_tutorial_reopen_button.mouse_filter = Control.MOUSE_FILTER_STOP
	mobile_tutorial_reopen_button.tooltip_text = "Review the selected tutorial tip."
	mobile_help_pane.add_child(mobile_tutorial_reopen_button)

func _build_mobile_tutorial_prompt_controls() -> void:
	mobile_tutorial_prompt_lane = MarginContainer.new()
	mobile_tutorial_prompt_lane.name = "MobileTutorialPromptLane"
	mobile_tutorial_prompt_lane.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	mobile_tutorial_prompt_lane.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mobile_status.add_child(mobile_tutorial_prompt_lane)
	var prompt_index: int = mobile_prompt_lane.get_index() if mobile_prompt_lane != null else mobile_end_phase_prompt.get_index()
	mobile_status.move_child(mobile_tutorial_prompt_lane, prompt_index + 1)

	mobile_tutorial_prompt_pane = Panel.new()
	mobile_tutorial_prompt_pane.name = "MobileTutorialPromptPane"
	mobile_tutorial_prompt_pane.visible = false
	mobile_tutorial_prompt_pane.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mobile_tutorial_prompt_pane.custom_minimum_size = Vector2(0, 58)
	mobile_tutorial_prompt_pane.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	mobile_tutorial_prompt_lane.add_child(mobile_tutorial_prompt_pane)

	mobile_tutorial_prompt_label = Label.new()
	mobile_tutorial_prompt_label.name = "MobileTutorialPromptLabel"
	mobile_tutorial_prompt_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	mobile_tutorial_prompt_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	mobile_tutorial_prompt_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	mobile_tutorial_prompt_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mobile_tutorial_prompt_label.offset_left = 12.0
	mobile_tutorial_prompt_label.offset_top = 6.0
	mobile_tutorial_prompt_label.offset_right = -66.0
	mobile_tutorial_prompt_label.offset_bottom = -6.0
	mobile_tutorial_prompt_pane.add_child(mobile_tutorial_prompt_label)

	mobile_tutorial_prompt_dismiss_button = Button.new()
	mobile_tutorial_prompt_dismiss_button.name = "MobileTutorialPromptDismissButton"
	mobile_tutorial_prompt_dismiss_button.text = "Dismiss"
	mobile_tutorial_prompt_dismiss_button.custom_minimum_size = Vector2(54, 48)
	mobile_tutorial_prompt_dismiss_button.mouse_filter = Control.MOUSE_FILTER_STOP
	mobile_tutorial_prompt_dismiss_button.tooltip_text = "Dismiss this non-blocking tutorial tip."
	mobile_tutorial_prompt_dismiss_button.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	mobile_tutorial_prompt_dismiss_button.offset_left = -66.0
	mobile_tutorial_prompt_dismiss_button.offset_top = 5.0
	mobile_tutorial_prompt_dismiss_button.offset_right = -12.0
	mobile_tutorial_prompt_dismiss_button.offset_bottom = 53.0
	mobile_tutorial_prompt_pane.add_child(mobile_tutorial_prompt_dismiss_button)

func _build_mobile_prompt_lane() -> void:
	mobile_prompt_lane = MarginContainer.new()
	mobile_prompt_lane.name = "MobilePromptLane"
	mobile_prompt_lane.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	mobile_prompt_lane.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var prompt_index: int = mobile_end_phase_prompt.get_index()
	mobile_status.remove_child(mobile_end_phase_prompt)
	mobile_prompt_lane.add_child(mobile_end_phase_prompt)
	mobile_status.add_child(mobile_prompt_lane)
	mobile_status.move_child(mobile_prompt_lane, prompt_index)
	mobile_end_phase_prompt.size_flags_horizontal = Control.SIZE_EXPAND_FILL

func _build_mobile_status_effect_pane() -> void:
	mobile_status_effect_pane = Panel.new()
	mobile_status_effect_pane.name = "MobileStatusEffectPane"
	mobile_status_effect_pane.visible = false
	mobile_status_effect_pane.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mobile_status_effect_pane.custom_minimum_size = Vector2(0, 58)
	mobile_status_effect_pane.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	mobile_status.add_child(mobile_status_effect_pane)
	var prompt_host_index: int = mobile_prompt_lane.get_index() if mobile_prompt_lane != null else mobile_end_phase_prompt.get_index()
	mobile_status.move_child(mobile_status_effect_pane, prompt_host_index + 1)

	mobile_status_effect_label = Label.new()
	mobile_status_effect_label.name = "MobileStatusEffectLabel"
	mobile_status_effect_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	mobile_status_effect_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	mobile_status_effect_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	mobile_status_effect_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mobile_status_effect_label.offset_left = 12.0
	mobile_status_effect_label.offset_top = 6.0
	mobile_status_effect_label.offset_right = -12.0
	mobile_status_effect_label.offset_bottom = -6.0
	mobile_status_effect_pane.add_child(mobile_status_effect_label)

func _on_mobile_help_pressed() -> void:
	mobile_help_pane.visible = not mobile_help_pane.visible
	mobile_help_button.tooltip_text = "Hide guide." if mobile_help_pane.visible else "Show guide."
	_update_mobile_help_controls()

func _update_mobile_help_controls() -> void:
	if mobile_help_button == null or mobile_help_pane == null or mobile_help_label == null:
		return
	var mobile: bool = size.x < 820 or size.x < size.y
	mobile_controls_row.visible = mobile
	mobile_help_button.visible = mobile
	mobile_help_label.text = _get_mobile_help_text()
	_update_mobile_tutorial_history_controls()
	if not mobile:
		mobile_help_pane.visible = false
		return
	_layout_mobile_help_controls()

func _update_mobile_tutorial_prompt() -> void:
	if mobile_tutorial_prompt_pane == null or mobile_tutorial_prompt_label == null or engine == null:
		return
	var mobile: bool = size.x < 820 or size.x < size.y
	var projection: Dictionary = engine.get_tutorial_prompt_projection(tutorial_prompt_presentation_state)
	var prompt: Dictionary = {}
	if tutorial_prompt_review_id != &"":
		prompt = _tutorial_history_entry(tutorial_prompt_review_id)
	else:
		var current_id: StringName = projection.get("current_prompt_id", &"")
		prompt = _tutorial_projection_prompt(projection, current_id)
		if not prompt.is_empty():
			_record_tutorial_prompt_history(prompt)
	mobile_tutorial_prompt = prompt
	mobile_tutorial_prompt_pane.visible = mobile and not prompt.is_empty()
	if prompt.is_empty():
		return
	var accessible: Dictionary = prompt.get("accessible_full_text", {})
	var title: String = String(accessible.get("title", "Tutorial"))
	var full_text: String = String(accessible.get("text", ""))
	mobile_tutorial_prompt_label.text = "%s\n%s" % [title, _tutorial_prompt_summary(prompt.get("id", &""))]
	mobile_tutorial_prompt_label.tooltip_text = "%s: %s" % [title, full_text]
	mobile_tutorial_prompt_pane.tooltip_text = mobile_tutorial_prompt_label.tooltip_text
	mobile_tutorial_prompt_dismiss_button.text = "Close" if tutorial_prompt_review_id != &"" else "Dismiss"
	mobile_tutorial_prompt_dismiss_button.tooltip_text = "Close this reviewed tutorial tip." if tutorial_prompt_review_id != &"" else "Dismiss this non-blocking tutorial tip."
	_layout_mobile_tutorial_prompt()

func _tutorial_projection_prompt(projection: Dictionary, prompt_id: StringName) -> Dictionary:
	if prompt_id == &"":
		return {}
	for prompt in projection.get("prompts", []):
		if prompt.get("id", &"") == prompt_id:
			return prompt
	return {}

func _tutorial_prompt_summary(prompt_id: StringName) -> String:
	match prompt_id:
		&"boss_timeline":
			return "See the Boss's now and next moments."
		&"guarded_front":
			return "Hold directly in front of the Boss."
		&"charge_a_slot":
			return "Stack a hand card beneath a prepared Slot."
		&"iron_guard_armor":
			return "Armor blocks a Tank Hit before Health."
		&"riposte_ready":
			return "A perfectly blocked hit strengthens Shield Slam."
		&"slow_fortify":
			return "Fortify before the next problem arrives."
		&"whelp_pressure":
			return "Clear a Whelp blocking the Party's safe route."
		_:
			return "Read the full tip in Help."

func _record_tutorial_prompt_history(prompt: Dictionary) -> void:
	var prompt_id: StringName = prompt.get("id", &"")
	if prompt_id == &"" or not _tutorial_history_entry(prompt_id).is_empty():
		return
	tutorial_prompt_history.append({
		"id": prompt_id,
		"priority": prompt.get("priority", 0),
		"anchor": prompt.get("anchor", &""),
		"accessible_full_text": prompt.get("accessible_full_text", {}),
	})

func _tutorial_history_entry(prompt_id: StringName) -> Dictionary:
	for prompt in tutorial_prompt_history:
		if prompt.get("id", &"") == prompt_id:
			return prompt
	return {}

func _on_mobile_tutorial_prompt_dismiss_pressed() -> void:
	var prompt_id: StringName = mobile_tutorial_prompt.get("id", &"")
	if tutorial_prompt_review_id != &"":
		tutorial_prompt_review_id = &""
	elif prompt_id != &"":
		tutorial_prompt_presentation_state[prompt_id] = {"dismissed": true}
	_refresh_status()

func _update_mobile_tutorial_history_controls() -> void:
	if mobile_tutorial_history_picker == null or mobile_tutorial_reopen_button == null:
		return
	var show_history: bool = mobile_help_pane.visible and not tutorial_prompt_history.is_empty()
	mobile_tutorial_history_picker.visible = show_history
	mobile_tutorial_reopen_button.visible = show_history
	if not show_history:
		return
	var selected_id: int = mobile_tutorial_history_picker.selected
	mobile_tutorial_history_picker.clear()
	for prompt in tutorial_prompt_history:
		var accessible: Dictionary = prompt.get("accessible_full_text", {})
		mobile_tutorial_history_picker.add_item(String(accessible.get("title", "Tutorial")))
	if selected_id >= 0 and selected_id < mobile_tutorial_history_picker.item_count:
		mobile_tutorial_history_picker.select(selected_id)
	else:
		mobile_tutorial_history_picker.select(mobile_tutorial_history_picker.item_count - 1)

func _on_mobile_tutorial_reopen_pressed() -> void:
	if mobile_tutorial_history_picker == null or mobile_tutorial_history_picker.selected < 0 or mobile_tutorial_history_picker.selected >= tutorial_prompt_history.size():
		return
	tutorial_prompt_review_id = tutorial_prompt_history[mobile_tutorial_history_picker.selected].get("id", &"")
	mobile_help_pane.visible = false
	mobile_help_button.tooltip_text = "Show guide."
	_refresh_status()

func _get_mobile_help_text() -> String:
	var guide: String = _get_action_guide_text()
	if tutorial_prompt_history.is_empty():
		return guide
	var titles: Array[String] = []
	for prompt in tutorial_prompt_history:
		var accessible: Dictionary = prompt.get("accessible_full_text", {})
		titles.append("• %s" % String(accessible.get("title", "Tutorial")))
	return "%s\n\nTutorial history (choose a tip to review):\n%s" % [guide, "\n".join(titles)]

func _update_mobile_status_effect_pane() -> void:
	if mobile_status_effect_pane == null or mobile_status_effect_label == null:
		return
	var status_text := _get_riposte_ready_status_text()
	var mobile: bool = size.x < 820 or size.x < size.y
	mobile_status_effect_pane.visible = mobile and not status_text.is_empty()
	mobile_status_effect_label.text = status_text
	mobile_status_effect_label.tooltip_text = _get_riposte_ready_tooltip()
	if mobile_status_effect_pane.visible:
		_layout_mobile_status_effect_pane()

func _layout_mobile_status_effect_pane() -> void:
	var viewport_inset: float = _get_mobile_safe_inset()
	mobile_status_effect_label.offset_left = viewport_inset
	mobile_status_effect_label.offset_right = -viewport_inset

func _layout_mobile_prompt() -> void:
	if mobile_end_phase_prompt == null or mobile_prompt_lane == null:
		return
	var mobile: bool = size.x < 820 or size.x < size.y
	if not mobile:
		mobile_prompt_lane.add_theme_constant_override("margin_left", 0)
		mobile_prompt_lane.add_theme_constant_override("margin_right", 0)
		mobile_end_phase_prompt.custom_minimum_size.x = 0.0
		return
	var parent_rect: Rect2 = mobile_status.get_global_rect()
	var inset: float = _get_mobile_safe_inset()
	var safe_left: int = int(round(maxf(-parent_rect.position.x + inset, 0.0)))
	var safe_right: int = int(round(maxf(parent_rect.end.x - (size.x - inset), 0.0)))
	mobile_prompt_lane.add_theme_constant_override("margin_left", safe_left)
	mobile_prompt_lane.add_theme_constant_override("margin_right", safe_right)
	mobile_end_phase_prompt.custom_minimum_size.x = 0.0

func _get_riposte_ready_status_text() -> String:
	if engine == null:
		return ""
	var effect = _get_riposte_ready_effect()
	if effect == null:
		return ""
	return "Riposte Ready  |  Tank Hit fully blocked. Shield Slam +2 before Quick ends."

func _get_riposte_ready_tooltip() -> String:
	var effect = _get_riposte_ready_effect()
	if effect == null:
		return ""
	return "Granted by %s in Round %d %s. Expires at end of the first following %s Window. A legal %s consumes it." % [
		_riposte_reason_text(effect.trigger_reason),
		effect.trigger_round,
		String(effect.trigger_phase).capitalize(),
		String(effect.expires_at_window_end).capitalize(),
		_riposte_card_text(effect.consume_on_card_id),
	]

func _get_riposte_ready_effect():
	if engine == null:
		return null
	for effect in engine.status_effects.get(engine.primary_hero_id, []):
		if effect.id == &"riposte_ready":
			return effect
	return null

func _riposte_reason_text(reason: StringName) -> String:
	match reason:
		&"qualifying_tank_hit":
			return "a Guarded Front Tank Hit with 0 Health loss"
		_:
			return String(reason).capitalize()

func _riposte_card_text(card_id: StringName) -> String:
	match card_id:
		&"shield_slam":
			return "Shield Slam"
		_:
			return String(card_id).replace("_", " ").capitalize()

func _set_status_payoff_feedback() -> void:
	var latest := _latest_riposte_payoff_fact()
	if latest.is_empty():
		return
	_set_feedback("Riposte Ready consumed: Shield Slam dealt +%d Boss damage (%d total)." % [
		int(latest.get("status_bonus", 0)),
		int(latest.get("requested", 0)),
	])

func _latest_riposte_payoff_fact() -> Dictionary:
	if engine == null or engine.history.is_empty():
		return {}
	for action_index in range(engine.history.size() - 1, -1, -1):
		var action = engine.history[action_index]
		var fact: Dictionary = action.payload.get("resolution_fact", {})
		if fact.get("status_event", {}).get("event", &"") == &"consumed" and fact.get("status_event", {}).get("status_id", &"") == &"riposte_ready":
			for generated in action.generated_actions:
				var generated_fact: Dictionary = generated.payload.get("resolution_fact", {})
				if generated_fact.get("status_id", &"") == &"riposte_ready":
					return generated_fact
	return {}

func _layout_mobile_help_controls() -> void:
	var has_history_controls: bool = mobile_tutorial_history_picker != null and mobile_tutorial_history_picker.visible
	var required_height: float = 220.0 if mobile_help_pane.visible and has_history_controls else 164.0 if mobile_help_pane.visible else 0.0
	if not is_equal_approx(mobile_help_pane.custom_minimum_size.y, required_height):
		mobile_help_pane.custom_minimum_size.y = required_height
		call_deferred("_layout_mobile_help_controls")
		return
	var viewport_inset: float = _get_mobile_safe_inset()
	mobile_help_label.offset_left = viewport_inset
	mobile_help_label.offset_right = -viewport_inset
	mobile_help_label.offset_bottom = -62.0 if has_history_controls else -10.0
	if has_history_controls:
		var reopen_width: float = mobile_tutorial_reopen_button.custom_minimum_size.x
		var picker_width: float = maxf(mobile_help_pane.size.x - viewport_inset * 2.0 - reopen_width - 6.0, 120.0)
		mobile_tutorial_history_picker.position = Vector2(viewport_inset, mobile_help_pane.size.y - 54.0)
		mobile_tutorial_history_picker.size = Vector2(picker_width, 44.0)
		mobile_tutorial_reopen_button.position = Vector2(viewport_inset + picker_width + 6.0, mobile_help_pane.size.y - 56.0)
		mobile_tutorial_reopen_button.size = Vector2(reopen_width, 48.0)
	_layout_mobile_status_effect_pane()
	_layout_mobile_controls_row()

func _layout_mobile_tutorial_prompt() -> void:
	if mobile_tutorial_prompt_pane == null or mobile_tutorial_prompt_lane == null or mobile_tutorial_prompt_dismiss_button == null:
		return
	var viewport_inset: float = _get_mobile_safe_inset()
	var parent_rect: Rect2 = mobile_status.get_global_rect()
	var safe_left: int = int(round(maxf(-parent_rect.position.x + viewport_inset, 0.0)))
	var safe_right: int = int(round(maxf(parent_rect.end.x - (size.x - viewport_inset), 0.0)))
	mobile_tutorial_prompt_lane.add_theme_constant_override("margin_left", safe_left)
	mobile_tutorial_prompt_lane.add_theme_constant_override("margin_right", safe_right)
	mobile_tutorial_prompt_label.offset_left = viewport_inset
	mobile_tutorial_prompt_label.offset_right = -(viewport_inset + mobile_tutorial_prompt_dismiss_button.custom_minimum_size.x + 6.0)

func _layout_mobile_controls_row() -> void:
	if mobile_controls_row == null or mobile_controls_layout_queued:
		return
	mobile_controls_layout_queued = true
	call_deferred("_place_mobile_controls_after_layout")

func _place_mobile_controls_after_layout() -> void:
	mobile_controls_layout_queued = false
	if mobile_controls_row == null or not mobile_controls_row.visible:
		return
	var action_bar_rect: Rect2 = action_bar_view.get_global_rect()
	var row_rect: Rect2 = mobile_controls_row.get_global_rect()
	var continue_size: Vector2 = mobile_continue_button.size
	var help_size: Vector2 = mobile_help_button.size
	var safe_left: float = _get_row_safe_left(row_rect)
	var safe_right: float = _get_row_safe_right(row_rect)
	var action_bar_right: float = clampf(action_bar_rect.end.x - row_rect.position.x - MOBILE_ACTION_CONTROL_PADDING, safe_left, safe_right)
	var first_row_y: float = 0.0
	var second_row_y: float = MOBILE_CONTROLS_ROW_HEIGHT
	var help_x: float = safe_right - help_size.x
	var play_x: float = clampf(action_bar_right - continue_size.x, safe_left, safe_right - continue_size.x)
	var should_wrap: bool = play_x + continue_size.x + MOBILE_CONTROL_ROW_GAP > help_x
	if should_wrap != mobile_controls_wrapped:
		mobile_controls_wrapped = should_wrap
		mobile_controls_row.custom_minimum_size.y = MOBILE_CONTROLS_ROW_WRAP_HEIGHT if mobile_controls_wrapped else MOBILE_CONTROLS_ROW_HEIGHT
		_layout_mobile_help_controls()
		return
	mobile_continue_button.position = Vector2(play_x, first_row_y)
	mobile_help_button.position = Vector2(help_x, second_row_y if mobile_controls_wrapped else first_row_y)

func _get_mobile_safe_inset(padding: float = MOBILE_SAFE_EDGE_PADDING) -> float:
	return maxf((mobile_status.size.x - size.x) * 0.5 + padding, padding)

func _get_row_safe_left(row_rect: Rect2, padding: float = MOBILE_SAFE_EDGE_PADDING) -> float:
	return maxf(-row_rect.position.x + padding, 0.0)

func _get_row_safe_right(row_rect: Rect2, padding: float = MOBILE_SAFE_EDGE_PADDING) -> float:
	return minf(_get_row_safe_left(row_rect, padding) + size.x - padding * 2.0, row_rect.size.x)

func _update_mobile_continue_button() -> void:
	if mobile_continue_button == null:
		return
	var in_player_window: bool = turn_manager.phase == turn_manager.Phase.LOADOUT or turn_manager.phase == turn_manager.Phase.QUICK or turn_manager.phase == turn_manager.Phase.SLOW
	var should_show: bool = mobile_turn_tracker.visible and encounter.active and in_player_window
	_layout_mobile_continue_button()
	if should_show == mobile_continue_button.visible:
		if should_show:
			if turn_manager.phase == turn_manager.Phase.LOADOUT or _should_show_end_phase_prompt():
				_start_mobile_continue_pulse()
			else:
				_stop_mobile_continue_pulse()
		return
	mobile_continue_button.visible = should_show
	if should_show:
		if turn_manager.phase == turn_manager.Phase.LOADOUT or _should_show_end_phase_prompt():
			_start_mobile_continue_pulse()
		else:
			_stop_mobile_continue_pulse()
	else:
		_stop_mobile_continue_pulse()

func _layout_mobile_continue_button() -> void:
	if mobile_continue_button == null:
		return
	mobile_continue_button.pivot_offset = mobile_continue_button.size * 0.5
	_layout_mobile_controls_row()

func _start_mobile_continue_pulse() -> void:
	_stop_mobile_continue_pulse()
	mobile_continue_button.scale = Vector2.ONE
	mobile_continue_button.modulate = Color(1.0, 1.0, 1.0, 1.0)
	mobile_continue_tween = create_tween()
	mobile_continue_tween.set_loops()
	mobile_continue_tween.tween_property(mobile_continue_button, "modulate", Color(1.0, 0.82, 0.48, 1.0), 0.42).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	mobile_continue_tween.tween_property(mobile_continue_button, "modulate", Color.WHITE, 0.42).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

func _stop_mobile_continue_pulse() -> void:
	if mobile_continue_tween != null:
		mobile_continue_tween.kill()
		mobile_continue_tween = null
	if mobile_continue_button != null:
		mobile_continue_button.scale = Vector2.ONE
		mobile_continue_button.modulate = Color.WHITE

func _get_mobile_prompt_text() -> String:
	if not encounter.active:
		return ""
	if turn_manager.phase == turn_manager.Phase.LOADOUT:
		return "Put a card in a Slot, then tap Play."
	if turn_manager.phase != turn_manager.Phase.QUICK and turn_manager.phase != turn_manager.Phase.SLOW:
		return ""
	if _has_ready_action_bar_slot():
		return "Action ready. Tap the loaded slot."
	if _has_hand_slot_action():
		if _has_legal_basic_move():
			return "Drag a card to a slot, or to an adjacent hex to move."
		return "Drag a card to a slot."
	var future_window := _get_loaded_future_window()
	if future_window != "" and not _has_hand_slot_action() and not _has_legal_basic_move():
		return "Loaded for %s. Tap Play when done." % future_window
	if _has_legal_basic_move():
		return "Drag a hand card to an adjacent hex to move."
	if _should_show_end_phase_prompt():
		return "No plays left. Tap Play to move on."
	return ""

func _get_action_guide_text() -> String:
	if not encounter.active:
		return "Guide: Restart to begin a new encounter."
	if turn_manager.phase == turn_manager.Phase.LOADOUT:
		return "Guide: Put a hand card into a Slot.\nThen tap Play.\nDROP marks an empty Slot.\nLOAD means the lifted card can go there.\nHold a card to inspect it.\nDropping onto a loaded Slot replaces that stack."
	if turn_manager.phase == turn_manager.Phase.QUICK:
		return "Guide: Charge a Slot with a hand card; tap a charged Quick Slot to fire. Drag a hand card to an adjacent hex to move, or drag the hero to preview routes. Tap a hex to inspect. Tap Play when done."
	if turn_manager.phase == turn_manager.Phase.SLOW:
		return "Guide: Prepare empty Slots or Charge any eligible Slot. Tap a charged Slow Slot to fire once. Hold cards or tap hexes to inspect, then Tap Play to move on."
	return "Guide: The boss is resolving. Read its timeline, then prepare your next response."

# Prompt predicates ask the engine's legal-action enumeration; no rules live here.
func _legal_player_actions() -> Array:
	return engine.legal_actions(engine.primary_hero_id) if engine != null else []

func _has_legal_action_of_kind(kinds: Array) -> bool:
	for action in _legal_player_actions():
		if action.kind in kinds:
			return true
	return false

func _has_ready_action_bar_slot() -> bool:
	return _has_legal_action_of_kind([EncounterActionModel.Kind.FIRE_SLOT])

func _get_loaded_future_window() -> String:
	for slot in player.action_bar:
		var top_card: Resource = slot.get("top_card")
		if top_card == null:
			continue
		if top_card.get_window_speed() != player.current_window:
			return String(top_card.get_window_speed()).capitalize()
	return ""

func _has_hand_slot_action() -> bool:
	return _has_legal_action_of_kind([EncounterActionModel.Kind.LOAD_SLOT, EncounterActionModel.Kind.CHARGE_SLOT])

func _has_player_window_action() -> bool:
	return _has_legal_action_of_kind([
		EncounterActionModel.Kind.FIRE_SLOT,
		EncounterActionModel.Kind.LOAD_SLOT,
		EncounterActionModel.Kind.CHARGE_SLOT,
		EncounterActionModel.Kind.MOVE_HERO,
	])

func _has_legal_basic_move() -> bool:
	return _has_legal_action_of_kind([EncounterActionModel.Kind.MOVE_HERO])

func _can_prime_player_move() -> bool:
	return false

func _get_mobile_round_track() -> String:
	var phase_icon := "☄"
	var phase_name := "Boss"
	match turn_manager.phase:
		turn_manager.Phase.LOADOUT:
			phase_icon = "L"
			phase_name = "Loadout"
		turn_manager.Phase.QUICK:
			phase_icon = "⚡"
			phase_name = "Quick"
		turn_manager.Phase.SLOW:
			phase_icon = "◷"
			phase_name = "Slow"
		turn_manager.Phase.INCOMING:
			phase_icon = "☄"
			phase_name = "Boss"
	var pips: Array[String] = []
	for round_index in encounter.round_limit:
		pips.append("●" if round_index < turn_manager.turn_number else "○")
	return "▣%d  ⌫%d   %s %s  R%d/%d  %s" % [player.hand.size(), player.discard.size(), phase_icon, phase_name, turn_manager.turn_number, encounter.round_limit, "".join(pips)]

func _get_mobile_tempo_track() -> String:
	return _get_mobile_hand_track()

func _get_mobile_hand_track() -> String:
	return "Hand %d  Discard %d" % [player.hand.size(), player.discard.size()]

func _raise_hud_above_board() -> void:
	for hud in [top_bar, mobile_status, hand_scroll, mobile_turn_tracker, left_panel, right_panel_scroll, tile_info_pane]:
		hud.z_as_relative = false
		hud.z_index = 4095

func _can_basic_move() -> bool:
	return _can_basic_move_to(selected_tile)

func _can_basic_move_to(tile: Node) -> bool:
	if tile == null or engine == null:
		return false
	var card: Resource = selected_card if selected_card != null and player.hand.has(selected_card) else (player.hand[0] if not player.hand.is_empty() else null)
	if card == null:
		return false
	return engine.legality(EncounterActionModel.move_hero(engine.primary_hero_id, tile.axial, card))["legal"]

func _apply_skin() -> void:
	queue_redraw()
	phase_label.add_theme_font_size_override("font_size", 14)
	phase_label.add_theme_color_override("font_color", Color(0.94, 0.85, 0.64))

	intent_label.add_theme_color_override("font_color", Color(0.88, 0.87, 0.84))
	selected_label.add_theme_color_override("font_color", Color(0.76, 0.80, 0.84))
	tempo_label.add_theme_color_override("font_color", Color(0.90, 0.87, 0.74))
	mobile_round_label.add_theme_font_size_override("font_size", 16)
	mobile_round_label.add_theme_color_override("font_color", Color(0.94, 0.85, 0.64))
	mobile_turn_tracker.custom_minimum_size = Vector2(0, 58)
	mobile_turn_tracker.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	mobile_turn_tracker.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	mobile_turn_tracker.add_theme_font_size_override("font_size", 15)
	mobile_turn_tracker.add_theme_color_override("font_color", Color(0.97, 0.88, 0.64))
	mobile_turn_tracker.add_theme_stylebox_override("normal", _make_mobile_tracker_style())
	mobile_tempo_bar.add_theme_font_size_override("font_size", 18)
	mobile_tempo_bar.add_theme_color_override("font_color", Color(0.98, 0.97, 0.92))
	mobile_end_phase_prompt.add_theme_font_size_override("font_size", 11)
	mobile_end_phase_prompt.add_theme_color_override("font_color", Color(0.96, 0.72, 0.45))
	action_guide_label.add_theme_font_size_override("font_size", 12)
	action_guide_label.add_theme_color_override("font_color", Color(0.95, 0.82, 0.54))
	mobile_help_pane.add_theme_stylebox_override("panel", _make_info_pane_style(Color(0.08, 0.065, 0.05, 0.98), Color(0.76, 0.50, 0.30)))
	mobile_tutorial_prompt_pane.add_theme_stylebox_override("panel", _make_info_pane_style(Color(0.10, 0.12, 0.17, 0.98), Color(0.44, 0.73, 0.88)))
	mobile_tutorial_prompt_label.add_theme_font_size_override("font_size", 10)
	mobile_tutorial_prompt_label.add_theme_color_override("font_color", Color(0.89, 0.96, 1.0))
	tile_info_pane.mouse_filter = Control.MOUSE_FILTER_STOP
	tile_info_pane.add_theme_stylebox_override("panel", _make_info_pane_style())
	tile_info_badge.add_theme_font_size_override("font_size", 22)
	tile_info_badge.add_theme_color_override("font_color", Color(0.98, 0.93, 0.76))
	tile_info_badge.add_theme_stylebox_override("normal", _make_badge_style(Color(0.16, 0.23, 0.27), Color(0.54, 0.74, 0.80)))
	tile_info_name.add_theme_font_size_override("font_size", 16)
	tile_info_name.add_theme_color_override("font_color", Color(0.98, 0.96, 0.90))
	tile_info_subtitle.add_theme_font_size_override("font_size", 10)
	tile_info_subtitle.add_theme_color_override("font_color", Color(0.70, 0.78, 0.82))
	tile_info_stats.add_theme_font_size_override("font_size", 11)
	tile_info_stats.add_theme_color_override("font_color", Color(0.88, 0.88, 0.84))
	tile_info_health.add_theme_stylebox_override("background", _make_progress_style(Color(0.02, 0.03, 0.04), Color(0.19, 0.28, 0.32)))
	tile_info_health.add_theme_stylebox_override("fill", _make_progress_style(Color(0.30, 0.72, 0.82), Color(0.30, 0.72, 0.82)))

	show_coordinates_checkbox.add_theme_color_override("font_color", Color(0.84, 0.83, 0.78))
	show_coordinates_checkbox.add_theme_color_override("font_hover_color", Color(0.95, 0.92, 0.84))
	show_coordinates_checkbox.add_theme_color_override("font_pressed_color", Color(0.95, 0.92, 0.84))

	var action_button := _make_button_style(Color(0.20, 0.32, 0.24), Color(0.45, 0.67, 0.48))
	var phase_button := _make_button_style(Color(0.31, 0.20, 0.16), Color(0.74, 0.48, 0.32))
	prepare_button.add_theme_stylebox_override("normal", action_button)
	prepare_button.add_theme_stylebox_override("hover", _make_button_style(Color(0.25, 0.38, 0.28), Color(0.53, 0.75, 0.55)))
	prepare_button.add_theme_color_override("font_color", Color(0.95, 0.94, 0.90))
	charge_button.add_theme_stylebox_override("normal", action_button)
	charge_button.add_theme_stylebox_override("hover", _make_button_style(Color(0.25, 0.38, 0.28), Color(0.53, 0.75, 0.55)))
	charge_button.add_theme_color_override("font_color", Color(0.95, 0.94, 0.90))
	activate_button.add_theme_stylebox_override("normal", action_button)
	activate_button.add_theme_stylebox_override("hover", _make_button_style(Color(0.25, 0.38, 0.28), Color(0.53, 0.75, 0.55)))
	activate_button.add_theme_color_override("font_color", Color(0.95, 0.94, 0.90))
	move_button.add_theme_stylebox_override("normal", action_button)
	move_button.add_theme_stylebox_override("hover", _make_button_style(Color(0.25, 0.38, 0.28), Color(0.53, 0.75, 0.55)))
	move_button.add_theme_color_override("font_color", Color(0.95, 0.94, 0.90))
	%AdvancePhase.add_theme_stylebox_override("normal", phase_button)
	%AdvancePhase.add_theme_stylebox_override("hover", _make_button_style(Color(0.38, 0.24, 0.19), Color(0.86, 0.57, 0.38)))
	%AdvancePhase.add_theme_color_override("font_color", Color(0.97, 0.93, 0.88))
	mobile_continue_button.add_theme_stylebox_override("normal", phase_button)
	mobile_continue_button.add_theme_stylebox_override("hover", _make_button_style(Color(0.38, 0.24, 0.19), Color(0.86, 0.57, 0.38)))
	mobile_continue_button.add_theme_color_override("font_color", Color(0.97, 0.93, 0.88))
	mobile_continue_button.add_theme_font_size_override("font_size", 18)
	mobile_help_button.add_theme_stylebox_override("normal", phase_button)
	mobile_help_button.add_theme_stylebox_override("hover", _make_button_style(Color(0.38, 0.24, 0.19), Color(0.86, 0.57, 0.38)))
	mobile_help_button.add_theme_color_override("font_color", Color(0.97, 0.93, 0.88))
	mobile_help_button.add_theme_font_size_override("font_size", 18)
	mobile_status_effect_pane.add_theme_stylebox_override("panel", _make_info_pane_style(Color(0.09, 0.12, 0.10, 0.97), Color(0.55, 0.78, 0.50)))
	mobile_status_effect_label.add_theme_font_size_override("font_size", 12)
	mobile_status_effect_label.add_theme_color_override("font_color", Color(0.91, 1.0, 0.78))
	_apply_accessible_button_theme(prepare_button, action_button, Color(0.25, 0.38, 0.28), Color(0.53, 0.75, 0.55))
	_apply_accessible_button_theme(charge_button, action_button, Color(0.25, 0.38, 0.28), Color(0.53, 0.75, 0.55))
	_apply_accessible_button_theme(activate_button, action_button, Color(0.25, 0.38, 0.28), Color(0.53, 0.75, 0.55))
	_apply_accessible_button_theme(move_button, action_button, Color(0.25, 0.38, 0.28), Color(0.53, 0.75, 0.55))
	_apply_accessible_button_theme(%AdvancePhase, phase_button, Color(0.38, 0.24, 0.19), Color(0.86, 0.57, 0.38))
	_apply_accessible_button_theme(mobile_continue_button, phase_button, Color(0.38, 0.24, 0.19), Color(0.86, 0.57, 0.38))
	mobile_continue_button.add_theme_font_size_override("font_size", 18)
	_apply_accessible_button_theme(mobile_help_button, phase_button, Color(0.38, 0.24, 0.19), Color(0.86, 0.57, 0.38))
	mobile_help_button.custom_minimum_size = Vector2(48, 48)
	mobile_help_button.add_theme_font_size_override("font_size", 18)
	_apply_accessible_button_theme(mobile_tutorial_prompt_dismiss_button, _make_button_style(Color(0.16, 0.26, 0.33), Color(0.44, 0.73, 0.88)), Color(0.22, 0.35, 0.44), Color(0.66, 0.90, 1.0))
	mobile_tutorial_prompt_dismiss_button.custom_minimum_size = Vector2(54, 48)
	mobile_tutorial_prompt_dismiss_button.add_theme_font_size_override("font_size", 9)
	_apply_accessible_button_theme(mobile_tutorial_reopen_button, phase_button, Color(0.38, 0.24, 0.19), Color(0.86, 0.57, 0.38))
	mobile_tutorial_reopen_button.custom_minimum_size = Vector2(74, 48)
	mobile_tutorial_reopen_button.add_theme_font_size_override("font_size", 10)
	mobile_tutorial_history_picker.add_theme_font_size_override("font_size", 10)
	_apply_accessible_button_theme(restart_button, _make_button_style(Color(0.30, 0.17, 0.14), Color(0.82, 0.47, 0.33)), Color(0.38, 0.22, 0.18), Color(0.94, 0.60, 0.42))
	_apply_accessible_checkbox_theme(show_coordinates_checkbox)

func _apply_accessible_button_theme(button: Button, normal: StyleBoxFlat, hover_fill: Color, hover_border: Color) -> void:
	button.custom_minimum_size = Vector2(0, 48)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", _make_button_style(hover_fill, hover_border))
	button.add_theme_stylebox_override("focus", _make_button_style(normal.bg_color, Color(1.0, 0.92, 0.50), 4))
	button.add_theme_stylebox_override("disabled", _make_button_style(Color(0.15, 0.15, 0.16), Color(0.38, 0.38, 0.40)))
	button.add_theme_color_override("font_color", Color(0.98, 0.97, 0.92))
	button.add_theme_color_override("font_hover_color", Color.WHITE)
	button.add_theme_color_override("font_disabled_color", Color(0.70, 0.70, 0.72))
	button.add_theme_font_size_override("font_size", 14)

func _apply_accessible_checkbox_theme(checkbox: CheckBox) -> void:
	checkbox.custom_minimum_size = Vector2(0, 44)
	checkbox.add_theme_stylebox_override("focus", _make_button_style(Color(0.0, 0.0, 0.0, 0.12), Color(1.0, 0.92, 0.50), 3))
	checkbox.add_theme_color_override("font_color", Color(0.90, 0.90, 0.86))
	checkbox.add_theme_color_override("font_hover_color", Color.WHITE)
	checkbox.add_theme_color_override("font_focus_color", Color(1.0, 0.92, 0.50))
	checkbox.add_theme_font_size_override("font_size", 14)

func _make_info_pane_style(fill: Color = Color(0.05, 0.08, 0.10, 0.99), border: Color = Color(0.35, 0.58, 0.66, 0.92)) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(2)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.45)
	style.shadow_size = 8
	style.content_margin_left = 10
	style.content_margin_top = 8
	style.content_margin_right = 10
	style.content_margin_bottom = 8
	return style

func _make_badge_style(fill: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(2)
	style.corner_radius_top_left = 20
	style.corner_radius_top_right = 20
	style.corner_radius_bottom_left = 20
	style.corner_radius_bottom_right = 20
	return style

func _make_progress_style(fill: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(1)
	style.corner_radius_top_left = 3
	style.corner_radius_top_right = 3
	style.corner_radius_bottom_left = 3
	style.corner_radius_bottom_right = 3
	return style

func _make_mobile_tracker_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.10, 0.095, 0.085, 0.88)
	style.border_color = Color(0.53, 0.51, 0.46, 0.52)
	style.set_border_width_all(1)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.content_margin_left = 58
	style.content_margin_right = 136
	style.content_margin_top = 8
	style.content_margin_bottom = 8
	return style

func _make_button_style(fill: Color, border: Color, border_width: int = 2) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(border_width)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.35)
	style.shadow_size = 5
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 8
	style.content_margin_bottom = 8
	return style
