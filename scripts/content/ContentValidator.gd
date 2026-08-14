class_name ContentValidator
extends RefCounted

const CardModel := preload("res://scripts/cards/CardData.gd")
const KeywordModel := preload("res://scripts/content/KeywordData.gd")
const ChargeModifierModel := preload("res://scripts/content/ChargeModifierData.gd")
const HazardModel := preload("res://scripts/content/HazardData.gd")
const MinionModel := preload("res://scripts/content/MinionData.gd")
const BossProgramModel := preload("res://scripts/boss/BossProgramData.gd")
const BossBeatModel := preload("res://scripts/boss/BossProgramBeat.gd")
const EncounterModel := preload("res://scripts/encounter/EncounterData.gd")
const CatalogModel := preload("res://scripts/content/ContentCatalogData.gd")
const EvaluationDeckModel := preload("res://scripts/content/EvaluationDeckData.gd")
const BoardQueryModel := preload("res://scripts/hex/BoardQuery.gd")

var errors: Array[String] = []
var _resources: Array[Resource] = []
var _keywords: Dictionary = {}
var _ids_by_type: Dictionary = {}
var _id_pattern := RegEx.new()

func validate_all(root_path: String = "res://resources") -> Array[String]:
	errors.clear()
	_resources.clear()
	_keywords.clear()
	_ids_by_type.clear()
	_id_pattern.compile("^[a-z0-9_]+$")
	for path in _resource_paths(root_path):
		var resource := ResourceLoader.load(path)
		if resource == null:
			_error(path, "Resource could not be loaded. Fix parse errors or broken references.")
		else:
			_resources.append(resource)
	for resource in _resources:
		if resource.get_script() == KeywordModel:
			_validate_keyword(resource)
	for resource in _resources:
		var script = resource.get_script()
		match script:
			KeywordModel:
				pass
			CardModel:
				_validate_card(resource)
			ChargeModifierModel:
				_validate_charge_modifier(resource, resource.resource_path, true)
			HazardModel:
				_validate_hazard(resource)
			MinionModel:
				_validate_minion(resource)
			BossProgramModel:
				_validate_program(resource)
			EncounterModel:
				_validate_encounter(resource)
			CatalogModel:
				_validate_catalog(resource)
			EvaluationDeckModel:
				_validate_evaluation_deck(resource)
			_:
				_error(resource.resource_path, "Unsupported authored Resource type. Add a supported content schema or move historical data under resources/legacy/.")
	return errors.duplicate()

func _validate_keyword(keyword: Resource) -> void:
	_validate_identity(keyword, "Keyword")
	if keyword.id != &"":
		_keywords[keyword.id] = keyword

func _validate_card(card: Resource) -> void:
	var path := card.resource_path
	_validate_identity(card, "Card")
	if card.get_window_speed() not in [&"quick", &"slow"]:
		_error(path, "Card timing must be `quick` or `slow`; use one canonical player window.")
	if card.get_charge_cap() < 1 or card.get_charge_cap() > 6:
		_error(path, "Charge Value must be between 1 and 6.")
	if card.target_type == CardModel.TargetType.PIECE:
		if card.damage <= 0:
			_error(path, "A piece-targeting Card needs positive `damage` or a supported targeted effect.")
		if card.range_tiles < 1:
			_error(path, "A piece-targeting Card needs `range_tiles` of at least 1.")
	elif card.damage > 0:
		_error(path, "Target damage requires `target_type = PIECE` so the runtime can enforce a target.")
	elif card.target_type != CardModel.TargetType.NONE:
		_error(path, "This target type is not supported by EncounterEngine; use NONE or PIECE.")
	if card.armor_delta <= 0 and card.healing <= 0 and card.boss_damage <= 0 and card.presence_delta <= 0 and card.damage <= 0:
		_error(path, "Card has no supported effect. Author Armor, healing, Boss damage, Presence, or target damage.")
	if card.tags.is_empty():
		_error(path, "Card needs at least one registered Keyword ID in `tags`.")
	var seen_keywords: Dictionary = {}
	for keyword_id in card.tags:
		if not _keywords.has(keyword_id):
			_error(path, "Unknown Keyword `%s`; add a Keyword resource under resources/keywords or fix the tag." % keyword_id)
		if seen_keywords.has(keyword_id):
			_error(path, "Keyword `%s` is duplicated; each distinct Keyword appears once on a Card." % keyword_id)
		seen_keywords[keyword_id] = true
	for index in card.charge_modifiers.size():
		var modifier = card.charge_modifiers[index]
		if modifier == null or modifier.get_script() != ChargeModifierModel:
			_error(path, "Charge Modifier %d must reference a ChargeModifierData resource." % (index + 1))
		else:
			if not _resources.has(modifier):
				_error(path, "Charge Modifier %d must reference a standalone resource under resources/charge_modifiers/." % (index + 1))
			_validate_charge_modifier(modifier, "%s charge_modifiers[%d]" % [path, index])

