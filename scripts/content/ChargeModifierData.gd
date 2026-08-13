class_name ChargeModifierData
extends Resource

enum Effect {
	ARMOR,
	HEALING,
	BOSS_DAMAGE,
	TARGET_DAMAGE,
}

@export var id: StringName
@export var title: String = "Charge Modifier"
@export_multiline var rules_text: String = ""
@export var keyword_id: StringName
@export var effect: Effect = Effect.ARMOR
@export_range(1, 99, 1) var amount_per_match: int = 1

func matching_count(charge_stack: Array) -> int:
	if keyword_id == &"":
		return charge_stack.size()
	var count := 0
	for card in charge_stack:
		if card != null and card.get_keyword_ids().has(keyword_id):
			count += 1
	return count
