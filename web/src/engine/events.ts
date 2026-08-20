import { combatantRef, readerMatches } from './counters'
import { evaluateGrantsFor } from './signature'
import type { ContentCatalog } from './content/catalog'
import type { AuthoredWhen } from './content/schemas'
import { AUTHORED_WHENS } from './content/schemas'
import type { EncounterActionInput } from './actions'
import type { EncounterState } from './types'

// The event registry (ADR 0041): the one table naming, per event the engine
// raises, the moment it fires, the payload keys a subscriber may read, and
// which authored subscriptions may hear it. `READABLE_READER_PAIRS` and the
// `EVALUATED_GRANT_WHENS`/`GATES_BY_WHEN` pair collapsed into this table; the
// catalog validates authored content against it, and the raise helpers below
// are the only dispatch path, so a `when` the table does not hear is a load
// error rather than a subscription that silently never fires.
//
// A subscription names the *stance* a host takes toward a raise — the target
// of a blow reads `host_damage_incoming`, its source reads
// `host_deals_damage` — so one raise can be heard by two hosts under two
// authored words. D-085 split the takes-side words because one string named
// both moments; the deal side still shares `host_deals_damage` between a
// Reader (modifier, at `damage_incoming`) and a Grant (reaction, at
// `damage_resolved`), which the table at least makes visible.
//
// Ordering is a rule, not an accident (ADR 0041): subscribers fire in raise
// order, then in host order (Party seat order for Hero hosts, board creation
// order for the rest), then in each row's declared `hears` order, then by
// authored index within a host.

export type SubscriberKind = 'reader' | 'grant'

export interface EventSubscription {
  kind: SubscriberKind
  when: AuthoredWhen
  // Reader rows: the effects that may be summed off this event.
  effects: readonly string[]
  // Grant rows: the gates this event can answer. A gate is a question about
  // a moment, and only the moment can say which questions cohere.
  gates: readonly string[]
  // Whether the event is a blow carrying damage Keywords, so an
  // `event_keyword` narrowing has something to match (D-049).
  carriesKeywords: boolean
}

export interface EventRow {
  moment: string
  payload: readonly string[]
  hears: readonly EventSubscription[]
}

const reader = (when: AuthoredWhen, effects: readonly string[], carriesKeywords: boolean): EventSubscription => ({
  kind: 'reader',
  when,
  effects,
  gates: [],
  carriesKeywords,
})

const grant = (when: AuthoredWhen, gates: readonly string[], carriesKeywords: boolean): EventSubscription => ({
  kind: 'grant',
  when,
  effects: [],
  gates,
  carriesKeywords,
})

export const EVENT_REGISTRY: Record<string, EventRow> = {
  // The blow before mitigation. Subscribers may change the number, which is
  // why Sundered and Seared (target side) and Weakened and Heat (source side)
  // resolve here, upstream of Armor, so Armor still answers the number the
  // Party can read.
  damage_incoming: {
    moment: 'inside applyDamage, before the Underwritten conversion and before Armor',
    payload: ['amount', 'damage_keywords', 'source_id', 'target_id'],
    hears: [
      reader('host_damage_incoming', ['target_damage'], true),
      reader('host_deals_damage', ['target_damage'], true),
    ],
  },
  // The blow after it lands. Subscribers only react: `health_loss_zero` and
  // `guarded_front` are questions about the outcome, and `effect_landed` on
  // the dealing side is what stops an offensive earn being farmed by a blow
  // that cost nothing (ADR 0037).
  damage_resolved: {
    moment: 'in the damage action resolution, after applyDamage and the Downed check',
    payload: ['health_loss', 'requested', 'prevented', 'damage_keywords', 'source_id', 'target_id'],
    hears: [
      grant('host_takes_damage', ['health_loss_zero', 'guarded_front'], true),
      grant('host_deals_damage', ['effect_landed'], true),
    ],
  },
  // A Slot fired. Grants are heard before Readers — the row's order is the
  // rule — matching the resolution order the fire_slot case always had.
  slot_fired: {
    moment: 'in the fire_slot resolution, after the card effects apply',
    payload: ['effect_landed'],
    hears: [
      grant('slot_fired', ['effect_landed'], false),
      reader('slot_fired', ['boss_damage'], false),
    ],
  },
  // The Round boundary. The Reader pays out banked Armor before the Grant
  // evaluates, so a Grant reads the Round as it has settled, never mid-wipe.
  round_start: {
    moment: 'in the round_start resolution, after the Armor wipe and before Counter upkeep',
    payload: [],
    hears: [
      reader('round_start', ['armor'], false),
      grant('round_start', [], false),
    ],
  },
}

