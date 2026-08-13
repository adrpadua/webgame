class_name CardButton
extends Button

signal card_selected(card)
signal inspection_started(card)
signal inspection_ended(card)
signal card_drag_started(card)
signal card_drag_ended(card)

const HOLD_TO_INSPECT_SECONDS := 0.38
const QUICK_ICON := "⚡"
const SLOW_ICON := "◷"
const CHARGE_ICON := "◆"
const ENERGY_ICON := "✦"
const FREE_ICON := "○"
const DAMAGE_ICON := "⚔"
const GUARD_ICON := "◉"
const SUPPORT_ICON := "✚"
const INTERRUPT_ICON := "⇄"
const CLASS_ICON := "◈"

var card: Resource
var pointer_active: bool = false
var press_position: Vector2 = Vector2.ZERO
var drag_started: bool = false
var inspecting: bool = false
var hold_timer: SceneTreeTimer
var selected: bool = false

func bind(new_card: Resource) -> void:
	card = new_card
	text = ""
	tooltip_text = "%s card\n%s\n%s: window   %s: charge capacity" % [_get_type_label(), card.rules_text, QUICK_ICON, CHARGE_ICON]
	custom_minimum_size = Vector2(112, 116)
	size = custom_minimum_size
	size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	add_theme_color_override("font_color", Color(0.95, 0.93, 0.88))
	add_theme_stylebox_override("normal", _make_style(_fill_color_for_card(), _border_color_for_card()))
	add_theme_stylebox_override("hover", _make_style(_fill_color_for_card().lightened(0.08), _border_color_for_card().lightened(0.12)))
	add_theme_stylebox_override("pressed", _make_style(_fill_color_for_card().darkened(0.08), _border_color_for_card()))
	add_theme_stylebox_override("focus", _make_style(_fill_color_for_card(), Color(1.0, 0.92, 0.50), true))
	queue_redraw()

func _draw() -> void:
	if card == null:
		return
	var inset := 5.0
	var art_rect := Rect2(Vector2(inset, inset), size - Vector2(inset * 2.0, inset * 2.0))
	var title_band := Rect2(Vector2(art_rect.position.x, art_rect.end.y - 34.0), Vector2(art_rect.size.x, 34.0))
	var timing_badge := Rect2(art_rect.position + Vector2(5.0, 5.0), Vector2(28.0, 20.0))
	var type_badge := Rect2(Vector2(art_rect.end.x - 39.0, art_rect.position.y + 5.0), Vector2(34.0, 20.0))
	var font := get_theme_default_font()
	var artwork: Texture2D = card.get_artwork() if card.has_method("get_artwork") else null
	if artwork != null:
		draw_texture_rect(artwork, art_rect, false)
	else:
		draw_rect(art_rect, _fill_color_for_card(), true)
	draw_rect(art_rect, Color(0.02, 0.02, 0.03, 0.18), true)
	draw_rect(title_band, Color(0.015, 0.018, 0.025, 0.88), true)
	draw_rect(timing_badge, Color(0.06, 0.07, 0.09, 0.92), true)
	draw_rect(timing_badge, Color(1.0, 0.78, 0.33), false, 1.5)
	draw_string(font, timing_badge.position + Vector2(0.0, 15.0), _get_timing_badge(), HORIZONTAL_ALIGNMENT_CENTER, timing_badge.size.x, 11, Color(1.0, 0.90, 0.67))
	draw_rect(type_badge, _border_color_for_card(), true)
	draw_string(font, type_badge.position + Vector2(0.0, 15.0), _get_type_icon(), HORIZONTAL_ALIGNMENT_CENTER, type_badge.size.x, 12, Color.WHITE)
	var display_title: String = card.title if selected else _short_title(card.title, 16)
	var title_size := _fit_font_size(font, display_title, title_band.size.x - 14.0, 11, 7)
	draw_string(font, title_band.position + Vector2(7.0, 14.0), display_title, HORIZONTAL_ALIGNMENT_LEFT, title_band.size.x - 14.0, title_size, Color(1.0, 0.97, 0.89))
	draw_string(font, title_band.position + Vector2(7.0, 28.0), _get_stat_icon_row(), HORIZONTAL_ALIGNMENT_LEFT, title_band.size.x - 14.0, 10, Color(1.0, 0.87, 0.57))
	draw_rect(art_rect, _border_color_for_card(), false, 2.0)
	if selected:
		draw_rect(art_rect.grow(1.0), Color(1.0, 0.92, 0.50), false, 3.0)

func set_selected(value: bool) -> void:
	if selected == value:
		return
	selected = value
	queue_redraw()

func _pressed() -> void:
	card_selected.emit(card)

func _get_drag_data(_at_position: Vector2) -> Variant:
	if card == null:
		return null
	if not drag_started:
		drag_started = true
		card_drag_started.emit(card)
	var preview := _build_drag_preview()
	set_drag_preview(preview)
	return _build_drag_payload()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_begin_press(event.position)
		else:
			_end_press()
	elif event is InputEventScreenTouch:
		if event.pressed:
			_begin_press(event.position)
		else:
			_end_press()
	elif event is InputEventMouseMotion and pointer_active:
		if not drag_started and press_position.distance_to(event.position) > 10.0:
			_begin_touch_drag()
	elif event is InputEventScreenDrag and pointer_active:
		if not drag_started and press_position.distance_to(event.position) > 10.0:
			_begin_touch_drag()

