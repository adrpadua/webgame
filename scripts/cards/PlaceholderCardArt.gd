class_name PlaceholderCardArt
extends RefCounted

## Placeholder card art, gathered in one place so it can be removed in one step.
##
## Two different things live here, and they do NOT have the same lifetime.
##
## BY_CARD_ID is temporary. It maps authored card ids onto borrowed paladin
## prototype art, and every entry dies once the matching card resource sets its
## own `artwork`. See docs/content/art-prompts/elian-voss-card-prompts.md for
## the prompt set that produces the replacements. When the last card sets
## `artwork`, delete BY_CARD_ID and for_card_id(), simplify CardData.get_artwork()
## to return `artwork` directly, and delete assets/art/prototype/paladin/.
##
## EMPTY_SLOT is permanent. It is what the UI draws where there is no card at
## all — an unfilled action bar slot, or the inspect overlay before a card is
## shown. That need survives real card art; only the image is a placeholder.
## Do not delete it with the rest. Re-point it at a purpose-made empty-slot
## asset instead, and keep assets/art/prototype/paladin-placeholder.png until
## that exists.

const EMPTY_SLOT := preload("res://assets/art/prototype/paladin-placeholder.png")

const BY_CARD_ID := {
	&"anchor_presence": preload("res://assets/art/prototype/paladin/tether.webp"),
	&"fortify": preload("res://assets/art/prototype/paladin/shield.webp"),
	&"guard_stance": preload("res://assets/art/prototype/paladin/invuln.webp"),
	&"intercept": preload("res://assets/art/prototype/paladin/interrupt.webp"),
	&"iron_guard": preload("res://assets/art/prototype/paladin/shield.webp"),
	&"rallying_cry": preload("res://assets/art/prototype/paladin/taunt.webp"),
	&"shield_slam": preload("res://assets/art/prototype/paladin/aoe.webp"),
	&"steady_strike": preload("res://assets/art/prototype/paladin/strike.webp"),
	&"sweeping_blow": preload("res://assets/art/prototype/paladin/aoe.webp"),
	&"taunting_challenge": preload("res://assets/art/prototype/paladin/taunt.webp"),
	&"unyielding_step": preload("res://assets/art/prototype/paladin/gapclose.webp"),
}

static func for_card_id(id: StringName) -> Texture2D:
	return BY_CARD_ID.get(id, EMPTY_SLOT)
