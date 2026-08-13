extends Control

const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")

const CONTENT_CATALOG := preload("res://resources/content_catalog.tres")
const DUELYST_BACKDROP := preload("res://assets/art/open-duelyst/magaari_ember_highlands_background.jpg")

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
var engine

func _ready() -> void:
	set_anchors_preset(Control.PRESET_TOP_LEFT)
	get_viewport().size_changed.connect(_fit_to_viewport)
	_build_mobile_continue_button()
	_raise_hud_above_board()
	_fit_to_viewport()
	_apply_skin()
	hand_view.bind(player)
	action_bar_view.bind(player)
	hand_view.card_selected.connect(_on_card_selected)
	hand_view.card_inspection_started.connect(_on_card_inspection_started)
	hand_view.card_inspection_ended.connect(_on_card_inspection_ended)
	%CardInspectOverlay.dismiss_requested.connect(_on_card_inspection_dismiss_requested)
	mobile_round_label.mouse_filter = Control.MOUSE_FILTER_STOP
	mobile_round_label.gui_input.connect(_on_mobile_round_input)
	mobile_continue_button.pressed.connect(_on_mobile_continue_pressed)
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
	top_bar.visible = not mobile
	mobile_status.visible = mobile
	mobile_status_top.visible = not mobile
	mobile_turn_tracker.visible = mobile
	mobile_tempo_bar.visible = mobile
	right_panel_scroll.visible = not mobile
	hand_title.visible = not mobile
	board_title.visible = not mobile
	root_container.add_theme_constant_override("separation", 6 if mobile else 8)
	hand_scroll.custom_minimum_size.y = 84.0 if mobile else 62.0
	hex_grid.custom_minimum_size = Vector2(0, 230) if mobile else Vector2(320, 260)
	left_panel.custom_minimum_size = Vector2.ZERO if mobile else Vector2(150, 0)
	left_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left_panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER if mobile else Control.SIZE_EXPAND_FILL
	hex_grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	action_bar_view.set_compact(mobile)
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
	var mobile_prompt_text := _get_mobile_prompt_text()
	mobile_end_phase_prompt.text = mobile_prompt_text
	mobile_end_phase_prompt.visible = not mobile_prompt_text.is_empty()
	_update_mobile_continue_button()
	mobile_round_label.tooltip_text = "Round %d of %d: %s. %s" % [
		turn_manager.turn_number,
		encounter.round_limit,
		turn_manager.get_phase_name(),
		"Tap to end this window." if encounter.active and _should_show_end_phase_prompt() else "Tap to restart." if not encounter.active else "Current phase.",
	]
	action_bar_view.set_selected_slot(selected_slot_index)
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

func _on_card_inspection_started(card: Resource) -> void:
	%CardInspectOverlay.show_card(card)

func _on_card_inspection_ended(_card: Resource) -> void:
	%CardInspectOverlay.hide_card()

func _on_card_inspection_dismiss_requested() -> void:
	%CardInspectOverlay.hide_card()

func _on_slot_pressed(index: int) -> void:
	selected_slot_index = index
	var slot: Dictionary = player.get_slot(index)
	var top_card: Resource = slot.get("top_card")
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
	var action = EncounterActionModel.load_slot(engine.primary_hero_id, index, card) if top_card == null or engine.phase == &"loadout" else EncounterActionModel.charge_slot(engine.primary_hero_id, index, card)
	var resolved = engine.apply(action)
	_sync_from_engine()
	if resolved.succeeded:
		selected_card = null
	else:
		_set_feedback(resolved.reason)
	_refresh_status()

func _on_tile_selected(tile: Node) -> void:
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
	var target_id: StringName = selected_piece.piece_id if selected_piece != null and top_card.target_type == 3 else &""
	var resolved = engine.apply(EncounterActionModel.fire_slot(engine.primary_hero_id, selected_slot_index, target_id))
	_sync_from_engine()
	if not resolved.succeeded:
		_set_feedback(resolved.reason)
		return
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
	var encounter_data: Resource = CONTENT_CATALOG.default_encounter
	engine = EncounterEngineModel.new()
	engine.start(encounter_data)
	player.bind_engine(engine, engine.primary_hero_id)
	boss.bind_engine(engine)
	turn_manager.bind_engine(engine)
	encounter.bind_engine(engine)
	hex_grid.sync_from_engine(engine)
	selected_card = null
	selected_tile = null
	selected_piece = null
	selected_slot_index = -1
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
	mobile_continue_button = Button.new()
	mobile_continue_button.name = "MobileContinueButton"
	mobile_continue_button.text = "▶"
	mobile_continue_button.visible = false
	mobile_continue_button.custom_minimum_size = Vector2(96, 44)
	mobile_continue_button.size = Vector2(96, 44)
	mobile_continue_button.mouse_filter = Control.MOUSE_FILTER_STOP
	mobile_continue_button.tooltip_text = "End this window."
	mobile_continue_button.z_index = 20
	mobile_continue_button.text = "Continue"
	add_child(mobile_continue_button)