func _input(event: InputEvent) -> void:
	if not pointer_active:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
		_end_press()
	elif event is InputEventScreenTouch and not event.pressed:
		_end_press()

func _begin_touch_drag() -> void:
	if card == null:
		return
	drag_started = true
	card_drag_started.emit(card)
	if inspecting:
		inspection_ended.emit(card)
		inspecting = false
	force_drag(_build_drag_payload(), _build_drag_preview())

func _begin_press(position: Vector2) -> void:
	pointer_active = true
	press_position = position
	drag_started = false
	inspecting = false
	hold_timer = get_tree().create_timer(HOLD_TO_INSPECT_SECONDS)
	hold_timer.timeout.connect(_on_hold_timer_elapsed)

func _end_press() -> void:
	pointer_active = false
	_finish_drag()
	if inspecting:
		inspection_ended.emit(card)
		inspecting = false

func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_END and drag_started:
		_finish_drag()

func _finish_drag() -> void:
	if not drag_started:
		return
	drag_started = false
	card_drag_ended.emit(card)

func _on_hold_timer_elapsed() -> void:
	if not pointer_active or drag_started or card == null:
		return
	inspecting = true
	inspection_started.emit(card)

func _build_drag_payload() -> Dictionary:
	return {
		"kind": "hand_card",
		"card": card,
	}

func _build_drag_preview() -> Control:
	var preview := Button.new()
	preview.text = card.title
	preview.custom_minimum_size = custom_minimum_size
	preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
	preview.add_theme_color_override("font_color", Color(0.97, 0.95, 0.90))
	preview.add_theme_font_size_override("font_size", 12)
	preview.add_theme_stylebox_override("normal", _make_style(_fill_color_for_card().lightened(0.12), _border_color_for_card().lightened(0.12)))
	return preview

func _get_stat_icon_row() -> String:
	var speed_icon := QUICK_ICON if card.get_window_speed() == &"quick" else SLOW_ICON
	return "%s  %s" % [
		speed_icon,
		_repeat_icon(CHARGE_ICON, card.get_charge_cap()),
	]

func _get_timing_badge() -> String:
	return QUICK_ICON if card.get_window_speed() == &"quick" else SLOW_ICON

func _short_title(title: String, max_length: int) -> String:
	if title.length() <= max_length:
		return title
	return "%s..." % title.left(maxi(max_length - 3, 1))

func _fit_font_size(font: Font, value: String, available_width: float, preferred: int, minimum: int) -> int:
	var result := preferred
	while result > minimum and font.get_string_size(value, HORIZONTAL_ALIGNMENT_LEFT, -1, result).x > available_width:
		result -= 1
	return result

func _get_card_type() -> StringName:
	if _has_tag(&"reaction"):
		return &"interrupt"
	if card.damage > 0 or card.boss_damage > 0 or _has_tag(&"attack"):
		return &"damage"
	if card.healing > 0 or _has_tag(&"support") or _has_tag(&"tempo"):
		return &"support"
	if card.presence_delta > 0 or card.target_type == 2 or _has_tag(&"presence"):
		return &"class"
	if card.armor_delta > 0 or _has_tag(&"guard") or _has_tag(&"threat"):
		return &"guard"
	return &"class"

func _get_type_icon() -> String:
	match _get_card_type():
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

func _get_type_label() -> String:
	match _get_card_type():
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

func _get_type_short_label() -> String:
	match _get_card_type():
		&"damage":
			return "DMG"
		&"guard":
			return "GRD"
		&"support":
			return "SUP"
		&"interrupt":
			return "INT"
		_:
			return "CLS"

func _has_tag(tag: StringName) -> bool:
	return card != null and card.tags.has(tag)

func _repeat_icon(icon: String, count: int, empty_icon: String = "") -> String:
	if count <= 0:
		return empty_icon
	var icons: Array[String] = []
	for _index in count:
		icons.append(icon)
	return "".join(icons)

func _make_style(fill: Color, border: Color, focused: bool = false) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(4 if focused else 2)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.32)
	style.shadow_size = 4
	style.content_margin_left = 10
	style.content_margin_right = 10
	style.content_margin_top = 3
	style.content_margin_bottom = 3
	return style

func _fill_color_for_card() -> Color:
	match _get_card_type():
		&"damage":
			return Color(0.25, 0.12, 0.10)
		&"guard":
			return Color(0.13, 0.20, 0.17)
		&"support":
			return Color(0.13, 0.17, 0.22)
		&"interrupt":
			return Color(0.18, 0.13, 0.23)
		_:
			return Color(0.20, 0.18, 0.13)

func _border_color_for_card() -> Color:
	match _get_card_type():
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
