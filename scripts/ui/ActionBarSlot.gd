class_name ActionBarSlot
extends Button

const GameTooltipScene := preload("res://scripts/ui/GameTooltip.gd")

signal slot_pressed(index: int)
signal card_dropped(index: int, card: Resource)

const PLACEHOLDER_ART := preload("res://assets/art/prototype/paladin-placeholder.png")
const QUICK_ICON := "⚡"
const SLOW_ICON := "◷"
const CHARGE_ICON := "◆"
const EMPTY_CHARGE_ICON := "◇"
const DAMAGE_ICON := "⚔"
const GUARD_ICON := "◉"
const SUPPORT_ICON := "✚"
const INTERRUPT_ICON := "⇄"
const CLASS_ICON := "◈"

var slot_index: int = -1
var slot_data: Dictionary = {}
var selected: bool = false
var drop_hovered: bool = false
var compact: bool = false
var loaded_card: Resource
var loaded_charges: Array = []
var ready_action: bool = false
var interaction_window: StringName = &"loadout"
var context_card: Resource
var state_tween: Tween
var transition_hint: StringName = &""

func bind(index: int, data: Dictionary, is_selected: bool, is_compact: bool = false, current_window: StringName = &"loadout", selected_hand_card: Resource = null, transition: StringName = &"") -> void:
	slot_index = index
	slot_data = data
	selected = is_selected
	compact = is_compact
	interaction_window = current_window
	context_card = selected_hand_card
	transition_hint = transition
	loaded_card = slot_data.get("top_card")
	loaded_charges = slot_data.get("charges", [])
	ready_action = slot_data.get("ready_action", false)
	custom_minimum_size = Vector2(112, 78) if compact else Vector2(176, 152)
	size_flags_horizontal = Control.SIZE_SHRINK_CENTER if compact else Control.SIZE_EXPAND_FILL
	add_theme_color_override("font_color", Color(0.95, 0.93, 0.88))
	add_theme_font_size_override("font_size", 10 if compact else 13)
	add_theme_stylebox_override("normal", _slot_style())
	add_theme_stylebox_override("hover", _slot_style(true))
	add_theme_stylebox_override("focus", _slot_style(false, true))
	text = _slot_text() if loaded_card == null else ""
	tooltip_text = _slot_tooltip()
	modulate = Color.WHITE if context_card == null or _can_accept_hand_card() else Color(0.52, 0.52, 0.54, 0.72)
	_start_state_motion()
	call_deferred("_play_transition_motion")

func _pressed() -> void:
	slot_pressed.emit(slot_index)

func _make_custom_tooltip(for_text: String) -> Object:
	return GameTooltipScene.new(for_text)

func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
	if typeof(data) != TYPE_DICTIONARY:
		_set_drop_hover(false)
		return false
	if data.get("kind") != "hand_card":
		_set_drop_hover(false)
		return false
	if data.get("card") == null:
		_set_drop_hover(false)
		return false
	if not _can_accept_hand_card():
		_set_drop_hover(false)
		return false
	_set_drop_hover(true)
	return true

func _drop_data(_at_position: Vector2, data: Variant) -> void:
	_set_drop_hover(false)
	var card: Resource = data.get("card")
	if card == null:
		return
	card_dropped.emit(slot_index, card)

func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_END:
		_set_drop_hover(false)

