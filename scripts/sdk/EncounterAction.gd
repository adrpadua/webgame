class_name EncounterAction
extends RefCounted

enum Kind {
	LOAD_SLOT,
	CHARGE_SLOT,
	FIRE_SLOT,
	MOVE_HERO,
	RESOLVE_BOSS,
	APPLY_HAZARD,
	SPAWN_MINION,
	DAMAGE,
	DISCARD_FOR_STAMINA,
	EXPIRE_STATUS,
}

var kind: Kind
var source_id: StringName = &""
var payload: Dictionary = {}
var succeeded: bool = false
var reason: String = ""
var generated_actions: Array = []

static func load_slot(hero_id: StringName, slot_index: int, card) -> EncounterAction:
	return _make(Kind.LOAD_SLOT, hero_id, {"slot_index": slot_index, "card": card})

static func charge_slot(hero_id: StringName, slot_index: int, card) -> EncounterAction:
	return _make(Kind.CHARGE_SLOT, hero_id, {"slot_index": slot_index, "card": card})

static func fire_slot(hero_id: StringName, slot_index: int, target_id: StringName = &"") -> EncounterAction:
	return _make(Kind.FIRE_SLOT, hero_id, {"slot_index": slot_index, "target_id": target_id})

static func move_hero(hero_id: StringName, destination: Vector2i, card = null) -> EncounterAction:
	return _make(Kind.MOVE_HERO, hero_id, {"destination": destination, "card": card})

static func resolve_boss(boss_id: StringName, beat, track: StringName) -> EncounterAction:
	return _make(Kind.RESOLVE_BOSS, boss_id, {"beat": beat, "track": track})

static func apply_hazard(source_id: StringName, coords: Vector2i, hazard) -> EncounterAction:
	return _make(Kind.APPLY_HAZARD, source_id, {"coords": coords, "hazard": hazard})

static func spawn_minion(source_id: StringName, minion_id: StringName, coords: Vector2i, minion = null) -> EncounterAction:
	return _make(Kind.SPAWN_MINION, source_id, {"minion_id": minion_id, "coords": coords, "minion": minion})

static func damage(source_id: StringName, target_id: StringName, amount: int, reason_text: String = "", fact_context: Dictionary = {}) -> EncounterAction:
	var payload := {"target_id": target_id, "amount": amount, "reason_text": reason_text}
	if not fact_context.is_empty():
		payload["fact_context"] = fact_context.duplicate(true)
	return _make(Kind.DAMAGE, source_id, payload)

static func discard_for_stamina(hero_id: StringName, card) -> EncounterAction:
	return _make(Kind.DISCARD_FOR_STAMINA, hero_id, {"card": card})

static func expire_status(entity_id: StringName, status_id: StringName, window: StringName, event: Dictionary) -> EncounterAction:
	return _make(Kind.EXPIRE_STATUS, entity_id, {"target_id": entity_id, "status_id": status_id, "window": window, "status_event": event.duplicate(true)})

static func _make(new_kind: Kind, new_source_id: StringName, new_payload: Dictionary) -> EncounterAction:
	var action = load("res://scripts/sdk/EncounterAction.gd").new()
	action.kind = new_kind
	action.source_id = new_source_id
	action.payload = new_payload
	return action

func resolve_success() -> void:
	succeeded = true
	reason = ""

func resolve_failure(message: String) -> void:
	succeeded = false
	reason = message
