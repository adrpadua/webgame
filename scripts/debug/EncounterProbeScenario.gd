class_name EncounterProbeScenario
extends RefCounted

var id: StringName
var version: int
var seed: int
var config: Dictionary
var cards: Dictionary = {}
var minions: Dictionary = {}
var setup_fixtures: Array = []
var action_tape: Array = []
var _execution_started: bool = false
var _fixture_sequence: int = 0

func _init(scenario_id: StringName, scenario_version: int, scenario_seed: int, initial_config: Dictionary) -> void:
	id = scenario_id
	version = scenario_version
	seed = scenario_seed
	config = initial_config.duplicate(true)
	config["random_seed"] = seed

func register_card(card) -> EncounterProbeScenario:
	cards[card.id] = card
	return self

func register_minion(minion) -> EncounterProbeScenario:
	_assert_setup()
	assert(minion != null and minion.id != &"", "Registered scenario Minions need a stable content ID.")
	minions[minion.id] = minion
	return self

func place_minion(minion_content_id: StringName, coords: Vector2i, requested_entity_id: StringName = &"") -> StringName:
	_assert_setup()
	assert(minions.has(minion_content_id), "Register Minion content before placing a scenario fixture.")
	_fixture_sequence += 1
	var entity_id := requested_entity_id
	if entity_id == &"":
		entity_id = StringName("%s_fixture_%d" % [minion_content_id, _fixture_sequence])
	for fixture in setup_fixtures:
		assert(StringName(fixture.get("entity_id", "")) != entity_id, "Scenario fixture entity IDs must be unique.")
	setup_fixtures.append({
		"operation": "place_minion",
		"entity_id": str(entity_id),
		"minion_content_id": str(minion_content_id),
		"coords": coords,
	})
	return entity_id

func give_hand(hero_id: StringName, card_ids: Array[StringName]) -> EncounterProbeScenario:
	_assert_setup()
	var hero := _hero_config(hero_id)
	hero["hand"] = _cards_for(card_ids)
	return self

func give_deck(hero_id: StringName, card_ids: Array[StringName], shuffle: bool = false) -> EncounterProbeScenario:
	_assert_setup()
	var hero := _hero_config(hero_id)
	hero["deck"] = _cards_for(card_ids)
	hero["shuffle_deck"] = shuffle
	return self

func advance_phase() -> EncounterProbeScenario:
	return _add_step({"operation": "advance_phase"})

func load_slot(hero_id: StringName, slot_index: int, card_id: StringName) -> EncounterProbeScenario:
	return _add_step({"operation": "load_slot", "hero_id": str(hero_id), "slot_index": slot_index, "card_id": str(card_id)})

func charge_slot(hero_id: StringName, slot_index: int, card_id: StringName) -> EncounterProbeScenario:
	return _add_step({"operation": "charge_slot", "hero_id": str(hero_id), "slot_index": slot_index, "card_id": str(card_id)})

func fire_slot(hero_id: StringName, slot_index: int, target_id: StringName = &"") -> EncounterProbeScenario:
	return _add_step({"operation": "fire_slot", "hero_id": str(hero_id), "slot_index": slot_index, "target_id": str(target_id)})

func expect_rejection(reason_contains: String, rules_state_unchanged: bool = true) -> EncounterProbeScenario:
	assert(not action_tape.is_empty(), "A rejection expectation must follow an action step.")
	assert(not reason_contains.strip_edges().is_empty(), "A rejection expectation needs a reason fragment.")
	var step: Dictionary = action_tape[-1]
	assert(step.get("operation", "") != "advance_phase", "A rejection expectation must follow an Encounter action.")
	assert(not step.has("expected_rejection"), "An action step can have only one rejection expectation.")
	step["expected_rejection"] = {
		"reason_contains": reason_contains,
		"rules_state_unchanged": rules_state_unchanged,
	}
	action_tape[-1] = step
	return self

func begin_execution() -> void:
	_execution_started = true

func replace_action_tape(recorded_tape: Array) -> Array:
	var previous_tape := action_tape
	action_tape = recorded_tape
	return previous_tape

func _add_step(step: Dictionary) -> EncounterProbeScenario:
	_execution_started = true
	action_tape.append(step)
	return self

func _hero_config(hero_id: StringName) -> Dictionary:
	for hero in config.get("heroes", []):
		if hero.get("id", &"") == hero_id:
			return hero
	push_error("Scenario %s has no Hero %s." % [id, hero_id])
	return {}

func _cards_for(card_ids: Array[StringName]) -> Array:
	var result: Array = []
	for card_id in card_ids:
		if not cards.has(card_id):
			push_error("Scenario %s has no registered card %s." % [id, card_id])
			continue
		result.append(cards[card_id])
	return result

func _assert_setup() -> void:
	assert(not _execution_started, "Scenario fixtures are setup-only. Add legal Encounter actions after setup.")
