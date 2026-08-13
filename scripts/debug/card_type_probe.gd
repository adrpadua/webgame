extends SceneTree

const CardButtonScene := preload("res://scripts/ui/CardButton.gd")

var failures: Array[String] = []

func _initialize() -> void:
	_assert_card_type("res://resources/cards/tank/shield_slam.tres", "Damage", "⚔", Color(0.92, 0.38, 0.28))
	_assert_card_type("res://resources/cards/tank/guard_stance.tres", "Guard", "◉", Color(0.46, 0.72, 0.57))
	_assert_card_type("res://resources/cards/tank/rallying_cry.tres", "Support", "✚", Color(0.46, 0.68, 0.88))
	_assert_card_type("res://resources/cards/tank/intercept.tres", "Interrupt", "⇄", Color(0.72, 0.52, 0.90))
	_assert_card_type("res://resources/cards/tank/anchor_presence.tres", "Class", "◈", Color(0.86, 0.66, 0.32))

	if failures.is_empty():
		print("CARD_TYPE_PROBE_OK")
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _assert_card_type(path: String, expected_label: String, expected_icon: String, expected_border: Color) -> void:
	var button := CardButtonScene.new()
	button.bind(load(path))
	if not button.tooltip_text.begins_with("%s card" % expected_label):
		failures.append("%s should be classified as %s; tooltip was %s." % [path, expected_label, button.tooltip_text])
	if not button.text.begins_with(expected_icon):
		failures.append("%s should include %s as the leading type icon; text was %s." % [path, expected_icon, button.text])
	var style: StyleBoxFlat = button.get_theme_stylebox("normal")
	if style.border_color != expected_border:
		failures.append("%s should use %s border, got %s." % [path, expected_label, style.border_color])
	button.queue_free()
