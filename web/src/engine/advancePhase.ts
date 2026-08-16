import { cardChargeCap } from './content/catalog'
import type { ContentCatalog } from './content/catalog'
import { applyAction, checkResolution } from './resolve'
import { actionsForTrack, refreshTelegraphs } from './timeline'
import { getStatuses, statusEvent } from './statuses'
import { ENCOUNTER_SOURCE, type EncounterActionInput } from './actions'
import type { EncounterState, Phase, ResolveResult, ResolvedActionFact } from './types'

function advanceAction(fromPhase: Phase, toPhase: Phase, round: number): EncounterActionInput {
  return { kind: 'advance_phase', sourceId: ENCOUNTER_SOURCE, fromPhase, toPhase, round }
}

// Emits the Full-Charge Cleanup actions for every Slot matching the rule: the
// Slot activated in this window and its Charge Stack equals the Charge Value.
function cleanupActions(catalog: ContentCatalog, draft: EncounterState, window: Phase): EncounterActionInput[] {
  const actions: EncounterActionInput[] = []
  for (const heroId of Object.keys(draft.heroes)) {
    const hero = draft.heroes[heroId]
    hero.actionBar.forEach((slot, slotIndex) => {
      if (slot.topCard !== null && slot.activatedWindow === window && slot.charges.length === cardChargeCap(catalog.cards[slot.topCard.cardId])) {
        actions.push({ kind: 'full_charge_cleanup', sourceId: heroId, slotIndex, window })
      }
    })
  }
  return actions
}

function statusExpiryActions(draft: EncounterState, window: Phase): EncounterActionInput[] {
  const actions: EncounterActionInput[] = []
  for (const entityId of Object.keys(draft.statusEffects)) {
    for (const effect of getStatuses(draft, entityId)) {
      if (effect.expiresAtWindowEnd !== window) {
        continue
      }
      actions.push({
        kind: 'expire_status',
        sourceId: entityId,
        targetId: entityId,
        statusId: effect.id,
        window,
        statusEvent: statusEvent(effect, 'expired', 'expiry_window_ended'),
      })
    }
  }
  return actions
}

// Advances one phase boundary; every mutation it causes rides an action, and
// the returned facts are the complete ordered slice it produced (ADR 0015).
export function advancePhase(catalog: ContentCatalog, state: EncounterState): ResolveResult {
  if (!state.active) {
    return { state, facts: [] }
  }
  const draft = structuredClone(state)
  const facts: ResolvedActionFact[] = []
  const submit = (action: EncounterActionInput) => applyAction(catalog, draft, action, facts, 0)
  switch (draft.phase) {
    case 'loadout':
      submit(advanceAction('loadout', 'instant', draft.round))
      break
    case 'instant':
      for (const action of actionsForTrack(catalog, draft, 'instant')) {
        submit(action)
      }
      submit(advanceAction('instant', 'quick', draft.round))
      refreshTelegraphs(catalog, draft)
      break
    case 'quick':
      for (const action of statusExpiryActions(draft, 'quick')) {
        submit(action)
      }
      for (const action of cleanupActions(catalog, draft, 'quick')) {
        submit(action)
      }
      submit(advanceAction('quick', 'incoming', draft.round))
      break
    case 'incoming':
      refreshTelegraphs(catalog, draft)
      for (const action of actionsForTrack(catalog, draft, 'incoming')) {
        submit(action)
      }
      submit(advanceAction('incoming', 'slow', draft.round))
      break
    case 'slow': {
      for (const action of cleanupActions(catalog, draft, 'slow')) {
        submit(action)
      }
      const nextRound = draft.round + 1
      if (nextRound > draft.roundLimit) {
        submit({ kind: 'end_of_clock', sourceId: ENCOUNTER_SOURCE, round: nextRound, reason: draft.enrageText })
        return { state: draft, facts }
      }
      submit({ kind: 'round_start', sourceId: ENCOUNTER_SOURCE, round: nextRound })
      for (const heroId of Object.keys(draft.heroes)) {
        while (draft.heroes[heroId].hand.length < draft.heroes[heroId].refillTarget) {
          if (draft.heroes[heroId].deck.length === 0) {
            if (draft.heroes[heroId].discard.length === 0) {
              break
            }
            submit({ kind: 'shuffle_deck', sourceId: heroId, label: 'discard_shuffle' })
          }
          submit({ kind: 'draw_card', sourceId: heroId })
        }
      }
      submit(advanceAction('slow', 'loadout', nextRound))
      refreshTelegraphs(catalog, draft)
      break
    }
  }
  checkResolution(draft)
  return { state: draft, facts }
}