// Every authored `when` must be heard by some row, or adding a sixth value to
// the schema enum without teaching the rules to read it would ship a
// subscription that silently never fires — the exact trap the two old guard
// tables existed to close, now closed once, at module load.
{
  const heard = new Set(Object.values(EVENT_REGISTRY).flatMap((row) => row.hears.map((sub) => sub.when)))
  for (const when of AUTHORED_WHENS) {
    if (!heard.has(when)) {
      throw new Error(`event registry hears no subscription for authored when ${when}; add a row or remove the enum value`)
    }
  }
}

function subscriptions(kind: SubscriberKind): EventSubscription[] {
  return Object.values(EVENT_REGISTRY).flatMap((row) => row.hears.filter((sub) => sub.kind === kind))
}

// The catalog's guard surface, derived rather than hand-kept.
export function readerSubscription(when: string, effect: string): EventSubscription | undefined {
  return subscriptions('reader').find((sub) => sub.when === when && sub.effects.includes(effect))
}

export function grantSubscription(when: string): EventSubscription | undefined {
  return subscriptions('grant').find((sub) => sub.when === when)
}

export function readableReaderPairs(): string[] {
  return subscriptions('reader').flatMap((sub) => sub.effects.map((effect) => `${sub.when}/${effect}`))
}

export function evaluatedGrantWhens(): string[] {
  return subscriptions('grant').map((sub) => sub.when)
}

export function whenCarriesKeywords(kind: SubscriberKind, when: string): boolean {
  return subscriptions(kind).some((sub) => sub.when === when && sub.carriesKeywords)
}

// One matched subscriber on one raise, recorded in the raising action's fact
// detail whenever at least one matched. A raise nothing heard records
// nothing.
export interface SubscriberMatch {
  event: string
  host: string
  kind: SubscriberKind
  id: string
  when: AuthoredWhen
  delta?: number
  outcome?: string
}

// Host order within a raise: Party seat order for Hero hosts, then board
// creation order for everything else. Stated so that the Round several
// Heroes' Counters answer the same blow resolves in an order a player can
// hold, not one the host language happened to pick.
export function hostOrder(draft: EncounterState, entityIds: string[]): string[] {
  const unique = [...new Set(entityIds)].filter((id) => id !== '')
  const boardOrder = Object.keys(draft.board.entities)
  const key = (id: string): number => {
    const seat = draft.partyHeroIds.indexOf(id)
    if (seat >= 0) {
      return seat
    }
    const created = boardOrder.indexOf(id)
    return draft.partyHeroIds.length + (created >= 0 ? created : boardOrder.length)
  }
  return unique.sort((a, b) => key(a) - key(b))
}

// --- Raises ---

export interface DamageIncomingRaise {
  delta: number
  matches: SubscriberMatch[]
}

// The pre-mitigation raise. Both stances answer with the same summable
// effect, so the raise returns one signed delta on the blow's number plus
// who contributed what.
export function raiseDamageIncoming(
  draft: EncounterState,
  sourceId: string,
  targetId: string,
  damageKeywords: string[],
): DamageIncomingRaise {
  const matches: SubscriberMatch[] = []
  let delta = 0
  for (const host of hostOrder(draft, [targetId, sourceId])) {
    const when: AuthoredWhen = host === targetId ? 'host_damage_incoming' : 'host_deals_damage'
    for (const match of readerMatches(draft, combatantRef(host), when, 'target_damage', damageKeywords)) {
      matches.push({ event: 'damage_incoming', host, kind: 'reader', id: match.counterId, when, delta: match.contribution })
      delta += match.contribution
    }
  }
  return { delta, matches }
}

