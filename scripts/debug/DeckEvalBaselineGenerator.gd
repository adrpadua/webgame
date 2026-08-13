class_name DeckEvalBaselineGenerator
extends RefCounted

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const EncounterRecordModel := preload("res://scripts/records/EncounterRecord.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

const ENCOUNTER := preload("res://resources/encounters/embermaw_prototype.tres")

const FIXED_SEED_SUFFIXES := [
	{"suffix": "a", "seed": 1337},
	{"suffix": "b", "seed": 7331},
	{"suffix": "c", "seed": 20260813},
]

static func clear_record_root() -> void:
	var root := ProjectSettings.globalize_path(EncounterRecordModel.RECORD_ROOT)
	DirAccess.make_dir_recursive_absolute(root)
	var directory := DirAccess.open(root)
	if directory == null:
		return
	for file_name in directory.get_files():
		DirAccess.remove_absolute("%s/%s" % [root, file_name])

static func generate(options: Dictionary = {}) -> Array:
	var records: Array = []
	var deck_config = options.get("deck_config", null)
	var encounter: Resource = deck_config.encounter if deck_config != null else ENCOUNTER
	var deck: Array = deck_config.player_deck if deck_config != null else encounter.player_deck
	var record_content: Resource = deck_config if deck_config != null else encounter
	var run_label_prefix := str(options.get("run_label_prefix", "baseline"))
	var scenario_id := str(options.get("scenario_id", "deck_eval_baseline"))
	var evaluation_purpose := str(options.get("evaluation_purpose", "combat_postures_issue_05"))
	for run in FIXED_SEED_SUFFIXES:
		var engine := EncounterEngineModel.new()
		engine.start(_config(encounter, deck, int(run["seed"])))
		var recorder := EncounterRecordModel.new()
		recorder.begin(engine, record_content, {
			"run_label": "%s-%s" % [run_label_prefix, run["suffix"]],
			"evaluation_purpose": evaluation_purpose,
			"scenario_id": scenario_id,
		})
		_play(engine, recorder)
		records.append(recorder.seal(engine))
	return records

static func _play(engine, recorder) -> void:
	var safety := 0
	while engine.active and safety < 80:
		safety += 1
		match engine.phase:
			&"loadout":
				_prepare_riposte_payoff(engine, recorder)
				_load_empty_slots(engine, recorder)
				_advance(engine, recorder)
			&"quick", &"slow":
				_prepare_riposte_payoff(engine, recorder)
				_load_empty_slots(engine, recorder)
				_charge_slots(engine, recorder)
				_fire_ready_slots(engine, recorder)
				_advance(engine, recorder)
			_:
				_advance(engine, recorder)

static func _load_empty_slots(engine, recorder) -> void:
	var hero: Dictionary = engine.get_hero(engine.primary_hero_id)
	for slot_index in hero.get("action_bar", []).size():
		hero = engine.get_hero(engine.primary_hero_id)
		if hero.get("hand", []).is_empty():
			return
		var slot: Dictionary = hero["action_bar"][slot_index]
		if slot.get("top_card") != null:
			continue
		var card = _pick_load_card(engine, hero.get("hand", []))
		engine.apply(EncounterActionModel.load_slot(engine.primary_hero_id, slot_index, card))
		recorder.sync(engine)

static func _charge_slots(engine, recorder) -> void:
	var hero: Dictionary = engine.get_hero(engine.primary_hero_id)
	for slot_index in hero.get("action_bar", []).size():
		hero = engine.get_hero(engine.primary_hero_id)
		if hero.get("hand", []).is_empty():
			return
		var slot: Dictionary = hero["action_bar"][slot_index]
		var top_card = slot.get("top_card")
		if top_card == null or slot.get("activated_window", &"") == engine.phase or slot.get("charges", []).size() >= top_card.get_charge_cap():
			continue
		var card = _pick_charge_card(engine, top_card, hero.get("hand", []))
		if card == null:
			continue
		engine.apply(EncounterActionModel.charge_slot(engine.primary_hero_id, slot_index, card))
		recorder.sync(engine)

static func _fire_ready_slots(engine, recorder) -> void:
	var hero: Dictionary = engine.get_hero(engine.primary_hero_id)
	for slot_index in _fire_slot_order(engine, hero.get("action_bar", [])):
		hero = engine.get_hero(engine.primary_hero_id)
		var slot: Dictionary = hero["action_bar"][slot_index]
		var top_card = slot.get("top_card")
		if top_card == null or slot.get("charges", []).is_empty() or slot.get("activated_window", &"") == engine.phase or top_card.get_window_speed() != engine.phase:
			continue
		if top_card.id == &"shield_slam" and not engine.has_status(engine.primary_hero_id, &"riposte_ready"):
			continue
		var target_id: StringName = _target_for_card(engine, top_card)
		if int(top_card.target_type) == 3 and target_id == &"":
			continue
		engine.apply(EncounterActionModel.fire_slot(engine.primary_hero_id, slot_index, target_id))
		recorder.sync(engine)

static func _prepare_riposte_payoff(engine, recorder) -> void:
	if not engine.has_status(engine.primary_hero_id, &"riposte_ready"):
		return
	var hero: Dictionary = engine.get_hero(engine.primary_hero_id)
	var shield_slam = _find_card(hero.get("hand", []), &"shield_slam")
	if shield_slam == null or _has_top_card(hero.get("action_bar", []), &"shield_slam"):
		return
	var slot_index := _first_empty_slot(hero.get("action_bar", []))
	if slot_index < 0 and engine.phase == &"loadout":
		slot_index = 0
	if slot_index < 0:
		return
	engine.apply(EncounterActionModel.load_slot(engine.primary_hero_id, slot_index, shield_slam))
	recorder.sync(engine)

static func _advance(engine, recorder) -> void:
	engine.advance_phase()
	recorder.sync(engine)

static func _pick_load_card(engine, hand: Array):
	var shield_slam = _find_card(hand, &"shield_slam")
	if shield_slam != null:
		return shield_slam
	return hand[0] if not hand.is_empty() else null

static func _pick_charge_card(engine, top_card, hand: Array):
	if top_card == null or hand.is_empty():
		return null
	if top_card.id != &"shield_slam":
		for card in hand:
			if card.id != &"shield_slam":
				return card
		return null
	return hand[0]

static func _fire_slot_order(engine, slots: Array) -> Array:
	var indexes: Array = []
	for index in slots.size():
		indexes.append(index)
	if not engine.has_status(engine.primary_hero_id, &"riposte_ready"):
		return indexes
	indexes.sort_custom(func(first: int, second: int) -> bool:
		var first_card = slots[first].get("top_card")
		var second_card = slots[second].get("top_card")
		var first_is_payoff: bool = first_card != null and first_card.id == &"shield_slam"
		var second_is_payoff: bool = second_card != null and second_card.id == &"shield_slam"
		return first_is_payoff and not second_is_payoff if first_is_payoff != second_is_payoff else first < second
	)
	return indexes

static func _find_card(cards: Array, card_id: StringName):
	for card in cards:
		if card.id == card_id:
			return card
	return null

static func _has_top_card(slots: Array, card_id: StringName) -> bool:
	for slot in slots:
		var top_card = slot.get("top_card")
		if top_card != null and top_card.id == card_id:
			return true
	return false

static func _first_empty_slot(slots: Array) -> int:
	for index in slots.size():
		if slots[index].get("top_card") == null:
			return index
	return -1

static func _target_for_card(engine, card) -> StringName:
	if int(card.target_type) != 3:
		return &""
	var source: Dictionary = engine.board.get_entity(engine.primary_hero_id)
	var source_coords: Vector2i = source.get("coords", Vector2i.ZERO)
	for entity_id in engine.board.entities:
		var entity: Dictionary = engine.board.entities[entity_id]
		if entity.get("kind") != &"minion":
			continue
		if _hex_distance(source_coords, entity.get("coords", Vector2i.ZERO)) <= card.range_tiles:
			return entity_id
	return &""

static func _hex_distance(first: Vector2i, second: Vector2i) -> int:
	return int((abs(first.x - second.x) + abs(first.x + first.y - second.x - second.y) + abs(first.y - second.y)) / 2)

static func _config(encounter: Resource, deck: Array, seed: int) -> Dictionary:
	return {
		"board_radius": encounter.board_radius,
		"round_limit": encounter.round_limit,
		"enrage_text": encounter.enrage_text,
		"random_seed": seed,
		"boss": {
			"id": encounter.boss_id,
			"title": encounter.boss_title,
			"coords": encounter.boss_start,
			"health": encounter.boss_health,
			"facing": FacingDirections.Direction.SOUTH_WEST,
		},
		"heroes": [{
			"id": encounter.primary_hero_id,
			"title": encounter.primary_hero_title,
			"coords": encounter.player_start,
			"health": encounter.player_health,
			"facing": FacingDirections.Direction.NORTH_EAST,
			"slot_count": encounter.slot_count,
			"refill_target": encounter.hand_refill_target,
			"deck": deck,
			"shuffle_deck": true,
		}],
		"primary_hero_id": encounter.primary_hero_id,
		"programs": encounter.boss_programs,
		"loop_programs": encounter.loop_boss_programs,
		"brood_spawn_candidates": encounter.brood_spawn_candidates,
	}