func _validate_charge_modifier(modifier: Resource, path: String, validate_identity: bool = false) -> void:
	if validate_identity:
		_validate_identity(modifier, "Charge Modifier")
	if modifier.amount_per_match < 1:
		_error(path, "Charge Modifier amount must be positive.")
	if modifier.keyword_id != &"" and not _keywords.has(modifier.keyword_id):
		_error(path, "Charge Modifier references unknown Keyword `%s`." % modifier.keyword_id)

func _validate_hazard(hazard: Resource) -> void:
	_validate_identity(hazard, "Hazard")
	if hazard.duration_rounds < 1:
		_error(hazard.resource_path, "Hazard duration must be at least one Round.")
	if hazard.enter_damage <= 0 and not hazard.blocks_voluntary_movement:
		_error(hazard.resource_path, "Hazard needs entry damage, movement blocking, or another supported behavior.")

func _validate_minion(minion: Resource) -> void:
	_validate_identity(minion, "Minion")
	if minion.max_health < 1:
		_error(minion.resource_path, "Minion max health must be at least 1.")

func _validate_program(program: Resource) -> void:
	_validate_identity(program, "Boss Program")
	if program.instant_beats.is_empty():
		_error(program.resource_path, "Boss Program needs at least one Instant beat.")
	if program.incoming_beats.is_empty():
		_error(program.resource_path, "Boss Program needs at least one Incoming beat.")
	var beat_ids: Dictionary = {}
	for track in [&"instant", &"incoming"]:
		var beats: Array = program.instant_beats if track == &"instant" else program.incoming_beats
		for index in beats.size():
			var beat = beats[index]
			var beat_path := "%s %s_beats[%d]" % [program.resource_path, track, index]
			if beat == null or beat.get_script() != BossBeatModel:
				_error(beat_path, "Beat must be a BossProgramBeat resource.")
				continue
			_validate_embedded_identity(beat, beat_path, "Boss Beat")
			if beat_ids.has(beat.id):
				_error(beat_path, "Boss Beat ID `%s` is duplicated within this Program." % beat.id)
			beat_ids[beat.id] = true
			if beat.counter_tags.is_empty():
				_error(beat_path, "Boss Beat needs at least one visible counter tag.")
			match beat.kind:
				BossBeatModel.Kind.RAKING_CLAW:
					if beat.damage < 1:
						_error(beat_path, "Raking Claw needs positive damage.")
					if beat.target_selector != BossBeatModel.TARGET_SELECTOR_TANK:
						_error(beat_path, "Raking Claw must use Target Selector `tank`.")
					if beat.rules_text != "Target: Tank. Deal 4 damage. Movement does not evade this hit.":
						_error(beat_path, "Raking Claw rules text must be `Target: Tank. Deal 4 damage. Movement does not evade this hit.`")
					if beat.damage_classification != &"tank_hit":
						_error(beat_path, "Raking Claw must retain `tank_hit` damage classification.")
					if beat.counter_tags != [&"Mitigate"]:
						_error(beat_path, "Raking Claw counter tags must be exactly `Mitigate`.")
				BossBeatModel.Kind.CINDER_BREATH:
					if beat.damage < 1:
						_error(beat_path, "Cinder Breath needs positive damage.")
					if beat.hazard == null or beat.hazard.get_script() != HazardModel:
						_error(beat_path, "Cinder Breath must reference the Hazard it applies.")
					elif not _resources.has(beat.hazard):
						_error(beat_path, "Cinder Breath Hazard must be a standalone resource under resources/hazards/.")
				BossBeatModel.Kind.SCORCH_LAST_PATTERN:
					if beat.hazard == null or beat.hazard.get_script() != HazardModel:
						_error(beat_path, "Scorch Last Pattern must reference the Hazard it applies.")
					elif not _resources.has(beat.hazard):
						_error(beat_path, "Scorch Last Pattern Hazard must be a standalone resource under resources/hazards/.")
				BossBeatModel.Kind.BROOD_CALL:
					if beat.minion == null or beat.minion.get_script() != MinionModel:
						_error(beat_path, "Brood Call must reference the Minion it spawns.")
					elif not _resources.has(beat.minion):
						_error(beat_path, "Brood Call Minion must be a standalone resource under resources/minions/.")
					if beat.count < 1:
						_error(beat_path, "Brood Call spawn count must be positive.")

