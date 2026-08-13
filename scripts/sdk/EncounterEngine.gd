class_name EncounterEngine
extends RefCounted

const ActionResolverModel := preload("res://scripts/sdk/ActionResolver.gd")
const BoardStateModel := preload("res://scripts/hex/BoardState.gd")
const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const StatusEffectModel := preload("res://scripts/sdk/StatusEffect.gd")

var board := BoardStateModel.new()
var action_resolver := ActionResolverModel.new()
var timeline_resolver
var heroes: Dictionary = {}
var status_effects: Dictionary = {}
var boss_id: StringName = &""
var primary_hero_id: StringName = &""
var programs: Array = []
var current_program
var program_index: int = 0
var brood_spawn_candidates: Array[Vector2i] = []
var telegraphed_spawn_hexes: Array[Vector2i] = []
var previous_impacted_hexes: Array[Vector2i] = []
var last_pattern: Array[Vector2i] = []
var phase: StringName = &"instant"
var round: int = 1
var round_limit: int = 8
var active: bool = false
var outcome: StringName = &"ongoing"
var history: Array = []
var minion_sequence: int = 0

func _init() -> void:
	var timeline_resolver_script = load("res://scripts/sdk/TimelineResolver.gd")
	timeline_resolver = timeline_resolver_script.new()

func start(config: Dictionary) -> void:
	board.setup(int(config.get("board_radius", 2)))
	heroes.clear()
	status_effects.clear()
	history.clear()
	minion_sequence = 0
	programs = config.get("programs", []).duplicate()
	program_index = 0
	current_program = programs[0] if not programs.is_empty() else null
	round_limit = max(int(config.get("round_limit", 8)), 1)
	brood_spawn_candidates.clear()
	for coords in config.get("brood_spawn_candidates", []):
		brood_spawn_candidates.append(coords)
	telegraphed_spawn_hexes.clear()
	previous_impacted_hexes.clear()
	last_pattern.clear()
	phase = &"instant"
	round = 1
	active = true
	outcome = &"ongoing"
	var boss: Dictionary = config.get("boss", {})
	boss_id = boss.get("id", &"boss")
	board.add_entity(boss_id, &"boss", boss.get("coords", Vector2i.ZERO), int(boss.get("health", 36)), int(boss.get("facing", 4)), &"enemy")
	for hero_config in config.get("heroes", []):
		_add_hero(hero_config)
	primary_hero_id = config.get("primary_hero_id", heroes.keys()[0] if not heroes.is_empty() else &"")
	check_resolution()

func apply(action):
	var generated: Array = action_resolver.resolve(self, action)
	history.append(action)
	for followup in generated:
		action.generated_actions.append(followup)
		apply(followup)
	check_resolution()
	return action

func advance_phase() -> Array:
	if not active:
		return []
	var actions: Array = []
	match phase:
		&"instant":
			actions = timeline_resolver.actions_for_track(self, &"instant")
			for action in actions:
				apply(action)
			phase = &"quick"
			_start_window(&"quick")
		&"quick":
			_cleanup_slots(&"quick")
			phase = &"incoming"
		&"incoming":
			actions = timeline_resolver.actions_for_track(self, &"incoming")
			for action in actions:
				apply(action)
			phase = &"slow"
			_start_window(&"slow")
		&"slow":
			_cleanup_slots(&"slow")
			round += 1
			if round > round_limit:
				active = false
				outcome = &"defeat"
				return actions
			_start_round()
			program_index = (program_index + 1) % programs.size() if not programs.is_empty() else 0
			current_program = programs[program_index] if not programs.is_empty() else null
			phase = &"instant"
	check_resolution()
	return actions

func get_hero(hero_id: StringName) -> Dictionary:
	return heroes.get(hero_id, {})

func put_hero(hero_id: StringName, hero: Dictionary) -> void:
	heroes[hero_id] = hero
	if board.has_entity(hero_id):
		board.get_entity(hero_id)["health"] = hero["health"]

func add_status(entity_id: StringName, effect) -> bool:
	if not board.has_entity(entity_id) or effect == null:
		return false
	if not status_effects.has(entity_id):
		status_effects[entity_id] = []
	status_effects[entity_id].append(effect)
	return true

