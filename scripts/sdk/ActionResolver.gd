class_name ActionResolver
extends RefCounted

const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")
const CardResolverModel := preload("res://scripts/sdk/CardResolver.gd")
const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")
const StatusEffectModel := preload("res://scripts/sdk/StatusEffect.gd")

var card_resolver := CardResolverModel.new()

func resolve(engine, action) -> Array:
	if not engine.active:
		action.resolve_failure("The Encounter has already ended.")
		return []
	match action.kind:
		EncounterActionModel.Kind.LOAD_SLOT:
			_load_slot(engine, action)
		EncounterActionModel.Kind.CHARGE_SLOT:
			_charge_slot(engine, action)
		EncounterActionModel.Kind.FIRE_SLOT:
			return _fire_slot(engine, action)
		EncounterActionModel.Kind.MOVE_HERO:
			return _move_hero(engine, action)
		EncounterActionModel.Kind.RESOLVE_BOSS:
			return _resolve_boss(engine, action)
		EncounterActionModel.Kind.APPLY_HAZARD:
			_apply_hazard(engine, action)
		EncounterActionModel.Kind.SPAWN_MINION:
			_spawn_minion(engine, action)
		EncounterActionModel.Kind.DAMAGE:
			return _damage(engine, action)
		EncounterActionModel.Kind.DISCARD_FOR_STAMINA:
			_discard_for_stamina(engine, action)
		EncounterActionModel.Kind.EXPIRE_STATUS:
			_expire_status(engine, action)
	return []

func _load_slot(engine, action) -> void:
	var hero: Dictionary = engine.get_hero(action.source_id)
	var slot_index: int = action.payload.get("slot_index", -1)
	var card = action.payload.get("card")
	if hero.is_empty() or card == null or not hero["hand"].has(card):
		action.resolve_failure("The chosen hand card is unavailable.")
		return
	if slot_index < 0 or slot_index >= hero["action_bar"].size() or engine.phase != &"loadout" and engine.phase != &"quick" and engine.phase != &"slow":
		action.resolve_failure("Loading a Slot requires a legal Slot during Loadout, Quick, or Slow.")
		return
	var slot: Dictionary = hero["action_bar"][slot_index]
	if slot["top_card"] != null and engine.phase != &"loadout":
		action.resolve_failure("Replacing a Slot is only allowed during Loadout.")
		return
	hero["hand"].erase(card)
	if slot["top_card"] != null:
		hero["discard"].append(slot["top_card"])
		for charged_card in slot["charges"]:
			hero["discard"].append(charged_card)
	slot["top_card"] = card
	slot["charges"] = []
	slot["activated_window"] = &""
	hero["action_bar"][slot_index] = slot
	engine.put_hero(action.source_id, hero)
	action.resolve_success()

func _charge_slot(engine, action) -> void:
	var hero: Dictionary = engine.get_hero(action.source_id)
	var slot_index: int = action.payload.get("slot_index", -1)
	var card = action.payload.get("card")
	if hero.is_empty() or card == null or not hero["hand"].has(card):
		action.resolve_failure("The chosen hand card is unavailable.")
		return
	if slot_index < 0 or slot_index >= hero["action_bar"].size() or engine.phase != &"quick" and engine.phase != &"slow":
		action.resolve_failure("Charging requires a legal Slot during Quick or Slow.")
		return
	var slot: Dictionary = hero["action_bar"][slot_index]
	if slot["top_card"] == null or slot["activated_window"] == engine.phase or slot["charges"].size() >= slot["top_card"].get_charge_cap():
		action.resolve_failure("That Slot cannot accept another charge.")
		return
	hero["hand"].erase(card)
	slot["charges"].append(card)
	hero["action_bar"][slot_index] = slot
	engine.put_hero(action.source_id, hero)
	action.resolve_success()

func _fire_slot(engine, action) -> Array:
	var hero: Dictionary = engine.get_hero(action.source_id)
	var slot_index: int = action.payload.get("slot_index", -1)
	if hero.is_empty() or slot_index < 0 or slot_index >= hero["action_bar"].size():
		action.resolve_failure("Select a legal Slot.")
		return []
	var slot: Dictionary = hero["action_bar"][slot_index]
	var card = slot["top_card"]
	if card == null or slot["charges"].is_empty():
		action.resolve_failure("A loaded Slot needs at least one charged card.")
		return []
	if slot["activated_window"] == engine.phase:
		action.resolve_failure("A Slot may fire only once in its matching window.")
		return []
	if card.get_window_speed() != engine.phase:
		action.resolve_failure("The Top Card cannot fire in this window.")
		return []
	if card.damage > 0:
		var target_id: StringName = action.payload.get("target_id", &"")
		var target: Dictionary = engine.board.get_entity(target_id)
		var source: Dictionary = engine.board.get_entity(action.source_id)
		if target.is_empty() or target.get("kind") != &"minion":
			action.resolve_failure("The Top Card needs a Minion target.")
			return []
		var target_range := BoardQueryModel.hex_distance(source.get("coords"), target.get("coords"))
		action.payload["target_range"] = target_range
		if target_range > card.range_tiles:
			action.resolve_failure("The chosen Minion is outside the Top Card's range.")
			return []
	var effects := card_resolver.resolve_fire(card, slot["charges"])
	var base_boss_damage: int = int(effects["boss_damage"])
	hero["armor"] += effects["armor"]
	hero["health"] = min(hero["max_health"], hero["health"] + effects["healing"])
	hero["presence"] += effects["presence"]
	slot["activated_window"] = engine.phase
	hero["action_bar"][slot_index] = slot
	engine.put_hero(action.source_id, hero)
	var consumed: Dictionary = engine.consume_statuses_for_slot(action.source_id, card)
	var status_bonus: int = int(consumed.get("bonus_boss_damage", 0))
	effects["boss_damage"] += status_bonus
	if not consumed.get("events", []).is_empty():
		action.payload["resolution_fact"] = {"status_event": consumed["events"][0]}
	action.resolve_success()
	var followups: Array = []
	if effects["boss_damage"] > 0:
		var fact_context: Dictionary = {}
		if status_bonus > 0:
			fact_context = {
				"base_amount": base_boss_damage,
				"status_bonus": status_bonus,
				"status_id": consumed["events"][0]["status_id"],
				"payoff_card_id": card.id,
			}
		followups.append(EncounterActionModel.damage(action.source_id, engine.boss_id, effects["boss_damage"], card.title, fact_context))
	if effects["target_damage"] > 0:
		var effect_target_id: StringName = action.payload.get("target_id", &"")
		followups.append(EncounterActionModel.damage(action.source_id, effect_target_id, effects["target_damage"], card.title))
	followups.append_array(engine.status_actions(StatusEffectModel.ON_SLOT_FIRED, action.source_id, {"card": card}))
	return followups

