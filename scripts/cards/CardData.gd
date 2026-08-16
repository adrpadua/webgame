class_name CardData
extends Resource

const PlaceholderArt := preload("res://scripts/cards/PlaceholderCardArt.gd")

enum TargetType {
	NONE,
	HEX,
	BOARD_SLOT,
	PIECE
}

@export var id: StringName
@export var title: String = "Card"
@export_multiline var rules_text: String = ""
@export var speed: StringName = &"slow"
@export var max_charge: int = 2
@export var target_type: TargetType = TargetType.NONE
@export var artwork: Texture2D
@export var armor_delta: int = 0
@export var healing: int = 0
@export var boss_damage: int = 0
@export var presence_delta: int = 0
@export var range_tiles: int = 0
@export var damage: int = 0
@export var tags: Array[StringName] = []
@export var charge_modifiers: Array[Resource] = []

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
	if artwork != null:
		return artwork
	return PlaceholderArt.for_card_id(id)

func get_keyword_ids() -> Array[StringName]:
	return tags.duplicate()
