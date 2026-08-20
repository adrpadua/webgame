import { isGuardedFront } from './board'
import type { ContentCatalog } from './content/catalog'
import type { AuthoredWhen, SignatureGrant } from './content/schemas'
import { cardChargeCap } from './content/catalog'
import type { EncounterState, SlotState } from './types'

// The Signature Slot (D-064, ADR 0032): a Hero's fixed power, authored as a
// `fixed: true` card and installed as an always-present Slot at setup. This
// module owns the standing clause — the Grant, the mirror of a Counter
// Reader — and the small shared questions about a fixed Slot's Charge, which
// is a token count rather than tucked cards.

// The Grant `when`s the rules read, and which gates each can answer, live in
// the event registry (`events.ts`, ADR 0041) — one table for Grants and
// Readers both, validated by the catalog and dispatched by the raises.

// How many Charges a Slot holds right now. A fixed Slot's Charges are earned
// tokens; a deck Slot's are its tucked cards. Every rule that asks "how
// charged is this Slot" goes through here so the two representations cannot
// drift apart.
export function slotChargeCount(slot: SlotState): number {
  return slot.fixed ? slot.earnedCharges : slot.charges.length
}

// The one Signature event record on the fact stream, mirrored by
// `readSignatureEvent` the way counterEvent/readCounterEvent pair up — the
// evaluation harness reads facts through one reader so a renamed key breaks
// in exactly one place.
export function signatureEvent(cardId: string, event: string, reason: string, charges: number): Record<string, unknown> {
  return { card_id: cardId, event, reason, charges }
}

export function readSignatureEvent(
  resolutionFact: Record<string, unknown> | undefined,
): { cardId: string; event: string; reason: string; charges: number } | null {
  const raw = resolutionFact?.signature_event as Record<string, unknown> | undefined
  if (raw === undefined || typeof raw.card_id !== 'string') {
    return null
  }
  return { cardId: raw.card_id, event: String(raw.event ?? ''), reason: String(raw.reason ?? ''), charges: Number(raw.charges ?? 0) }
}

// Whether one Grant's gates all pass. Gates AND, exactly like Card Readers:
// there is no `or` and there will not be one.
//
// `counterpartId` is whoever the event puts opposite the Hero — the attacker
// for a blow taken, the target for a blow dealt — and is empty for events
// with no second party. `resolutionFact` is the event's own record, absent
// for events that produce none.
function gatesPass(
  draft: EncounterState,
  grant: SignatureGrant,
  heroId: string,
  counterpartId: string,
  resolutionFact: Record<string, unknown> | undefined,
): { pass: boolean; failed: string } {
  for (const gate of grant.gates) {
    if (gate === 'health_loss_zero' && (resolutionFact?.health_loss as number | undefined) !== 0) {
      return { pass: false, failed: 'health_lost' }
    }
    if (gate === 'guarded_front' && !isGuardedFront(draft.board, counterpartId, heroId)) {
      return { pass: false, failed: 'not_guarded_front' }
    }
    // "The fire actually did something." Without it a `slot_fired` earn is
    // farmable by firing an empty Slot at nothing, which would make the
    // earn a formality rather than a reward for correct play — the failure
    // mode the Kardia warning in the healer research note describes.
    if (gate === 'effect_landed' && (resolutionFact?.effect_landed as boolean | undefined) !== true) {
      return { pass: false, failed: 'no_effect' }
    }
  }
  return { pass: true, failed: '' }
}

// Standing-clause evaluation for one Hero at one event. Every Grant `when`
// runs through here, so the earn, the waste at the cap, and the refusal with
// its reason are recorded identically whichever event produced them — a
// Grant that did not fire always says why, the honesty the old Riposte Ready
// evaluation kept (D-064).
export interface GrantOutcome {
  cardId: string
  outcome: 'charge_granted' | 'wasted' | 'not_granted'
}

export function evaluateGrantsFor(
  catalog: ContentCatalog,
  draft: EncounterState,
  heroId: string,
  when: AuthoredWhen,
  options: {
    counterpartId?: string
    eventKeywords?: string[]
    resolutionFact?: Record<string, unknown>
  } = {},
): GrantOutcome[] {
  const outcomes: GrantOutcome[] = []
  const hero = draft.heroes[heroId]
  if (!hero) {
    return outcomes
  }
  const eventKeywords = options.eventKeywords ?? []
  const record = options.resolutionFact
  for (const slot of hero.actionBar) {
    if (!slot.fixed || slot.topCard === null) {
      continue
    }
    const card = catalog.cards[slot.topCard.cardId]
    for (const grant of card.standing) {
      if (grant.when !== when) {
        continue
      }
      // An empty event_keyword answers every blow; a named one answers only
      // the blows carrying it — the same D-049 narrowing Readers use.
      if (grant.event_keyword !== '' && !eventKeywords.includes(grant.event_keyword)) {
        continue
      }
      const verdict = gatesPass(draft, grant, heroId, options.counterpartId ?? '', record)
      if (!verdict.pass) {
        outcomes.push({ cardId: card.id, outcome: 'not_granted' })
        if (record !== undefined) {
          record.signature_event = signatureEvent(card.id, 'not_granted', verdict.failed, slot.earnedCharges)
        }
        continue
      }
      const cap = cardChargeCap(card)
      if (slot.earnedCharges >= cap) {
        // The trigger fired and the stack was full: the earn is wasted, by
        // design — overcap is the price of holding a full bank (D-064
        // decision 8), and it has to be visible to the player and the cohort
        // alike, never silently absorbed.
        outcomes.push({ cardId: card.id, outcome: 'wasted' })
        if (record !== undefined) {
          record.signature_event = signatureEvent(card.id, 'wasted', 'at_max', slot.earnedCharges)
        }
        continue
      }
      slot.earnedCharges = Math.min(cap, slot.earnedCharges + grant.grants_charge)
      outcomes.push({ cardId: card.id, outcome: 'charge_granted' })
      if (record !== undefined) {
        record.signature_event = signatureEvent(card.id, 'charge_granted', 'standing_clause', slot.earnedCharges)
      }
    }
  }
  return outcomes
}
