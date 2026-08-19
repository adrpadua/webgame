import type { Card, ChargeModifier } from './content/schemas'
import type { ContentCatalog } from './content/catalog'

export interface FireEffects {
  armor: number
  armorNextRound: number
  healing: number
  bossDamage: number
  targetDamage: number
  drawCount: number
  burstRadius: number
  pushTiles: number
  pullTiles: number
}

function matchingCount(modifier: ChargeModifier, chargeStack: Card[], tokenCharges: number): number {
  if (modifier.keyword_id === '') {
    return chargeStack.length + tokenCharges
  }
  return chargeStack.filter((card) => card.tags.includes(modifier.keyword_id)).length
}

// A tucked card always adds one Charge but grants no universal bonus; only
// the Top Card's explicit Charge Modifiers read the Charge Stack.
// `tokenCharges` is a fixed Slot's earned Charge count (D-064): a token has
// no card and no Keywords, so it matches only keyword-less modifiers — which
// the catalog enforces is the only kind a Signature carries.
export function resolveFire(catalog: ContentCatalog, card: Card, chargeStack: Card[], tokenCharges = 0): FireEffects {
  const result: FireEffects = {
    armor: card.armor_delta,
    armorNextRound: card.armor_next_round,
    healing: card.healing,
    bossDamage: card.boss_damage,
    targetDamage: card.damage,
    drawCount: card.draw_count,
    burstRadius: card.burst_radius,
    pushTiles: card.push_tiles,
    pullTiles: card.pull_tiles,
  }
  for (const modifierId of card.charge_modifiers) {
    const modifier = catalog.chargeModifiers[modifierId]
    if (!modifier) {
      continue
    }
    const bonus = modifier.amount_per_match * matchingCount(modifier, chargeStack, tokenCharges)
    switch (modifier.effect) {
      case 'armor':
        result.armor += bonus
        break
      case 'healing':
        result.healing += bonus
        break
      case 'boss_damage':
        result.bossDamage += bonus
        break
      case 'target_damage':
        result.targetDamage += bonus
        break
    }
  }
  return result
}
