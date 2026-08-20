# Healer Archetype Statements

Status: adopted design direction (D-080). One page per Archetype, written before either deck is authored, so the two cannot converge by accident — the Second Hero Of A Role rule applied from the first Healer rather than retrofitted at the second.

Both must pass the same Role recognition test: a player who has mained a Healer in any MMO or Hero Shooter recognizes the job in one Round. What differs is the machine, its signature weakness, and the pressure it answers best.

## The Restorative

**One sentence:** the Restorative undoes what already landed and removes what would make the next blow worse, and is paid for knowing *who* to cover before the Boss confirms it.

**Machine.** Direct heals routed to a chosen ally (`target_type: "ally"`), cleansing (`spend` readers aimed at Boss-placed marks), and one conversion mechanic: healing pushed above an ally's maximum converts one-to-one into Boss damage, capped at the card's printed healing. Overflow is her entire damage game — she prints no damage cards — so her Boss pressure exists exactly when she reads the Timeline correctly and overheals the Hero who is about to be hit.

**Signature.** Charges only from converted overflow (`host_deals_damage` + `effect_landed`), banks to 2, and spends all Charges to place a pre-emptive cover that turns an ally's next incoming blow into healing. The earn and the payoff ask one question: who is about to be hit.

**Answers best:** residual attrition — the Seared mark and its family, damage that Armor cannot answer because Armor answers blows and never marks.

**Signature weakness:** she has no tempo of her own. Nothing in her kit forces the Boss's facing, moves its body, or opens a window; a Round where nobody needs healing and nobody is marked is a Round she spends banking. Her ceiling is set by how well her Party feeds her information, which is the Role's justification made into a limitation.

**Must never become:** a green-numbered Damage Hero (Healer Principle 3 forbids unconverted chip damage) or a healbot whose optimal play is reactive repair (Principle 4 — every preservation card should name the Incoming Beat it answers).

## The Enchanter

**One sentence:** the Enchanter makes the blow smaller before it exists, binding wards and augmentations to named future Beats, and is paid for committing early to a prediction that may be dodged, redirected, or wasted.

**Machine.** Pre-placed wards bound to a *named* Beat on the visible Timeline — which makes the kit's core verb a **Commitment** (D-028), a mechanic the engine does not have and no card uses yet. Augmentation of allies' Slots (`board_slot` targets carrying Counters, reachable since D-048) fills the non-ward half. Where the Restorative's skill is triage after the read, the Enchanter's is conviction before it: a ward on the wrong Beat is a card spent on nothing.

**Signature.** Undesigned, deliberately: it must wait for the Commitment seam, because a Signature designed around a mechanic that does not exist would be designed around a guess.

**Answers best:** telegraphed burst — the Cinder Breath shape, one large disclosed hit that arrives whether or not the Party repositions perfectly.

**Signature weakness:** nothing in the kit undoes damage that already landed. A missed prediction is not recoverable by playing the same kit harder — it is recoverable by the Restorative, which is what keeps the siblings from converging.

**Must never become:** a second Restorative with a shield skin. If a ward is playable *after* the blow is announced as effective as before, the Commitment discipline has failed and the two Archetypes have merged.

## Shipping Order

The Restorative ships first (D-080): her verbs exist in the engine today — ally targeting, heal routing, `revive_ally`, the four-event Signature vocabulary, `spend` readers. The Enchanter's core verb is a Commitment, ranked 9 on the engineering ladder and deferred with no consumer; authoring her first would either fake the mechanic or build the seam for a Hero that might change.

## Related

- [../../rules/character-design-bible.md](../../rules/character-design-bible.md) — Healer Design Principles, Second Hero Of A Role
- [../encounters/embermaw-brand-attrition-gate.md](../encounters/embermaw-brand-attrition-gate.md) — the authored problem the Restorative is designed against (D-082)
- [../research/2026-08-20-healer-support-taxonomies-mmo-hero-shooter.md](../research/2026-08-20-healer-support-taxonomies-mmo-hero-shooter.md) — taxonomy grounding (directional, per D-071's evidence discipline)
