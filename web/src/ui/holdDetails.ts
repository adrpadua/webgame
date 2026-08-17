import {
  cardChargeCap,
  cardWindowSpeed,
  type BossBeat,
  type BossProgram,
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
  presence: 'presence',
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
  if (card.presence_delta > 0) {
    stats.push({ label: 'Presence', value: `+${card.presence_delta}` })
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

// The whole Boss Program in one popup: both tracks, in resolution order,
// each beat with the number that matters. Held from the program strip.
export function programDetail(program: BossProgram): HoldDetail {
  const line = (beat: BossBeat): { label: string; value: string } => {
    const parts: string[] = []
    if (beat.damage > 0) {
      parts.push(`${beat.damage} dmg`)
    }
    if (beat.minion !== undefined) {
      parts.push(`${beat.count} ${beat.minion}`)
    }
    if (beat.hazard !== undefined) {
      parts.push(beat.hazard)
    }
    return { label: beat.title, value: parts.length > 0 ? parts.join(' · ') : '—' }
  }
  return {
    id: `program:${program.id}`,
    title: program.title,
    badge: 'Boss program',
    tone: 'boss',
    stats: [
      { label: 'INSTANT', value: 'resolves now' },
      ...program.instant_beats.map(line),
      { label: 'INCOMING', value: 'after your Quick' },
      ...program.incoming_beats.map(line),
    ],
    text: program.rules_text,
  }
}

// One beat on its own: what it does, what it leaves behind, what answers
// it. Hovered from a chip in the program strip.
export function beatDetail(beat: BossBeat, track: 'instant' | 'incoming'): HoldDetail {
  const stats: { label: string; value: string }[] = []
  if (beat.damage > 0) {
    stats.push({ label: 'Damage', value: String(beat.damage) })
  }
  if (beat.target_selector !== '') {
    stats.push({ label: 'Target', value: beat.target_selector })
  }
  if (beat.minion !== undefined) {
    stats.push({ label: 'Spawns', value: `${beat.count} ${beat.minion}` })
  }
  if (beat.hazard !== undefined) {
    stats.push({ label: 'Leaves', value: `${beat.hazard} · ${beat.duration_rounds} round${beat.duration_rounds === 1 ? '' : 's'}` })
  }
  return {
    id: `beat:${track}:${beat.id}`,
    title: beat.title,
    badge: track === 'instant' ? 'Instant' : 'Incoming',
    tone: 'boss',
    stats,
    text: beat.rules_text,
    tags: beat.counter_tags,
  }
}

export const HERO_STAT_DETAILS: Record<'health' | 'armor' | 'presence' | 'cards', Omit<HoldDetail, 'stats'>> = {
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
  presence: {
    id: 'hero:presence',
    title: 'Presence',
    tone: 'presence',
    text: 'Your hold on the fight. Presence cards build it for effects that read it.',
  },
  cards: {
    id: 'hero:cards',
    title: 'Deck and discard',
    tone: 'neutral',
    text: 'Your Hand refills at the end of every Round. An empty deck reshuffles the discard pile.',
  },
}
