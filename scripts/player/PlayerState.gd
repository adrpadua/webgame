class_name PlayerState
extends Node

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

signal hand_changed
signal resources_changed
signal board_changed
signal health_changed
signal facing_changed
signal action_bar_changed

@export var hero_name: String = "Aegis Guardian"
@export var role: StringName = &"tank"
@export var max_hand_size: int = 4
@export var max_health: int = 34
@export var slot_count: int = 2

var health: int = 0
var armor: int = 0
var presence: int = 1
var facing: int = FacingDirections.Direction.NORTH_EAST
var deck: Array = []
var discard: Array = []
var hand: Array = []
var board_slots: Array = []
var action_bar: Array = []
var current_window: StringName = &"none"

var _engine
var _hero_id: StringName = &""

func bind_engine(engine, hero_id: StringName) -> void:
	_engine = engine
	_hero_id = hero_id
	sync_from_engine()

func sync_from_engine() -> void:
	if _engine == null:
		return
	var hero: Dictionary = _engine.get_hero(_hero_id)
	if hero.is_empty():
		return
	health = int(hero.get("health", 0))
	max_health = int(hero.get("max_health", max_health))
	armor = int(hero.get("armor", 0))
	presence = int(hero.get("presence", 0))
	deck = hero.get("deck", []).duplicate()
	discard = hero.get("discard", []).duplicate()
	hand = hero.get("hand", []).duplicate()
	action_bar = hero.get("action_bar", []).duplicate(true)
	max_hand_size = int(hero.get("refill_target", max_hand_size))
	slot_count = action_bar.size()
	current_window = _engine.phase if _engine.phase in [&"loadout", &"quick", &"slow"] else &"none"
	var entity: Dictionary = _engine.board.get_entity(_hero_id)
	if not entity.is_empty():
		hero_name = str(entity.get("title", hero_name))
		facing = int(entity.get("facing", facing))
	hand_changed.emit()
	resources_changed.emit()
	board_changed.emit()
	health_changed.emit()
	facing_changed.emit()
	action_bar_changed.emit()

# Compatibility helpers submit actions to the authoritative engine. They do not resolve rules here.
func prepare_slot(slot_index: int, card: Resource) -> bool:
	return _submit(EncounterActionModel.load_slot(_hero_id, slot_index, card))

func charge_slot(slot_index: int, card: Resource) -> bool:
	return _submit(EncounterActionModel.charge_slot(_hero_id, slot_index, card))

func activate_slot(slot_index: int, context: Dictionary = {}) -> bool:
	var target_id: StringName = &""
	var target = context.get("target")
	if target != null:
		target_id = target.get("piece_id") if target.get("piece_id") != null else &""
	return _submit(EncounterActionModel.fire_slot(_hero_id, slot_index, target_id))

func get_activation_error(slot_index: int, context: Dictionary = {}) -> String:
	if slot_index < 0 or slot_index >= action_bar.size():
		return "Select an action-bar slot."
	var slot: Dictionary = action_bar[slot_index]
	var top_card: Resource = slot.get("top_card")
	if top_card == null:
		return "That action-bar slot is empty."
	if slot.get("charges", []).is_empty():
		return "Charge %s with a hand card before activating it." % top_card.title
	if top_card.get_window_speed() != current_window:
		return "%s is a %s card." % [top_card.title, top_card.get_window_speed().capitalize()]
	if slot.get("activated_window", &"") == current_window:
		return "%s has already activated this window." % top_card.title
	return top_card.get_target_error(context)

func get_slot(slot_index: int) -> Dictionary:
	if slot_index < 0 or slot_index >= action_bar.size():
		return {}
	return action_bar[slot_index]

func get_facing_name() -> String:
	return FacingDirections.name_for(facing)

func _submit(action) -> bool:
	if _engine == null:
		return false
	var resolved = _engine.apply(action)
	sync_from_engine()
	return resolved.succeeded
