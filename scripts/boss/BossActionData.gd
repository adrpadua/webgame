class_name BossActionData
extends Resource

enum DamageMode {
	TANK,
	RAID,
}

@export var id: StringName
@export var title: String = "Boss Action"
@export_multiline var rules_text: String = ""
@export var tank_damage: int = 0
@export var raid_damage: int = 0
@export var cleave_damage: int = 0
@export var summon_minions: int = 0
@export var heal_boss: int = 0

# Authored data schema for resources/legacy/boss_actions only. Boss behavior
# resolves through the Encounter Engine's Boss Timeline (ADR 0016, ADR 0017).
func get_damage_profile() -> String:
	var profiles: Array[String] = []
	if tank_damage > 0:
		profiles.append("Tank %d" % tank_damage)
	if raid_damage > 0:
		profiles.append("Raid %d" % raid_damage)
	return " + ".join(profiles) if not profiles.is_empty() else "Utility"