func _validate_encounter(encounter: Resource) -> void:
	var path := encounter.resource_path
	_validate_identity(encounter, "Encounter")
	if _id_pattern.search(str(encounter.primary_hero_id)) == null:
		_error(path, "Primary Hero ID must be lowercase snake_case.")
	if _id_pattern.search(str(encounter.boss_id)) == null:
		_error(path, "Boss ID must be lowercase snake_case.")
	if encounter.primary_hero_id == encounter.boss_id:
		_error(path, "Primary Hero and Boss IDs must be different.")
	if encounter.primary_hero_title.strip_edges().is_empty() or encounter.boss_title.strip_edges().is_empty():
		_error(path, "Encounter needs display titles for its primary Hero and Boss.")
	if encounter.player_deck.size() < encounter.hand_refill_target:
		_error(path, "Player deck must contain at least the hand refill target of %d cards." % encounter.hand_refill_target)
	for index in encounter.player_deck.size():
		var card = encounter.player_deck[index]
		if card == null or card.get_script() != CardModel:
			_error(path, "player_deck[%d] must reference a CardData resource." % index)
		elif not _resources.has(card):
			_error(path, "player_deck[%d] must reference a standalone Card resource under resources/cards/." % index)
	if encounter.boss_programs.is_empty():
		_error(path, "Encounter needs at least one Boss Program.")
	if not encounter.loop_boss_programs and encounter.boss_programs.size() < encounter.round_limit:
		_error(path, "A non-looping Encounter needs at least one Boss Program per Round.")
	for index in encounter.boss_programs.size():
		var program = encounter.boss_programs[index]
		if program == null or program.get_script() != BossProgramModel:
			_error(path, "boss_programs[%d] must reference a BossProgramData resource." % index)
		elif not _resources.has(program):
			_error(path, "boss_programs[%d] must reference a standalone Boss Program under resources/boss/programs/." % index)
	var hexes := BoardQueryModel.hexes_in_radius(encounter.board_radius)
	if not hexes.has(encounter.player_start):
		_error(path, "Player start hex is outside the authored board radius.")
	if not hexes.has(encounter.boss_start):
		_error(path, "Boss start hex is outside the authored board radius.")
	if encounter.player_start == encounter.boss_start:
		_error(path, "Player and Boss start hexes must be different.")
	var candidates: Dictionary = {}
	for coords in encounter.brood_spawn_candidates:
		if not hexes.has(coords):
			_error(path, "Brood spawn candidate %s is outside the board." % coords)
		elif BoardQueryModel.hex_distance(Vector2i.ZERO, coords) != encounter.board_radius:
			_error(path, "Brood spawn candidate %s must be on the board edge." % coords)
		if candidates.has(coords):
			_error(path, "Brood spawn candidate %s is duplicated." % coords)
		candidates[coords] = true