func _draw() -> void:
	if loaded_card == null:
		_draw_empty_slot_affordance(get_theme_default_font())
		if drop_hovered:
			_draw_drop_intent()
		elif context_card != null and _can_accept_hand_card():
			_draw_destination_cue(get_theme_default_font())
		return

	var inset := 5.0 if compact else 8.0
	var stack_height: float = 14.0 if compact else 30.0
	var art_rect := Rect2(Vector2(inset, inset), size - Vector2(inset * 2.0, inset * 2.0 + stack_height))
	var font := get_theme_default_font()
	_draw_charge_stack(font, art_rect, inset, stack_height)
	var artwork := _get_card_artwork(loaded_card)
	if artwork != null:
		draw_texture_rect(artwork, art_rect, false)
	draw_rect(art_rect, Color(0.0, 0.0, 0.0, 0.18), true)
	draw_line(art_rect.position, art_rect.position + Vector2(art_rect.size.x, 0.0), _border_color_for_card(loaded_card).lightened(0.25), 2.0)

	var title_band := Rect2(Vector2(art_rect.position.x, art_rect.end.y - (22.0 if compact else 36.0)), Vector2(art_rect.size.x, 22.0 if compact else 36.0))
	draw_rect(title_band, Color(0.01, 0.015, 0.02, 0.86), true)
	var title := _short_title(loaded_card.title, 14 if compact else 22)
	var title_size := 11 if compact else 15
	var title_pos := Vector2(art_rect.position.x + 7.0, art_rect.end.y - (6.0 if compact else 13.0))
	draw_string(font, title_pos, title, HORIZONTAL_ALIGNMENT_LEFT, art_rect.size.x - 14.0, title_size, Color(0.98, 0.96, 0.90))

	var top_line := "%s %s  %s" % [
		_window_icon(loaded_card),
		_charge_pips(loaded_charges.size(), loaded_card.get_charge_cap()),
		String(get_visual_state()).to_upper(),
	]
	var top_size := 9 if compact else 13
	var top_rect := Rect2(art_rect.position + Vector2(4.0, 4.0), Vector2(art_rect.size.x - 8.0, 17.0 if compact else 24.0))
	draw_rect(top_rect, Color(0.01, 0.015, 0.02, 0.72), true)
	draw_string(font, top_rect.position + Vector2(5.0, top_rect.size.y - 5.0), top_line, HORIZONTAL_ALIGNMENT_LEFT, top_rect.size.x - 10.0, top_size, Color(1.0, 0.94, 0.80))

	if selected:
		draw_rect(art_rect.grow(-1.0), Color(1.0, 0.92, 0.50, 0.20), false, 2.0)
	var state := get_visual_state()
	if state == &"ready":
		draw_rect(art_rect.grow(1.0), Color(1.0, 0.82, 0.28, 0.34), false, 3.0)
		draw_string(font, art_rect.position + Vector2(art_rect.size.x - 30.0, art_rect.size.y * 0.55), "▶", HORIZONTAL_ALIGNMENT_CENTER, 24.0, 18 if compact else 22, Color(1.0, 0.88, 0.45))
	elif state == &"primed":
		_draw_state_flag(font, "FULL", "✦", Color(0.53, 0.88, 0.96))
	elif state == &"activated":
		_draw_state_flag(font, "USED", "✓", Color(0.68, 0.73, 0.76))
	elif state == &"locked":
		_draw_state_flag(font, "LOCK", "×", Color(0.72, 0.69, 0.66))
	elif state == &"loaded":
		_draw_state_flag(font, "LOADED", "▣", Color(0.82, 0.84, 0.86))
	if drop_hovered:
		_draw_drop_intent()
	elif context_card != null and _can_accept_hand_card():
		_draw_destination_cue(font)

func _draw_drop_intent() -> void:
	var font := get_theme_default_font()
	var intent := _get_drop_intent_label()
	var accent := Color(0.44, 0.82, 0.94) if intent == "CHARGE" else Color(0.96, 0.76, 0.34)
	var overlay := Rect2(Vector2(3.0, 3.0), size - Vector2(6.0, 6.0))
	draw_rect(overlay, Color(0.02, 0.04, 0.05, 0.90), true)
	draw_rect(overlay, accent, false, 3.0)
	var cue := "%s  %s" % [_get_drop_intent_icon(), intent]
	draw_string(font, Vector2(0.0, size.y * 0.56), cue, HORIZONTAL_ALIGNMENT_CENTER, size.x, 13 if compact else 17, accent)

func _draw_empty_slot_affordance(font: Font) -> void:
	var lane := Rect2(Vector2(8.0, size.y * 0.23), Vector2(size.x - 16.0, 20.0))
	var copy := Rect2(Vector2(8.0, size.y * 0.50), Vector2(size.x - 16.0, 18.0))
	draw_rect(lane, Color(0.02, 0.03, 0.04, 0.84), true)
	draw_rect(lane, Color(0.72, 0.75, 0.80, 0.58), false, 1.5)
	draw_rect(copy, Color(0.02, 0.03, 0.04, 0.68), true)
	draw_string(font, lane.position + Vector2(0.0, 14.0), "CARD SLOT", HORIZONTAL_ALIGNMENT_CENTER, lane.size.x, 9, Color(0.90, 0.92, 0.96))
	draw_string(font, copy.position + Vector2(0.0, 13.0), "DROP", HORIZONTAL_ALIGNMENT_CENTER, copy.size.x, 10, Color(1.0, 0.83, 0.46))

