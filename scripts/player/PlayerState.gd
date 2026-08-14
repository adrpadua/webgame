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

@export var hero_name: String = "Elian Voss"
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
var _stream_cursor: int = 0
var _pending_slot_transitions: Dictionary = {}

func bind_engine(engine, hero_id: StringName) -> void:
	_engine = engine
	_hero_id = hero_id
	_stream_cursor = 0
	_pending_slot_transitions.clear()
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
	_fold_slot_transitions()
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

# Folds this Hero's Slot actions off the engine's stream into presentation
# transition cues (ADR 0015). Consumed once per read by the Action Bar view.
func _fold_slot_transitions() -> void:
	while _stream_cursor < _engine.history.size():
		var action = _engine.history[_stream_cursor]
		_stream_cursor += 1
		if not action.succeeded or action.source_id != _hero_id:
			continue
		var slot_index: int = int(action.payload.get("slot_index", -1))
		if slot_index < 0:
			continue
		match action.kind:
			EncounterActionModel.Kind.LOAD_SLOT:
				_pending_slot_transitions[slot_index] = &"load"
			EncounterActionModel.Kind.CHARGE_SLOT:
				_pending_slot_transitions[slot_index] = &"charge"
			EncounterActionModel.Kind.FIRE_SLOT:
				_pending_slot_transitions[slot_index] = &"activate"
			EncounterActionModel.Kind.FULL_CHARGE_CLEANUP:
				_pending_slot_transitions[slot_index] = &"cleanup"

func take_slot_transitions() -> Dictionary:
	var transitions := _pending_slot_transitions.duplicate()
	_pending_slot_transitions.clear()
	return transitions

# Legality delegations ask the authoritative engine; no rules are restated here.
func project_intent(slot_index: int, card: Resource) -> StringName:
	if _engine == null or card == null:
		return &""
	if _engine.legality(EncounterActionModel.load_slot(_hero_id, slot_index, card))["legal"]:
		return &"replace" if get_slot(slot_index).get("top_card") != null else &"load"
	if _engine.legality(EncounterActionModel.charge_slot(_hero_id, slot_index, card))["legal"]:
		return &"charge"
	return &""

func can_project_card(slot_index: int, card: Resource) -> bool:
	return project_intent(slot_index, card) != &""

func has_legal_fire(slot_index: int) -> bool:
	if _engine == null:
		return false
	for action in _engine.legal_actions(_hero_id):
		if action.kind == EncounterActionModel.Kind.FIRE_SLOT and int(action.payload.get("slot_index", -1)) == slot_index:
			return true
	return false

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