func _update_mobile_continue_button() -> void:
	if mobile_continue_button == null:
		return
	var should_show: bool = mobile_turn_tracker.visible and (turn_manager.phase == turn_manager.Phase.LOADOUT or _should_show_end_phase_prompt())
	_layout_mobile_continue_button()
	if should_show == mobile_continue_button.visible:
		return
	mobile_continue_button.visible = should_show
	if should_show:
		_start_mobile_continue_pulse()
	else:
		_stop_mobile_continue_pulse()

func _layout_mobile_continue_button() -> void:
	if mobile_continue_button == null or mobile_turn_tracker == null:
		return
	var button_size := Vector2(96, 44)
	mobile_continue_button.size = button_size
	mobile_continue_button.pivot_offset = button_size * 0.5
	var tracker_rect := mobile_turn_tracker.get_global_rect()
	var font := mobile_turn_tracker.get_theme_default_font()
	var font_size := mobile_turn_tracker.get_theme_font_size("font_size")
	var text_width := font.get_string_size(mobile_turn_tracker.text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, font_size).x
	var text_right := tracker_rect.position.x + tracker_rect.size.x * 0.5 + text_width * 0.5
	mobile_continue_button.position = Vector2(
		clampf(text_right + 8.0, 18.0, size.x - button_size.x - 18.0),
		clampf(tracker_rect.position.y + (tracker_rect.size.y - button_size.y) * 0.5, 18.0, size.y - button_size.y - 18.0)
	)

func _start_mobile_continue_pulse() -> void:
	_stop_mobile_continue_pulse()
	mobile_continue_button.scale = Vector2.ONE
	mobile_continue_button.modulate = Color(1.0, 1.0, 1.0, 1.0)
	mobile_continue_tween = create_tween()
	mobile_continue_tween.set_loops()
	mobile_continue_tween.tween_property(mobile_continue_button, "scale", Vector2(1.13, 1.13), 0.42).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	mobile_continue_tween.parallel().tween_property(mobile_continue_button, "modulate", Color(1.0, 0.88, 0.62, 1.0), 0.42).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	mobile_continue_tween.tween_property(mobile_continue_button, "scale", Vector2.ONE, 0.42).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	mobile_continue_tween.parallel().tween_property(mobile_continue_button, "modulate", Color.WHITE, 0.42).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

func _stop_mobile_continue_pulse() -> void:
	if mobile_continue_tween != null:
		mobile_continue_tween.kill()
		mobile_continue_tween = null
	if mobile_continue_button != null:
		mobile_continue_button.scale = Vector2.ONE
		mobile_continue_button.modulate = Color.WHITE

func _get_mobile_prompt_text() -> String:
	return _get_action_guide_text()

	# Legacy contextual branches remain below while the guide owns the visible prompt.
	if not encounter.active:
		return ""
	if turn_manager.phase == turn_manager.Phase.LOADOUT:
		return "Loadout: replace Top Cards, then tap continue."
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
		return "Loaded for %s. Tap ▶ when done." % future_window
	if _has_legal_basic_move():
		return "Drag a hand card to an adjacent hex to move."
	if _should_show_end_phase_prompt():
		return "No plays left. Tap ▶."
	return ""

func _get_action_guide_text() -> String:
	if not encounter.active:
		return "Guide: Restart to begin a new encounter."
	if turn_manager.phase == turn_manager.Phase.LOADOUT:
		return "Guide: Drag a hand card to an empty Slot to prepare it. During Loadout, drag onto a loaded Slot to replace its whole bundle. Hold a card to inspect it. Tap Continue."
	if turn_manager.phase == turn_manager.Phase.QUICK:
		return "Guide: Charge a Slot with a hand card; tap a charged Quick Slot to fire. Drag a hand card to an adjacent hex to move, or drag the hero to preview routes. Tap a hex to inspect. Tap Continue when done."
	if turn_manager.phase == turn_manager.Phase.SLOW:
		return "Guide: Prepare empty Slots or Charge any eligible Slot. Tap a charged Slow Slot to fire once. Hold cards or tap hexes to inspect, then tap Continue."
	return "Guide: The boss is resolving. Read its timeline, then prepare your next response."