func _get_drop_intent_label() -> String:
	if loaded_card == null:
		return "LOAD"
	if interaction_window == &"loadout":
		return "REPLACE"
	return "CHARGE"

func _get_drop_intent_icon() -> String:
	match _get_drop_intent_label():
		"CHARGE":
			return CHARGE_ICON
		"REPLACE":
			return "↻"
		_:
			return "▣"

func _can_accept_hand_card() -> bool:
	if loaded_card == null:
		return interaction_window in [&"loadout", &"quick", &"slow"]
	if interaction_window == &"loadout":
		return true
	if interaction_window not in [&"quick", &"slow"]:
		return false
	return slot_data.get("activated_window", &"") != interaction_window and loaded_charges.size() < loaded_card.get_charge_cap()

func get_visual_state() -> StringName:
	if loaded_card == null:
		return &"empty"
	if slot_data.get("activated_window", &"") == interaction_window:
		return &"activated"
	if loaded_charges.size() >= loaded_card.get_charge_cap():
		return &"primed"
	if ready_action:
		return &"ready"
	if interaction_window not in [&"loadout", loaded_card.get_window_speed()]:
		return &"locked"
	return &"loaded"

func _draw_destination_cue(font: Font) -> void:
	var intent := _get_drop_intent_label()
	var accent := Color(0.44, 0.82, 0.94) if intent == "CHARGE" else Color(0.96, 0.76, 0.34)
	var cue_rect := Rect2(Vector2(size.x - 58.0, 3.0), Vector2(55.0, 19.0))
	draw_rect(cue_rect, Color(0.02, 0.03, 0.04, 0.92), true)
	draw_rect(cue_rect, accent, false, 1.5)
	draw_string(font, cue_rect.position + Vector2(0.0, 14.0), intent, HORIZONTAL_ALIGNMENT_CENTER, cue_rect.size.x, 8, accent)

func _draw_state_flag(font: Font, label: String, icon: String, accent: Color) -> void:
	var flag := Rect2(Vector2(size.x - 52.0, 4.0), Vector2(47.0, 19.0))
	draw_rect(flag, Color(0.025, 0.03, 0.04, 0.92), true)
	draw_rect(flag, accent, false, 1.5)
	draw_string(font, flag.position + Vector2(0.0, 14.0), "%s %s" % [icon, label], HORIZONTAL_ALIGNMENT_CENTER, flag.size.x, 8, accent)

func _start_state_motion() -> void:
	if state_tween != null:
		state_tween.kill()
	state_tween = null
	self_modulate = Color.WHITE
	if get_visual_state() != &"ready" or bool(ProjectSettings.get_setting("accessibility/reduced_motion", false)):
		return
	state_tween = create_tween().set_loops()
	state_tween.tween_property(self, "self_modulate", Color(1.0, 0.91, 0.68), 0.42).set_trans(Tween.TRANS_SINE)
	state_tween.tween_property(self, "self_modulate", Color.WHITE, 0.42).set_trans(Tween.TRANS_SINE)

func _play_transition_motion() -> void:
	if transition_hint == &"":
		return
	if bool(ProjectSettings.get_setting("accessibility/reduced_motion", false)):
		queue_redraw()
		return
	pivot_offset = size * 0.5
	var tween := create_tween().set_parallel(true)
	match transition_hint:
		&"load":
			scale = Vector2(0.94, 0.94)
			tween.tween_property(self, "scale", Vector2.ONE, 0.14).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		&"charge":
			position.y += 5.0
			tween.tween_property(self, "position:y", position.y - 5.0, 0.13).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		&"activate":
			self_modulate = Color(1.0, 0.90, 0.55)
			tween.tween_property(self, "self_modulate", Color.WHITE, 0.18).set_trans(Tween.TRANS_QUAD)
		&"cleanup":
			self_modulate = Color(0.60, 0.74, 0.82)
			tween.tween_property(self, "self_modulate", Color.WHITE, 0.18).set_trans(Tween.TRANS_QUAD)

