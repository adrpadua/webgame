class_name CardData
extends Resource

const PLACEHOLDER_ART := preload("res://assets/art/prototype/paladin-placeholder.png")
const ART_BY_CARD_ID := {
	&"anchor_presence": preload("res://assets/art/prototype/paladin/tether.webp"),
	&"fortify": preload("res://assets/art/prototype/paladin/shield.webp"),
	&"guard_stance": preload("res://assets/art/prototype/paladin/invuln.webp"),
	&"intercept": preload("res://assets/art/prototype/paladin/interrupt.webp"),
	&"iron_guard": preload("res://assets/art/prototype/paladin/shield.webp"),
	&"rallying_cry": preload("res://assets/art/prototype/paladin/taunt.webp"),
	&"shield_slam": preload("res://assets/art/prototype/paladin/aoe.webp"),
	&"steady_strike": preload("res://assets/art/prototype/paladin/strike.webp"),
	&"sweeping_blow": preload("res://assets/art/prototype/paladin/aoe.webp"),
	&"taunting_challenge": preload("res://assets/art/prototype/paladin/taunt.webp"),
	&"unyielding_step": preload("res://assets/art/prototype/paladin/gapclose.webp"),
}

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
	return ART_BY_CARD_ID.get(id, PLACEHOLDER_ART)

func get_keyword_ids() -> Array[StringName]:
	return tags.duplicate()