func status_actions(trigger: StringName, entity_id: StringName, context: Dictionary = {}) -> Array:
	var actions: Array = []
	for effect in status_effects.get(entity_id, []):
		var outcome_data: Dictionary = effect.outcome_for(trigger)
		if outcome_data.get("bonus_boss_damage", 0) > 0 and boss_id != entity_id:
			actions.append(EncounterActionModel.damage(entity_id, boss_id, outcome_data["bonus_boss_damage"], effect.id))
	return actions

func hazard_actions(entity_id: StringName, coords: Vector2i) -> Array:
	var actions: Array = []
	for hazard in board.get_hazards(coords):
		var outcome_data: Dictionary = hazard.outcome_for(StatusEffectModel.ON_ENTER_HEX)
		if outcome_data.get("damage", 0) > 0:
			actions.append(EncounterActionModel.damage(&"hazard", entity_id, outcome_data["damage"], hazard.id))
	return actions

func apply_damage(target_id: StringName, amount: int) -> int:
	var adjusted: int = max(amount, 0)
	for effect in status_effects.get(target_id, []):
		adjusted -= int(effect.outcome_for(StatusEffectModel.ON_DAMAGE_TAKEN).get("damage_reduction", 0))
	adjusted = max(adjusted, 0)
	var dealt: int = board.damage_entity(target_id, adjusted)
	if heroes.has(target_id):
		var hero: Dictionary = heroes[target_id]
		var armor_blocked: int = min(int(hero.get("armor", 0)), dealt)
		hero["armor"] -= armor_blocked
		var remaining: int = dealt - armor_blocked
		hero["health"] = max(int(hero["health"]) - remaining, 0)
		board.get_entity(target_id)["health"] = hero["health"]
		heroes[target_id] = hero
	return dealt

func next_minion_id() -> StringName:
	minion_sequence += 1
	return StringName("whelp_%d" % minion_sequence)

func check_resolution() -> void:
	if not active:
		return
	if boss_id == &"" or not board.has_entity(boss_id) or board.get_entity(boss_id).get("health", 0) <= 0:
		active = false
		outcome = &"victory"
		return
	for hero in heroes.values():
		if hero.get("health", 0) <= 0:
			active = false
			outcome = &"defeat"
			return

func _add_hero(config: Dictionary) -> void:
	var hero_id: StringName = config.get("id", &"")
	var health := int(config.get("health", 34))
	if hero_id == &"" or not board.add_entity(hero_id, &"hero", config.get("coords", Vector2i.ZERO), health, int(config.get("facing", 1)), &"party"):
		return
	var action_bar: Array = []
	for index in range(int(config.get("slot_count", 2))):
		action_bar.append({"top_card": null, "charges": [], "activated_window": &""})
	heroes[hero_id] = {
		"id": hero_id,
		"health": health,
		"max_health": health,
		"armor": int(config.get("armor", 0)),
		"energy": int(config.get("energy", 3)),
		"energy_per_round": int(config.get("energy_per_round", 3)),
		"stamina": int(config.get("stamina", 0)),
		"presence": int(config.get("presence", 1)),
		"hand": config.get("hand", []).duplicate(),
		"discard": [],
		"action_bar": action_bar,
	}

func _start_window(window: StringName) -> void:
	return

func _start_round() -> void:
	board.advance_round()
	for hero_id in heroes:
		var hero: Dictionary = heroes[hero_id]
		hero["armor"] = 0
		hero["energy"] += hero["energy_per_round"]
		for effect in status_effects.get(hero_id, []):
			hero["armor"] += int(effect.outcome_for(StatusEffectModel.ON_ROUND_START).get("armor", 0))
		heroes[hero_id] = hero
		var remaining: Array = []
		for effect in status_effects.get(hero_id, []):
			if not effect.advance_round():
				remaining.append(effect)
		status_effects[hero_id] = remaining

func _cleanup_slots(window: StringName) -> void:
	for hero_id in heroes:
		var hero: Dictionary = heroes[hero_id]
		for slot_index in hero["action_bar"].size():
			var slot: Dictionary = hero["action_bar"][slot_index]
			var top_card = slot["top_card"]
			if top_card != null and slot["activated_window"] == window and slot["charges"].size() == top_card.get_charge_cap():
				hero["discard"].append(top_card)
				for charged_card in slot["charges"]:
					hero["discard"].append(charged_card)
				slot = {"top_card": null, "charges": [], "activated_window": &""}
			elif slot["activated_window"] == window:
				slot["activated_window"] = &""
			hero["action_bar"][slot_index] = slot
		heroes[hero_id] = hero