func _has_ready_action_bar_slot() -> bool:
	for slot in player.action_bar:
		var top_card: Resource = slot.get("top_card")
		if top_card != null and not slot.get("charges", []).is_empty() and top_card.get_window_speed() == player.current_window and slot.get("activated_window", &"") != player.current_window:
			return true
	return false

func _get_loaded_future_window() -> String:
	for slot in player.action_bar:
		var top_card: Resource = slot.get("top_card")
		if top_card == null:
			continue
		if top_card.get_window_speed() != player.current_window:
			return String(top_card.get_window_speed()).capitalize()
	return ""

func _has_hand_slot_action() -> bool:
	if player.hand.is_empty():
		return false
	for slot in player.action_bar:
		var top_card: Resource = slot.get("top_card")
		if top_card == null:
			return true
		if player.current_window == &"loadout":
			return true
		if slot.get("activated_window", &"") != player.current_window and slot.get("charges", []).size() < top_card.get_charge_cap():
			return true
	return false

func _has_player_window_action() -> bool:
	for slot in player.action_bar:
		var top_card: Resource = slot.get("top_card")
		if top_card != null and not slot.get("charges", []).is_empty() and top_card.get_window_speed() == player.current_window and slot.get("activated_window", &"") != player.current_window:
			return true
	if _has_legal_basic_move():
		return true
	return _has_hand_slot_action()

func _has_legal_basic_move() -> bool:
	if player.current_window != &"quick" or player.hand.is_empty() or hex_grid.player_piece == null:
		return false
	var current_coords: Vector2i = hex_grid.get_piece_coords(hex_grid.player_piece)
	for coords in hex_grid.get_neighbors(current_coords):
		if hex_grid.can_move_piece_to(hex_grid.player_piece, coords):
			return true
	return false

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
	return "%s %s  R%d/%d  %s" % [phase_icon, phase_name, turn_manager.turn_number, encounter.round_limit, "".join(pips)]

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
	if tile == null:
		return false
	if player.current_window != &"quick":
		return false
	if player.hand.is_empty():
		return false
	return hex_grid.can_move_piece_to(hex_grid.player_piece, tile.axial)

func _apply_skin() -> void:
	queue_redraw()
	phase_label.add_theme_font_size_override("font_size", 14)
	phase_label.add_theme_color_override("font_color", Color(0.94, 0.85, 0.64))

	intent_label.add_theme_color_override("font_color", Color(0.88, 0.87, 0.84))
	selected_label.add_theme_color_override("font_color", Color(0.76, 0.80, 0.84))
	tempo_label.add_theme_color_override("font_color", Color(0.90, 0.87, 0.74))
	mobile_round_label.add_theme_font_size_override("font_size", 16)
	mobile_round_label.add_theme_color_override("font_color", Color(0.94, 0.85, 0.64))
	mobile_turn_tracker.add_theme_font_size_override("font_size", 13)
	mobile_turn_tracker.add_theme_color_override("font_color", Color(0.94, 0.85, 0.64))
	mobile_tempo_bar.add_theme_font_size_override("font_size", 18)
	mobile_tempo_bar.add_theme_color_override("font_color", Color(0.98, 0.97, 0.92))
	mobile_end_phase_prompt.add_theme_font_size_override("font_size", 11)
	mobile_end_phase_prompt.add_theme_color_override("font_color", Color(0.96, 0.72, 0.45))
	action_guide_label.add_theme_font_size_override("font_size", 12)
	action_guide_label.add_theme_color_override("font_color", Color(0.95, 0.82, 0.54))
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
	_apply_accessible_button_theme(prepare_button, action_button, Color(0.25, 0.38, 0.28), Color(0.53, 0.75, 0.55))
	_apply_accessible_button_theme(charge_button, action_button, Color(0.25, 0.38, 0.28), Color(0.53, 0.75, 0.55))
	_apply_accessible_button_theme(activate_button, action_button, Color(0.25, 0.38, 0.28), Color(0.53, 0.75, 0.55))
	_apply_accessible_button_theme(move_button, action_button, Color(0.25, 0.38, 0.28), Color(0.53, 0.75, 0.55))
	_apply_accessible_button_theme(%AdvancePhase, phase_button, Color(0.38, 0.24, 0.19), Color(0.86, 0.57, 0.38))
	_apply_accessible_button_theme(mobile_continue_button, phase_button, Color(0.38, 0.24, 0.19), Color(0.86, 0.57, 0.38))
	mobile_continue_button.add_theme_font_size_override("font_size", 18)
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