func _validate_catalog(catalog: Resource) -> void:
	var path := catalog.resource_path
	if catalog.default_encounter == null or catalog.default_encounter.get_script() != EncounterModel:
		_error(path, "Content catalog needs a valid `default_encounter` reference.")
	if catalog.encounters.is_empty():
		_error(path, "Content catalog needs at least one Encounter.")
	for index in catalog.encounters.size():
		var encounter = catalog.encounters[index]
		if encounter == null or encounter.get_script() != EncounterModel or not _resources.has(encounter):
			_error(path, "encounters[%d] must reference a standalone Encounter under resources/encounters/." % index)
	if catalog.default_encounter != null and not catalog.encounters.has(catalog.default_encounter):
		_error(path, "`default_encounter` must also appear in the catalog's `encounters` list.")

func _validate_evaluation_deck(deck: Resource) -> void:
	var path := deck.resource_path
	_validate_identity(deck, "Evaluation Deck")
	if deck.encounter == null or deck.encounter.get_script() != EncounterModel:
		_error(path, "Evaluation Deck must reference the Encounter it evaluates.")
	elif not _resources.has(deck.encounter):
		_error(path, "Evaluation Deck encounter must be a standalone Encounter resource under resources/encounters/.")
	if deck.player_deck.size() < 1:
		_error(path, "Evaluation Deck must contain at least one Card.")
	for index in deck.player_deck.size():
		var card = deck.player_deck[index]
		if card == null or card.get_script() != CardModel:
			_error(path, "player_deck[%d] must reference a CardData resource." % index)
		elif not _resources.has(card):
			_error(path, "player_deck[%d] must reference a standalone Card resource under resources/cards/." % index)

func _validate_identity(resource: Resource, type_name: String) -> void:
	_validate_embedded_identity(resource, resource.resource_path, type_name)
	var key := type_name
	if not _ids_by_type.has(key):
		_ids_by_type[key] = {}
	if resource.id != &"" and _ids_by_type[key].has(resource.id):
		_error(resource.resource_path, "%s ID `%s` duplicates %s." % [type_name, resource.id, _ids_by_type[key][resource.id]])
	elif resource.id != &"":
		_ids_by_type[key][resource.id] = resource.resource_path

func _validate_embedded_identity(resource: Resource, path: String, type_name: String) -> void:
	if resource.id == &"" or _id_pattern.search(str(resource.id)) == null:
		_error(path, "%s ID must be non-empty lowercase snake_case." % type_name)
	if str(resource.title).strip_edges().is_empty():
		_error(path, "%s needs a display title." % type_name)
	if str(resource.rules_text).strip_edges().is_empty():
		_error(path, "%s needs complete rules text." % type_name)

func _resource_paths(root_path: String) -> Array[String]:
	var result: Array[String] = []
	var directory := DirAccess.open(root_path)
	if directory == null:
		_error(root_path, "Content root does not exist.")
		return result
	directory.list_dir_begin()
	var name := directory.get_next()
	while name != "":
		var path := root_path.path_join(name)
		if directory.current_is_dir():
			if name != "legacy":
				result.append_array(_resource_paths(path))
		elif name.get_extension() == "tres":
			result.append(path)
		name = directory.get_next()
	directory.list_dir_end()
	result.sort()
	return result

func _error(path: String, guidance: String) -> void:
	errors.append("%s: %s" % [path, guidance])
