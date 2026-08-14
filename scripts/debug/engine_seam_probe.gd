extends "res://scripts/debug/ProbeCase.gd"

# Probe contract (ADR 0009, ADR 0014): the Encounter Engine is one module.
# Its seam is start / apply / advance_phase / legality / legal_actions plus
# read projections (hero, statuses, telegraphs, board). The action-resolution
# callback surface is implementation, not interface: it is not callable by
# name, no resolver collaborator is exposed, and no separate resolver module
# exists to become a second rules path.

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")

const STRIKE := preload("res://resources/cards/tank/steady_strike.tres")
const GUARD := preload("res://resources/cards/tank/iron_guard.tres")

const SEAM_METHODS: Array[String] = [
	"start", "apply", "advance_phase", "legality", "legal_actions",
	"get_hero", "add_status", "has_status", "get_status", "get_telegraphs",
]
const INTERNAL_METHODS: Array[String] = [
	"put_hero", "apply_damage", "consume_statuses_for_slot", "status_actions",
	"hazard_actions", "evaluate_damage_status", "remove_status",
	"check_resolution", "next_minion_id", "resolve",
]
const INTERNAL_PROPERTIES: Array[String] = [
	"action_resolver", "timeline_resolver", "card_resolver",
]

func probe_marker() -> String:
	return "ENGINE_SEAM_PROBE_OK"

func run_probe() -> void:
	var engine = standard_engine([STRIKE, GUARD])
	for method in SEAM_METHODS:
		_assert(engine.has_method(method), "The Encounter Engine seam must expose `%s`." % method)
	for method in INTERNAL_METHODS:
		_assert(not engine.has_method(method), "`%s` is resolver implementation and must not be callable on the seam." % method)
	for property in INTERNAL_PROPERTIES:
		_assert(not (property in engine), "The engine must not expose a `%s` collaborator." % property)
	_assert(not FileAccess.file_exists(ProjectSettings.globalize_path("res://scripts/sdk/ActionResolver.gd")), "No separate resolver module may exist beside the engine.")
	_test_rules_resolve_through_apply_alone(engine)

func _test_rules_resolve_through_apply_alone(engine) -> void:
	# The whole load -> charge -> fire flow must resolve through the public
	# seam with no other entry point involved.
	_assert(engine.apply(EncounterActionModel.load_slot(&"guardian", 0, STRIKE)).succeeded, "Loading through `apply` must succeed on the collapsed engine.")
	engine.advance_phase()
	engine.advance_phase()
	_assert(engine.apply(EncounterActionModel.charge_slot(&"guardian", 0, GUARD)).succeeded, "Charging through `apply` must succeed on the collapsed engine.")
	var boss_health_before: int = engine.board.get_entity(&"boss")["health"]
	var fire_action = engine.apply(EncounterActionModel.fire_slot(&"guardian", 0))
	_assert(fire_action.succeeded, "Firing through `apply` must succeed on the collapsed engine.")
	_assert(engine.board.get_entity(&"boss")["health"] < boss_health_before, "Fire resolution must reach the Boss through generated damage actions.")