// The post-resolution raise: the two halves of a resolved blow. The Hero who
// took it reads `host_takes_damage`; the Hero who landed it reads
// `host_deals_damage`, the earn an offensive machine is built on (ADR 0037).
// The dealing side evaluates against a copy of the fact carrying
// `effect_landed`, exactly as it did before the registry: a blow that landed
// is one that actually cost the target health.
export function raiseDamageResolved(
  catalog: ContentCatalog,
  draft: EncounterState,
  action: Extract<EncounterActionInput, { kind: 'damage' }>,
  resolutionFact: Record<string, unknown>,
): SubscriberMatch[] {
  const eventKeywords = (resolutionFact.damage_keywords as string[] | undefined) ?? []
  const matches: SubscriberMatch[] = []
  for (const host of hostOrder(draft, [action.targetId, action.sourceId])) {
    const when: AuthoredWhen = host === action.targetId ? 'host_takes_damage' : 'host_deals_damage'
    const record =
      when === 'host_takes_damage'
        ? resolutionFact
        : { ...resolutionFact, effect_landed: (resolutionFact.health_loss as number) > 0 }
    const counterpartId = host === action.targetId ? action.sourceId : action.targetId
    for (const outcome of evaluateGrantsFor(catalog, draft, host, when, { counterpartId, eventKeywords, resolutionFact: record })) {
      matches.push({ event: 'damage_resolved', host, kind: 'grant', id: outcome.cardId, when, outcome: outcome.outcome })
    }
  }
  return matches
}

export interface SlotFiredRaise {
  generated: EncounterActionInput[]
  matches: SubscriberMatch[]
}

// The Slot-fired raise: the Grant hears it first (the row's order), then the
// Reader answers with bonus Boss damage as a generated action on the funnel.
export function raiseSlotFired(
  catalog: ContentCatalog,
  draft: EncounterState,
  heroId: string,
  resolutionFact: Record<string, unknown>,
): SlotFiredRaise {
  const matches: SubscriberMatch[] = []
  for (const outcome of evaluateGrantsFor(catalog, draft, heroId, 'slot_fired', { resolutionFact })) {
    matches.push({ event: 'slot_fired', host: heroId, kind: 'grant', id: outcome.cardId, when: 'slot_fired', outcome: outcome.outcome })
  }
  const generated: EncounterActionInput[] = []
  let bonus = 0
  for (const match of readerMatches(draft, combatantRef(heroId), 'slot_fired', 'boss_damage')) {
    matches.push({ event: 'slot_fired', host: heroId, kind: 'reader', id: match.counterId, when: 'slot_fired', delta: match.contribution })
    bonus += match.contribution
  }
  if (bonus > 0 && draft.bossId !== heroId) {
    generated.push({ kind: 'damage', sourceId: heroId, targetId: draft.bossId, amount: bonus, reasonText: 'counter_reader' })
  }
  return { generated, matches }
}

// The Round-boundary raise, host by host in seat order: wipe, pay out banked
// Armor (the Reader), then evaluate the Grant against the settled Round.
export function raiseRoundStart(catalog: ContentCatalog, draft: EncounterState): SubscriberMatch[] {
  const matches: SubscriberMatch[] = []
  for (const heroId of hostOrder(draft, Object.keys(draft.heroes))) {
    const hero = draft.heroes[heroId]
    hero.armor = 0
    let armor = 0
    for (const match of readerMatches(draft, combatantRef(heroId), 'round_start', 'armor')) {
      matches.push({ event: 'round_start', host: heroId, kind: 'reader', id: match.counterId, when: 'round_start', delta: match.contribution })
      armor += match.contribution
    }
    hero.armor += Math.max(armor, 0)
    for (const outcome of evaluateGrantsFor(catalog, draft, heroId, 'round_start')) {
      matches.push({ event: 'round_start', host: heroId, kind: 'grant', id: outcome.cardId, when: 'round_start', outcome: outcome.outcome })
    }
  }
  return matches
}
