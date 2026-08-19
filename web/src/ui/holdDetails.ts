import {
  cardChargeCap,
  cardWindowSpeed,
  type Card,
  type ContentCatalog,
  type EncounterState,
  type Phase,
  type SlotState,
} from '@/engine'
import type { HoldDetail, HoldTone } from './HoldPopover'
import { cardEffect } from './icons'

// Every explanatory sentence the play surface owns lives here, behind a
// tap-and-hold. The HUD itself carries names, numbers, and colour; this
// module is where the words went.

const EFFECT_TONE: Record<ReturnType<typeof cardEffect>, HoldTone> = {
  attack: 'attack',
  guard: 'guard',
  heal: 'heal',
  utility: 'neutral',
}

function cardStats(card: Card): { label: string; value: string }[] {
  const stats: { label: string; value: string }[] = [{ label: 'Charge value', value: String(cardChargeCap(card)) }]
  if (card.boss_damage > 0) {
    stats.push({ label: 'Boss damage', value: String(card.boss_damage) })
  }
  if (card.damage > 0) {
    stats.push({ label: 'Piece damage', value: `${card.damage} · range ${card.range_tiles}` })
  }
  if (card.armor_delta > 0) {
    stats.push({ label: 'Armor', value: `+${card.armor_delta}` })
  }
  if (card.healing > 0) {
    stats.push({ label: 'Healing', value: `+${card.healing}` })
  }
  return stats
}

export function cardDetail(card: Card, idPrefix: string, hint?: string): HoldDetail {
  const speed = cardWindowSpeed(card)
  return {
    id: `${idPrefix}:${card.id}`,
    title: card.title,
    badge: speed === 'quick' ? 'Quick window' : 'Slow window',
    tone: EFFECT_TONE[cardEffect(card)],
    stats: cardStats(card),
    text: card.rules_text,
    tags: card.tags,
    hint,
  }
}

// A prepared Slot: the same card detail plus where this Slot stands right now.
export function slotDetail(card: Card, slot: SlotState, slotIndex: number, phase: Phase): HoldDetail {
  const speed = cardWindowSpeed(card)
  const cap = cardChargeCap(card)
  const detail = cardDetail(card, `slot-${slotIndex}`)
  const stats = [{ label: 'Charge stack', value: `${slot.charges.length} / ${cap}` }, ...cardStats(card).slice(1)]
  const hint =
    slot.activatedWindow !== null
      ? 'Already fired this window.'
      : slot.charges.length === 0
        ? 'Needs at least one Charge before it can fire.'
        : speed === phase
          ? 'Tap to fire it now.'
          : `Fires in the ${speed === 'quick' ? 'Quick' : 'Slow'} Window.`
  return { ...detail, id: `slot-${slotIndex}`, stats, hint }
}

// The Encounter's own terms — its rules text and the enrage line — shared by
// every detail that speaks for the Encounter itself: the Round clock on the
// phase row and the Boss's Stat Panel.
export function encounterTerms(catalog: ContentCatalog, state: EncounterState): Pick<HoldDetail, 'tone' | 'text' | 'hint'> {
  return { tone: 'boss', text: catalog.encounters[state.encounterId]?.rules_text, hint: state.enrageText }
}

const PHASE_DETAIL: Record<Phase, { title: string; text: string }> = {
  loadout: {
    title: 'Loadout',
    text: 'Prepare cards into your Slots, and swap a Slot if you change your mind. Nothing fires here.',
  },
  instant: {
    title: 'Boss Instant',
    text: "Embermaw's opening beats resolve immediately. There is nothing to dodge — mitigate it instead.",
  },
  quick: {
    title: 'Quick Window',
    text: 'Yours. Fire quick Slots, tuck cards in to add Charge, or discard a card to step one hex. Movement happens only here.',
  },
  incoming: {
    title: 'Boss Incoming',
    text: 'The telegraphed beats land: the marked cone burns and Whelps arrive on the marked hexes.',
  },
  slow: {
    title: 'Slow Window',
    text: 'Yours again, but slower. Slow Slots fire here, and Charge can still be added.',
  },
}

export function phaseDetail(phase: Phase, active: boolean): HoldDetail {
  const copy = PHASE_DETAIL[phase]
  return {
    id: `phase:${phase}`,
    title: copy.title,
    badge: active ? 'Now' : undefined,
    tone: phase === 'instant' || phase === 'incoming' ? 'boss' : phase === 'slow' ? 'slow' : 'quick',
    text: copy.text,
  }
}

// The Boss Program's own popup and the per-Beat popup both left with the
// program strip that held them (D-058). A Beat's numbers, reach, rules text
// and answers are printed on its Beat Card as it resolves, which is the one
// moment they are worth reading; the program's name survives as the badge on
// the Boss's Stat Panel.

export const HERO_STAT_DETAILS: Record<'health' | 'armor' | 'cards', Omit<HoldDetail, 'stats'>> = {
  health: {
    id: 'hero:health',
    title: 'Health',
    tone: 'heal',
    text: 'Reaching zero ends the Encounter. Health only moves once Armor is gone.',
  },
  armor: {
    id: 'hero:armor',
    title: 'Armor',
    tone: 'guard',
    text: 'Absorbs damage before Health, and resets to zero at the start of every Round. Spend it or lose it.',
  },
  cards: {
    id: 'hero:cards',
    title: 'Deck and discard',
    tone: 'neutral',
    text: 'Your Hand refills at the end of every Round. An empty deck reshuffles the discard pile.',
  },
}
