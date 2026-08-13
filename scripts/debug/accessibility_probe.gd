extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const MIN_TOUCH_TARGET := Vector2(44, 44)
const MIN_COMMAND_HEIGHT := 48.0

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	main._apply_viewport_size(Vector2(390, 844))
	await process_frame

	var interactive_controls: Array[Control] = []
	_collect_interactive_controls(main, interactive_controls)
	for control in interactive_controls:
		_assert_touch_target(control)
		_assert_visible_focus(control)

	_assert_contrast(Color(0.98, 0.97, 0.92), Color(0.20, 0.32, 0.24), "normal command text")
	_assert_contrast(Color.WHITE, Color(0.25, 0.38, 0.28), "hover command text")
	_assert_contrast(Color(0.70, 0.70, 0.72), Color(0.15, 0.15, 0.16), "disabled command text")
	_assert_contrast(Color(1.0, 0.92, 0.50), Color(0.20, 0.32, 0.24), "focus treatment")
	print("ACCESSIBILITY_PROBE_OK controls=%d" % interactive_controls.size())
	quit()

func _collect_interactive_controls(node: Node, result: Array[Control]) -> void:
	if node is Button and node.visible and not node.disabled:
		result.append(node)
	for child in node.get_children():
		_collect_interactive_controls(child, result)

func _assert_touch_target(control: Control) -> void:
	var target_size := control.get_global_rect().size
	assert(
		target_size.x >= MIN_TOUCH_TARGET.x and target_size.y >= MIN_TOUCH_TARGET.y,
		"%s must have a %dx%d px target; got %s." % [control.get_path(), MIN_TOUCH_TARGET.x, MIN_TOUCH_TARGET.y, target_size]
	)

func _assert_visible_focus(control: Control) -> void:
	var focus_style: StyleBox = control.get_theme_stylebox("focus")
	assert(focus_style != null and not focus_style is StyleBoxEmpty, "%s must expose a visible focus treatment." % control.get_path())

func _assert_contrast(foreground: Color, background: Color, label: String) -> void:
	var ratio := _contrast_ratio(foreground, background)
	assert(ratio >= 4.5, "%s contrast must meet 4.5:1; got %.2f:1." % [label, ratio])

func _contrast_ratio(first: Color, second: Color) -> float:
	var first_luminance := _relative_luminance(first)
	var second_luminance := _relative_luminance(second)
	return (maxf(first_luminance, second_luminance) + 0.05) / (minf(first_luminance, second_luminance) + 0.05)

func _relative_luminance(color: Color) -> float:
	return 0.2126 * _linear_channel(color.r) + 0.7152 * _linear_channel(color.g) + 0.0722 * _linear_channel(color.b)

func _linear_channel(channel: float) -> float:
	return channel / 12.92 if channel <= 0.03928 else pow((channel + 0.055) / 1.055, 2.4)