func _draw_charge_stack(font: Font, art_rect: Rect2, inset: float, stack_height: float) -> void:
	if loaded_charges.is_empty():
		return
	var stack_rect := Rect2(Vector2(inset + 2.0, art_rect.end.y - 2.0), Vector2(size.x - inset * 2.0 - 4.0, stack_height))
	var count: int = loaded_charges.size()
	var overlap: float = 5.0 if compact else 8.0
	var card_width: float = (stack_rect.size.x + overlap * float(count - 1)) / float(count)
	for index in count:
		var charged_card: Resource = loaded_charges[index]
		var card_rect := Rect2(
			Vector2(stack_rect.position.x + float(index) * (card_width - overlap), stack_rect.position.y + float(index % 2) * 2.0),
			Vector2(card_width, stack_rect.size.y - 2.0)
		)
		var fill := _fill_color_for_card(charged_card).lightened(0.10)
		var border := _border_color_for_card(charged_card).lightened(0.12)
		draw_rect(card_rect, fill, true)
		draw_rect(card_rect, border, false, 1.5)
		var keywords := _keyword_label(charged_card, 8 if compact else 16)
		draw_string(font, card_rect.position + Vector2(4.0, card_rect.size.y - 3.0), keywords, HORIZONTAL_ALIGNMENT_LEFT, card_rect.size.x - 8.0, 7 if compact else 10, Color(1.0, 0.96, 0.84))

func _slot_text() -> String:
	var top_card: Resource = slot_data.get("top_card")
	if top_card == null:
		if compact:
			return ""
		return "Slot %d: Empty\nDrop Card to Load" % (slot_index + 1)

	var charges: Array = slot_data.get("charges", [])
	if compact:
		return "%s  %s\n%s" % [
			_window_icon(top_card),
			_charge_pips(charges.size(), top_card.get_charge_cap()),
			_short_title(top_card.title, 11),
		]

	var charge_names: Array[String] = []
	for charged_card in charges:
		charge_names.append(charged_card.title)
	var charge_line := ", ".join(charge_names) if not charge_names.is_empty() else "-"
	return "Slot %d %s\n%s\nCharge %d/%d  %s" % [
		slot_index + 1,
		top_card.get_window_speed().capitalize(),
		top_card.title,
		charges.size(),
		top_card.get_charge_cap(),
		charge_line,
	]

func _slot_mark() -> String:
	var marks := [EMPTY_CHARGE_ICON, "◈", CHARGE_ICON, "✦"]
	if slot_index >= 0 and slot_index < marks.size():
		return marks[slot_index]
	return "+"

func _window_icon(card: Resource) -> String:
	return QUICK_ICON if card.get_window_speed() == &"quick" else SLOW_ICON

func _charge_pips(filled: int, cap: int) -> String:
	var pip_count: int = maxi(cap, 1)
	var pips: Array[String] = []
	for index in pip_count:
		pips.append(CHARGE_ICON if index < filled else EMPTY_CHARGE_ICON)
	return "".join(pips)

func _set_drop_hover(value: bool) -> void:
	if drop_hovered == value:
		return
	drop_hovered = value
	add_theme_stylebox_override("normal", _slot_style())
	add_theme_stylebox_override("hover", _slot_style(true))
	queue_redraw()

func _slot_style(hovered: bool = false, focused: bool = false) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	var fill := Color(0.10, 0.11, 0.13) if not selected else Color(0.20, 0.18, 0.14)
	var border := Color(0.42, 0.44, 0.48) if not selected else Color(0.88, 0.72, 0.34)
	if loaded_card != null:
		fill = _fill_color_for_card(loaded_card).darkened(0.08)
		border = _border_color_for_card(loaded_card)
		if ready_action:
			fill = fill.lightened(0.06)
			border = Color(1.0, 0.82, 0.28)
		if selected:
			border = Color(1.0, 0.86, 0.38)
	if hovered:
		fill = fill.lightened(0.05)
	if drop_hovered:
		fill = Color(0.18, 0.24, 0.20)
		border = Color(0.55, 0.84, 0.62)
	if focused:
		border = Color(1.0, 0.92, 0.50)
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(4 if focused else 2)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.28)
	style.shadow_size = 4
	style.content_margin_left = 8
	style.content_margin_top = 6
	style.content_margin_right = 8
	style.content_margin_bottom = 6
	return style