func _move_hero(engine, action) -> Array:
	var hero: Dictionary = engine.get_hero(action.source_id)
	var destination: Vector2i = action.payload.get("destination", Vector2i(999, 999))
	var card = action.payload.get("card")
	if hero.is_empty() or engine.phase != &"quick" or card == null or not hero["hand"].has(card):
		action.resolve_failure("Hero movement requires the Quick Window and a hand card for Stamina.")
		return []
	if not BoardQueryModel.is_legal_move(engine.board, action.source_id, destination):
		action.resolve_failure("That hex is not a legal move destination.")
		return []
	var from_coords: Vector2i = engine.board.get_entity(action.source_id).get("coords")
	hero["hand"].erase(card)
	hero["discard"].append(card)
	engine.put_hero(action.source_id, hero)
	engine.board.move_entity(action.source_id, destination)
	engine.board.set_entity_facing(action.source_id, FacingDirections.direction_for_axial_delta(destination - from_coords))
	action.resolve_success()
	return engine.hazard_actions(action.source_id, destination)

func _resolve_boss(engine, action) -> Array:
	var beat = action.payload.get("beat")
	if beat == null:
		action.resolve_failure("Boss resolution needs an authored beat.")
		return []
	var followups: Array = engine.timeline_resolver.resolve_boss_beat(engine, action.source_id, beat, action.payload.get("track", &""))
	action.resolve_success()
	return followups

func _apply_hazard(engine, action) -> void:
	var coords: Vector2i = action.payload.get("coords", Vector2i(999, 999))
	var hazard = action.payload.get("hazard")
	if not engine.board.add_hazard(coords, hazard.copy() if hazard != null else null):
		action.resolve_failure("The hazard could not be applied to that hex.")
		return
	action.resolve_success()

func _spawn_minion(engine, action) -> void:
	var minion_id: StringName = action.payload.get("minion_id", &"")
	var coords: Vector2i = action.payload.get("coords", Vector2i(999, 999))
	var minion = action.payload.get("minion")
	var health: int = minion.max_health if minion != null else 2
	if not engine.board.add_entity(minion_id, &"minion", coords, health, FacingDirections.Direction.NORTH_WEST, &"enemy"):
		action.resolve_failure("The Minion spawn hex is unavailable.")
		return
	if minion != null:
		engine.board.get_entity(minion_id)["content_id"] = minion.id
		engine.board.get_entity(minion_id)["title"] = minion.title
	action.resolve_success()

func _damage(engine, action) -> Array:
	var target_id: StringName = action.payload.get("target_id", &"")
	var amount: int = action.payload.get("amount", 0)
	var resolution_fact: Dictionary = engine.apply_damage(target_id, amount)
	for key in action.payload.get("fact_context", {}):
		if not resolution_fact.has(key):
			resolution_fact[key] = action.payload["fact_context"][key]
	action.payload.erase("fact_context")
	var dealt: int = int(resolution_fact.get("health_loss", 0))
	if not bool(resolution_fact.get("target_available", false)):
		action.resolve_failure("The damage target is unavailable.")
		return []
	action.payload["dealt"] = dealt
	engine.evaluate_damage_status(action, resolution_fact)
	action.payload["resolution_fact"] = resolution_fact
	action.resolve_success()
	return engine.status_actions(StatusEffectModel.ON_DAMAGE_TAKEN, target_id, {"amount": dealt, "source_id": action.source_id})

func _discard_for_stamina(engine, action) -> void:
	var hero: Dictionary = engine.get_hero(action.source_id)
	var card = action.payload.get("card")
	if hero.is_empty() or card == null or not hero["hand"].has(card):
		action.resolve_failure("The chosen hand card is unavailable.")
		return
	hero["hand"].erase(card)
	hero["discard"].append(card)
	engine.put_hero(action.source_id, hero)
	action.resolve_success()

func _expire_status(engine, action) -> void:
	var target_id: StringName = action.payload.get("target_id", &"")
	var status_id: StringName = action.payload.get("status_id", &"")
	var window: StringName = action.payload.get("window", &"")
	var effect = engine.get_status(target_id, status_id)
	if effect == null or effect.expires_at_window_end != window or engine.phase != window:
		action.resolve_failure("The Status Effect is not eligible to expire at this boundary.")
		return
	engine.remove_status(target_id, status_id)
	action.payload["resolution_fact"] = {"status_event": action.payload.get("status_event", {}).duplicate(true)}
	action.resolve_success()
