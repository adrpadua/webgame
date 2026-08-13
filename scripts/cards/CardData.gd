class_name CardData
extends Resource

enum TargetType {
	NONE,
	HEX,
	BOARD_SLOT,
	PIECE
}

@export var id: StringName
@export var title: String = "Card"
@export_multiline var rules_text: String = ""
@export var cost: int = 0
@export var speed: StringName = &"slow"
@export var max_charge: int = 2
@export var target_type: TargetType = TargetType.NONE
@export var artwork: Texture2D
@export var energy_delta: int = 0
@export var armor_delta: int = 0
@export var healing: int = 0
@export var boss_damage: int = 0
@export var presence_delta: int = 0
@export var range_tiles: int = 0
@export var damage: int = 0
@export var tags: Array[StringName] = []
@export var charge_armor_per_card: int = 0
@export var charge_healing_per_card: int = 0
@export var charge_boss_damage_per_card: int = 0
@export var charge_target_damage_per_card: int = 0

func can_pay(player) -> bool:
	return player.energy >= cost

func get_window_speed() -> StringName:
	if speed == &"fast":
		return &"quick"
	if speed == &"slow":
		return &"slow"
	return speed

func get_charge_cap() -> int:
	if max_charge > 0:
		return max_charge
	return 3 if get_window_speed() == &"slow" else 2

func get_artwork() -> Texture2D:
	return artwork

func get_target_error(context: Dictionary) -> String:
	match target_type:
		TargetType.HEX:
			if context.get("tile") == null:
				return "Select a hex for %s." % title
		TargetType.PIECE:
			var target = context.get("target")
			if target == null:
				return "Select a minion target for %s." % title
			if target.get("piece_owner") != &"enemy":
				return "%s must target a minion." % title
	return ""

func apply(player, context: Dictionary) -> void:
	var charge_stack: Array = context.get("charge_stack", [])
	var charge_bonus: int = charge_stack.size()
	var keyword_bonus: int = _matching_keyword_count(charge_stack)
	var total_bonus: int = charge_bonus + keyword_bonus

	player.energy -= cost
	if energy_delta != 0:
		player.energy += energy_delta + keyword_bonus
	if armor_delta != 0:
		player.gain_armor(armor_delta + total_bonus)
	if healing != 0:
		player.heal(healing + total_bonus)
	if presence_delta != 0:
		player.gain_presence(presence_delta)

	var target: Variant = context.get("target")
	var boss: Variant = context.get("boss")
	if damage > 0 and target != null and target.has_method("take_damage"):
		target.take_damage(damage + total_bonus)
	if boss_damage > 0 and boss != null and boss.has_method("take_damage"):
		boss.take_damage(boss_damage + total_bonus)

func _matching_keyword_count(charge_stack: Array) -> int:
	if tags.is_empty():
		return 0
	var matches := 0
	for charged_card in charge_stack:
		if charged_card == null:
			continue
		for tag in charged_card.tags:
			if tags.has(tag):
				matches += 1
				break
	return matches
