class_name CardButton
extends Button

signal card_selected(card)
signal inspection_started(card)
signal inspection_ended(card)

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

func bind(new_card: Resource) -> void:
	card = new_card
	var title: String = card.title
	if title.length() > 12:
		title = "%s..." % title.left(9)
	text = "%s %s %s\n%s" % [_get_type_icon(), _get_type_short_label(), title, _get_stat_icon_row()]
	tooltip_text = "%s card\n%s\n%s: window   %s: charge capacity" % [_get_type_label(), card.rules_text, QUICK_ICON, CHARGE_ICON]
	clip_text = true
	text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	custom_minimum_size = Vector2(124, 56)
	size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	add_theme_color_override("font_color", Color(0.95, 0.93, 0.88))
	add_theme_font_size_override("font_size", 12)
	add_theme_stylebox_override("normal", _make_style(_fill_color_for_card(), _border_color_for_card()))
	add_theme_stylebox_override("hover", _make_style(_fill_color_for_card().lightened(0.08), _border_color_for_card().lightened(0.12)))
	add_theme_stylebox_override("pressed", _make_style(_fill_color_for_card().darkened(0.08), _border_color_for_card()))
	add_theme_stylebox_override("focus", _make_style(_fill_color_for_card(), Color(1.0, 0.92, 0.50), true))

func _pressed() -> void:
	card_selected.emit(card)

func _get_drag_data(_at_position: Vector2) -> Variant:
	if card == null:
		return null
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
	drag_started = false
	if inspecting:
		inspection_ended.emit(card)
		inspecting = false

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
	preview.text = text
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
