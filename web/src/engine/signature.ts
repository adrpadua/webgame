import { isGuardedFront } from './board'
import type { ContentCatalog } from './content/catalog'
import type { SignatureGrant } from './content/schemas'
import { cardChargeCap } from './content/catalog'
import type { EncounterActionInput } from './actions'
import type { EncounterState, SlotState } from './types'

// The Signature Slot (D-057, ADR 0032): a Hero's fixed power, authored as a
// `fixed: true` card and installed as an always-present Slot at setup. This
// module owns the standing clause — the Grant, the mirror of a Counter
// Reader — and the small shared questions about a fixed Slot's Charge, which
// is a token count rather than tucked cards.

// The Grant `when`s the rules actually read, mirroring READABLE_READER_PAIRS'
// discipline in `counters.ts`: the schema's enum stays aligned with the
// Reader vocabulary, and authoring a `when` nothing evaluates is a load error
// rather than a Grant that silently never fires. Teaching the rules a new
// event means adding it here and reading it where that event resolves.
export const EVALUATED_GRANT_WHENS = ['host_takes_damage'] as const

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

// Whether one Grant's gates all pass for one resolved damage event. Gates
// AND, exactly like Card Readers: there is no `or` and there will not be one.
function gatesPass(
  draft: EncounterState,
  grant: SignatureGrant,
  heroId: string,
  attackerId: string,
  resolutionFact: Record<string, unknown>,
): { pass: boolean; failed: string } {
  for (const gate of grant.gates) {
    if (gate === 'health_loss_zero' && (resolutionFact.health_loss as number) !== 0) {
      return { pass: false, failed: 'health_lost' }
    }
    if (gate === 'guarded_front' && !isGuardedFront(draft.board, attackerId, heroId)) {
      return { pass: false, failed: 'not_guarded_front' }
    }
  }
  return { pass: true, failed: '' }
}

// Standing-clause evaluation for a resolved damage action: the
// `host_takes_damage` event, the only Grant `when` the rules read today. The
// evaluation is always recorded on the resolution fact — a Grant that did
// not fire says why, the same honesty the old Riposte Ready evaluation kept —
// and an earn while the stack is full is recorded as waste, because overcap
// is the Signature's one loss surface and the cohort has to be able to count
// it (D-057).
export function evaluateStandingGrants(
  catalog: ContentCatalog,
  draft: EncounterState,
  action: Extract<EncounterActionInput, { kind: 'damage' }>,
  resolutionFact: Record<string, unknown>,
): void {
  const hero = draft.heroes[action.targetId]
  if (!hero) {
    return
  }
  const eventKeywords = (resolutionFact.damage_keywords as string[] | undefined) ?? []
  for (const slot of hero.actionBar) {
    if (!slot.fixed || slot.topCard === null) {
      continue
    }
    const card = catalog.cards[slot.topCard.cardId]
    for (const grant of card.standing) {
      if (grant.when !== 'host_takes_damage') {
        continue
      }
      // An empty event_keyword answers every blow; a named one answers only
      // the blows carrying it — the same D-049 narrowing Readers use.
      if (grant.event_keyword !== '' && !eventKeywords.includes(grant.event_keyword)) {
        continue
      }
      const verdict = gatesPass(draft, grant, action.targetId, action.sourceId, resolutionFact)
      if (!verdict.pass) {
        resolutionFact.signature_event = signatureEvent(card.id, 'not_granted', verdict.failed, slot.earnedCharges)
        continue
      }
      const cap = cardChargeCap(card)
      if (slot.earnedCharges >= cap) {
        // The trigger fired and the stack was full: the earn is wasted, by
        // design — overcap is the price of holding a full bank (D-057
        // decision 8), and it has to be visible to the player and the cohort
        // alike, never silently absorbed.
        resolutionFact.signature_event = signatureEvent(card.id, 'wasted', 'at_max', slot.earnedCharges)
        continue
      }
      slot.earnedCharges = Math.min(cap, slot.earnedCharges + grant.grants_charge)
      resolutionFact.signature_event = signatureEvent(card.id, 'charge_granted', 'standing_clause', slot.earnedCharges)
    }
  }
}
