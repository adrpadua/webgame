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
func resolve(boss, player, hex_grid) -> String:
	var parts: Array[String] = []
	if tank_damage > 0:
		var tank_dealt: int = player.take_damage(tank_damage)
		parts.append("Tank hit %d" % tank_dealt)
	if raid_damage > 0:
		var raid_dealt: int = player.take_damage(raid_damage)
		parts.append("Raid hit %d" % raid_dealt)
	if cleave_damage > 0:
		var cleared: int = hex_grid.damage_enemy_front(cleave_damage)
		parts.append("cleave disrupts %d minion(s)" % cleared)
	if summon_minions > 0:
		var summoned: int = hex_grid.spawn_enemy_wave(summon_minions)
		parts.append("summons %d raider(s)" % summoned)
	if heal_boss > 0:
		boss.heal(heal_boss)
		parts.append("%s recovers %d" % [boss.boss_name, heal_boss])
	if parts.is_empty():
		return "%s studies the party." % boss.boss_name
	return "%s: %s." % [boss.boss_name, ", ".join(parts)]

func get_damage_profile() -> String:
	var profiles: Array[String] = []
	if tank_damage > 0:
		profiles.append("Tank %d" % tank_damage)
	if raid_damage > 0:
		profiles.append("Raid %d" % raid_damage)
	return " + ".join(profiles) if not profiles.is_empty() else "Utility"
