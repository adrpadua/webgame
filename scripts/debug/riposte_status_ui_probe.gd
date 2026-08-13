extends SceneTree

const MAIN_SCENE := preload("res://scenes/Main.tscn")
const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const EncounterRecordModel := preload("res://scripts/records/EncounterRecord.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

const ENCOUNTER := preload("res://resources/encounters/embermaw_prototype.tres")
const EMBER_PATTERN := preload("res://resources/boss/programs/embermaw_embers.tres")
const IRON_GUARD := preload("res://resources/cards/tank/iron_guard.tres")
const SHIELD_SLAM := preload("res://resources/cards/tank/shield_slam.tres")

func _initialize() -> void:
	var main := MAIN_SCENE.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	main._apply_viewport_size(Vector2(390, 844))
	await process_frame
	await process_frame

	var engine = _riposte_ready_engine()
	main.engine = engine
	main.encounter_record = EncounterRecordModel.new()
	main.player.bind_engine(engine, engine.primary_hero_id)
	main.boss.bind_engine(engine)
	main.turn_manager.bind_engine(engine)
	main.encounter.bind_engine(engine)
	main.hex_grid.sync_from_engine(engine)
	main._refresh_status()
	await process_frame
	await process_frame

	var pane: Control = main.get_node("Root/MobileStatus/MobileStatusEffectPane")
	var label: Label = main.get_node("Root/MobileStatus/MobileStatusEffectPane/MobileStatusEffectLabel")
	assert(pane.visible, "Riposte Ready must render from the active Status Effect projection.")
	assert(label.text.contains("Riposte Ready"), "The Status Effect name must be legible.")
	assert(label.text.contains("Tank Hit") and label.text.contains("fully blocked"), "The visible reason must explain the qualifying zero-Health-loss Tank Hit.")
	assert(label.text.contains("Shield Slam") and label.text.contains("+2"), "The visible state must identify Shield Slam consumption and the +2 payoff.")
	assert(label.text.contains("Quick"), "The visible state must identify the Quick expiry boundary.")
	assert(label.tooltip_text.contains("Guarded Front") and label.tooltip_text.contains("0 Health loss"), "Tooltip must expose the authoritative trigger reason.")
	assert(label.tooltip_text.contains("Expires") and label.tooltip_text.contains("Shield Slam"), "Tooltip must expose expiry and consumption.")
	assert(Rect2(Vector2.ZERO, main.size).encloses(label.get_global_rect()), "Riposte status text must remain inside the physical viewport.")
	assert(not pane.get_global_rect().intersects(main.mobile_controls_row.get_global_rect()), "Riposte status must not overlap Continue/Help controls.")

	var history_before: int = engine.history.size()
	var health_before: int = int(engine.board.get_entity(engine.boss_id).get("health", 0))
	var fired = engine.apply(EncounterActionModel.fire_slot(engine.primary_hero_id, 1))
	assert(fired.succeeded, "The prepared Shield Slam must fire legally.")
	main._sync_from_engine()
	main._set_status_payoff_feedback()
	main._refresh_status()
	await process_frame

	assert(not pane.visible, "The active status pane must clear after authoritative Shield Slam consumption.")
	assert(engine.history.size() == history_before + 2, "UI sync must not add actions beyond the fire and generated damage records.")
	assert(main.feedback_label.text.contains("Riposte Ready consumed"), "Consumption feedback must be shown after the authoritative status event.")
	assert(main.feedback_label.text.contains("+2") and main.feedback_label.text.contains("5 total"), "Payoff feedback must show the +2 bonus and total damage.")
	assert(health_before - int(engine.board.get_entity(engine.boss_id).get("health", 0)) == 5, "The rules-authoritative Shield Slam payoff must remain 5 total Boss damage.")

	print("RIPOSTE_STATUS_UI_PROBE_OK")
	quit()

func _riposte_ready_engine() -> RefCounted:
	var engine: RefCounted = EncounterEngineModel.new()
	engine.start(_config([IRON_GUARD, IRON_GUARD, SHIELD_SLAM, IRON_GUARD]))
	assert(engine.apply(EncounterActionModel.load_slot(ENCOUNTER.primary_hero_id, 0, IRON_GUARD)).succeeded, "Loadout must install Iron Guard.")
	assert(engine.apply(EncounterActionModel.load_slot(ENCOUNTER.primary_hero_id, 1, SHIELD_SLAM)).succeeded, "Loadout must install Shield Slam.")
	engine.advance_phase()
	engine.advance_phase()
	assert(engine.phase == &"quick", "Ember Pattern must enter Quick.")
	assert(engine.apply(EncounterActionModel.charge_slot(ENCOUNTER.primary_hero_id, 0, IRON_GUARD)).succeeded, "Quick must charge Iron Guard.")
	assert(engine.apply(EncounterActionModel.fire_slot(ENCOUNTER.primary_hero_id, 0)).succeeded, "Iron Guard must fire to create Armor.")
	engine.advance_phase()
	engine.advance_phase()
	assert(engine.phase == &"slow" and engine.has_status(ENCOUNTER.primary_hero_id, &"riposte_ready"), "Incoming Raking Claw must grant Riposte Ready.")
	engine.advance_phase()
	engine.advance_phase()
	engine.advance_phase()
	assert(engine.phase == &"quick" and engine.has_status(ENCOUNTER.primary_hero_id, &"riposte_ready"), "Riposte Ready must survive into the first following Quick Window.")
	assert(engine.apply(EncounterActionModel.charge_slot(ENCOUNTER.primary_hero_id, 1, IRON_GUARD)).succeeded, "Shield Slam must be charged for legal consumption.")
	return engine

func _config(hand: Array) -> Dictionary:
	return {
		"board_radius": ENCOUNTER.board_radius,
		"round_limit": ENCOUNTER.round_limit,
		"enrage_text": ENCOUNTER.enrage_text,
		"random_seed": ENCOUNTER.random_seed,
		"boss": {
			"id": ENCOUNTER.boss_id,
			"title": ENCOUNTER.boss_title,
			"coords": ENCOUNTER.boss_start,
			"health": ENCOUNTER.boss_health,
			"facing": FacingDirections.Direction.SOUTH_WEST,
		},
		"heroes": [{
			"id": ENCOUNTER.primary_hero_id,
			"title": ENCOUNTER.primary_hero_title,
			"coords": ENCOUNTER.player_start,
			"health": ENCOUNTER.player_health,
			"slot_count": ENCOUNTER.slot_count,
			"refill_target": ENCOUNTER.hand_refill_target,
			"hand": hand,
		}],
		"primary_hero_id": ENCOUNTER.primary_hero_id,
		"programs": [EMBER_PATTERN],
		"loop_programs": true,
		"brood_spawn_candidates": ENCOUNTER.brood_spawn_candidates,
	}
