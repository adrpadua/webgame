class_name CardResolver
extends RefCounted

func resolve_fire(card, charge_stack: Array) -> Dictionary:
	var charge_count: int = charge_stack.size()
	return {
		"energy_cost": card.cost,
		"armor": card.armor_delta + card.charge_armor_per_card * charge_count,
		"healing": card.healing + card.charge_healing_per_card * charge_count,
		"boss_damage": card.boss_damage + card.charge_boss_damage_per_card * charge_count,
		"target_damage": card.damage + card.charge_target_damage_per_card * charge_count,
		"presence": card.presence_delta,
		"energy_delta": card.energy_delta,
	}
