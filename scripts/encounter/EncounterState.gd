class_name EncounterState
extends Node

const EncounterDataResource := preload("res://scripts/encounter/EncounterData.gd")

signal state_changed
signal log_changed
signal encounter_ended(outcome: StringName, reason: String)

@export var round_limit: int = 8

var active: bool = false
var outcome: StringName = &"ongoing"
var reason: String = ""
var log_lines: Array[String] = []

func configure(data: EncounterDataResource) -> void:
	if data != null:
		round_limit = max(data.round_limit, 1)

func begin() -> void:
	active = true
	outcome = &"ongoing"
	reason = ""
	log_lines.clear()
	append_log("Encounter begins. Survive and defeat Embermaw before round %d ends." % round_limit)
	state_changed.emit()

func append_log(line: String) -> void:
	if line.strip_edges().is_empty():
		return
	log_lines.push_front(line)
	if log_lines.size() > 12:
		log_lines.resize(12)
	log_changed.emit()

func get_log_text() -> String:
	return "\n".join(log_lines)

func check_resolution(player, boss, turn_number: int, enrage_text: String) -> bool:
	if not active:
		return true
	if boss.health <= 0:
		_end(&"victory", "%s is defeated." % boss.boss_name)
		return true
	if player.health <= 0:
		_end(&"defeat", "%s falls." % player.hero_name)
		return true
	if turn_number > round_limit:
		_end(&"defeat", enrage_text)
		return true
	return false

func _end(new_outcome: StringName, new_reason: String) -> void:
	active = false
	outcome = new_outcome
	reason = new_reason
	append_log(new_reason)
	state_changed.emit()
	encounter_ended.emit(outcome, reason)
