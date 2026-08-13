class_name ActionBarSlot
extends Button

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

func bind(index: int, data: Dictionary, is_selected: bool, is_compact: bool = false) -> void:
	slot_index = index
	slot_data = data
	selected = is_selected
	compact = is_compact
	loaded_card = slot_data.get("top_card")
	loaded_charges = slot_data.get("charges", [])
	ready_action = slot_data.get("ready_action", false)
	custom_minimum_size = Vector2(84, 78) if compact else Vector2(150, 104)
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	add_theme_color_override("font_color", Color(0.95, 0.93, 0.88))
	add_theme_font_size_override("font_size", 10 if compact else 13)
	add_theme_stylebox_override("normal", _slot_style())
	add_theme_stylebox_override("hover", _slot_style(true))
	add_theme_stylebox_override("focus", _slot_style(false, true))
	text = _slot_text() if loaded_card == null else ""
	tooltip_text = _slot_tooltip()

func _pressed() -> void:
	slot_pressed.emit(slot_index)

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
	_set_drop_hover(true)
	return true

func _drop_data(_at_position: Vector2, data: Variant) -> void:
	_set_drop_hover(false)
	var card: Resource = data.get("card")
	if card == null:
		return
	slot_pressed.emit(slot_index)
	card_dropped.emit(slot_index, card)

func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_END:
		_set_drop_hover(false)

func _draw() -> void:
	if loaded_card == null:
		return

	var inset := 6.0 if compact else 8.0
	var stack_height: float = 18.0 if compact else 26.0
	var art_rect := Rect2(Vector2(inset, inset), size - Vector2(inset * 2.0, inset * 2.0 + stack_height))
	var font := get_theme_default_font()
	_draw_charge_stack(font, art_rect, inset, stack_height)
	var artwork := _get_card_artwork(loaded_card)
	if artwork != null:
		draw_texture_rect(artwork, art_rect, false, Color(0.88, 0.82, 0.68, 0.86))
	draw_rect(art_rect, _fill_color_for_card(loaded_card), true)
	draw_rect(art_rect, Color(0.0, 0.0, 0.0, 0.30), true)
	draw_line(art_rect.position, art_rect.position + Vector2(art_rect.size.x, 0.0), _border_color_for_card(loaded_card).lightened(0.25), 2.0)

	var title := _short_title(loaded_card.title, 12 if compact else 18)
	var title_size := 10 if compact else 14
	var title_pos := Vector2(art_rect.position.x + 7.0, art_rect.end.y - (8.0 if compact else 10.0))
	draw_string(font, title_pos, title, HORIZONTAL_ALIGNMENT_LEFT, art_rect.size.x - 14.0, title_size, Color(0.98, 0.96, 0.90))

	var top_line := "%s %s  %s" % [
		_window_icon(loaded_card),
		_charge_pips(loaded_charges.size(), loaded_card.get_charge_cap()),
		_get_type_icon(loaded_card),
	]
	var top_size := 9 if compact else 12
	var top_pos := art_rect.position + Vector2(7.0, 14.0 if compact else 18.0)
	draw_string(font, top_pos, top_line, HORIZONTAL_ALIGNMENT_LEFT, art_rect.size.x - 14.0, top_size, Color(1.0, 0.94, 0.80))

	if selected:
		draw_rect(art_rect.grow(-1.0), Color(1.0, 0.92, 0.50, 0.20), false, 2.0)
	if ready_action:
		draw_rect(art_rect.grow(1.0), Color(1.0, 0.82, 0.28, 0.34), false, 3.0)
		draw_string(font, art_rect.position + Vector2(art_rect.size.x - 30.0, art_rect.size.y * 0.55), "▶", HORIZONTAL_ALIGNMENT_CENTER, 24.0, 18 if compact else 22, Color(1.0, 0.88, 0.45))

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
		draw_string(font, card_rect.position + Vector2(4.0, card_rect.size.y - 4.0), keywords, HORIZONTAL_ALIGNMENT_LEFT, card_rect.size.x - 8.0, 8 if compact else 10, Color(1.0, 0.96, 0.84))

func _slot_text() -> String:
	var top_card: Resource = slot_data.get("top_card")
	if top_card == null:
		if compact:
			return "%s Load\n%s" % [_slot_mark(), _charge_pips(0, 2)]
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
	var fill := Color(0.15, 0.15, 0.16) if not selected else Color(0.20, 0.18, 0.14)
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