func _slot_tooltip() -> String:
	if loaded_card == null:
		return "Drop a hand card here to load this action slot."
	var charge_text := _charge_stack_tooltip()
	if ready_action:
		return "Ready to activate\n%s card\n%s%s" % [_get_type_label(loaded_card), loaded_card.rules_text, charge_text]
	return "%s card\n%s\n%s: window   %s: charges%s" % [_get_type_label(loaded_card), loaded_card.rules_text, QUICK_ICON, CHARGE_ICON, charge_text]

func _charge_stack_tooltip() -> String:
	if loaded_charges.is_empty():
		return "\nCharge stack: empty"
	var entries: Array[String] = []
	for charged_card: Resource in loaded_charges:
		entries.append("%s [%s]" % [charged_card.title, _keyword_label(charged_card, 48)])
	return "\nCharge stack:\n%s" % "\n".join(entries)

func _keyword_label(card: Resource, max_length: int) -> String:
	if card == null or card.tags.is_empty():
		return "Charge"
	var keywords: Array[String] = []
	for tag: StringName in card.tags:
		if tag != &"tank":
			keywords.append(String(tag).capitalize())
	if keywords.is_empty():
		keywords.append("Tank")
	return _short_title("/".join(keywords), max_length)

func _get_card_artwork(card: Resource) -> Texture2D:
	if card != null and card.has_method("get_artwork") and card.get_artwork() != null:
		return card.get_artwork()
	return PLACEHOLDER_ART

func _short_title(title: String, max_length: int) -> String:
	if title.length() <= max_length:
		return title
	return "%s..." % title.left(maxi(max_length - 3, 1))

func _get_card_type(card: Resource) -> StringName:
	if _has_tag(card, &"reaction"):
		return &"interrupt"
	if card.damage > 0 or card.boss_damage > 0 or _has_tag(card, &"attack"):
		return &"damage"
	if card.healing > 0 or _has_tag(card, &"support") or _has_tag(card, &"tempo"):
		return &"support"
	if card.presence_delta > 0 or card.target_type == 2 or _has_tag(card, &"presence"):
		return &"class"
	if card.armor_delta > 0 or _has_tag(card, &"guard") or _has_tag(card, &"threat"):
		return &"guard"
	return &"class"

func _get_type_icon(card: Resource) -> String:
	match _get_card_type(card):
		&"damage":
			return DAMAGE_ICON
		&"guard":
			return GUARD_ICON
		&"support":
			return SUPPORT_ICON
		&"interrupt":
			return INTERRUPT_ICON
		_:
			return CLASS_ICON

func _get_type_label(card: Resource) -> String:
	match _get_card_type(card):
		&"damage":
			return "Damage"
		&"guard":
			return "Guard"
		&"support":
			return "Support"
		&"interrupt":
			return "Interrupt"
		_:
			return "Class"

func _fill_color_for_card(card: Resource) -> Color:
	match _get_card_type(card):
		&"damage":
			return Color(0.25, 0.12, 0.10, 0.54)
		&"guard":
			return Color(0.13, 0.20, 0.17, 0.50)
		&"support":
			return Color(0.13, 0.17, 0.22, 0.50)
		&"interrupt":
			return Color(0.18, 0.13, 0.23, 0.50)
		_:
			return Color(0.20, 0.18, 0.13, 0.50)

func _border_color_for_card(card: Resource) -> Color:
	match _get_card_type(card):
		&"damage":
			return Color(0.92, 0.38, 0.28)
		&"guard":
			return Color(0.46, 0.72, 0.57)
		&"support":
			return Color(0.46, 0.68, 0.88)
		&"interrupt":
			return Color(0.72, 0.52, 0.90)
		_:
			return Color(0.86, 0.66, 0.32)

func _has_tag(card: Resource, tag: StringName) -> bool:
	return card != null and card.tags.has(tag)
