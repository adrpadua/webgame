import { cardChargeCap } from './content/catalog'
import type { ContentCatalog } from './content/catalog'
import { applyAction, checkResolution } from './resolve'
import { ESCALATION_MAX, escalationActionsForRoundEnd, escalationModifiers, minionDemandTerms } from './escalation'
import { detonationDue, minionDetonation, minionIntent } from './minions'
import { actionsForTrack, refreshTelegraphs } from './timeline'
import { RAID_HIT } from './keywords'
import { ENCOUNTER_SOURCE, type EncounterActionInput } from './actions'
import type { EncounterState, Phase, ResolveResult, ResolvedActionFact } from './types'

function advanceAction(fromPhase: Phase, toPhase: Phase, round: number): EncounterActionInput {
  return { kind: 'advance_phase', sourceId: ENCOUNTER_SOURCE, fromPhase, toPhase, round }
}

// Emits the Full-Charge Cleanup actions for every Slot matching the rule: the
// Slot activated in this window and its Charge Stack equals the Charge Value.
// A fixed Slot is exempt structurally, not by a guard here (ADR 0032's
// exception to ADR 0008): its `charges` array is always empty — legality
// refuses both hand routes onto a Signature — and its earned token stack was
// already spent by the fire itself, so this predicate can never match one.
// The behavioural pin is the engine test that fires the Signature at its
// whole cap and watches the window close without a cleanup.
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

// Advances one phase boundary; every mutation it causes rides an action, and
// the returned facts are the complete ordered slice it produced (ADR 0015).
//
// Boss Rows resolve when their window OPENS: the batch that enters Boss
// Instant carries the Instant Row, and the batch that enters Boss Incoming
// carries the Incoming Row, so the phase on every boss fact — and on the
// state a client shows while those facts play out — is the Boss's own window
// (ADR 0024). Replay compatibility constrains any rebatching here: the
// per-Round event order is fixed and only batch boundaries may move, so
// replayed Scenarios reach identical states at every player window.
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
      for (const action of actionsForTrack(catalog, draft, 'instant')) {
        submit(action)
      }
      break
    case 'instant':
      submit(advanceAction('instant', 'quick', draft.round))
      refreshTelegraphs(catalog, draft)
      break
    case 'quick': {
      for (const action of cleanupActions(catalog, draft, 'quick')) {
        submit(action)
      }
      submit(advanceAction('quick', 'incoming', draft.round))
      // The Minion fuses (D-063), before the Boss acts. A Whelp's clock is its
      // own: it was set when the Whelp arrived, so what the Boss does this
      // Round must not decide when it runs out. Resolving first also means the
      // hexes a blast frees are available to the spawn telegraph re-aimed
      // below, rather than being counted as occupied by pieces that are gone.
      //
      // Collected before the loop, because the list is what detonates: a
      // detonation removes its own Minion, and reading the live board mid-loop
      // would be iterating a collection the loop is emptying.
      let detonated = false
      for (const minionId of Object.values(draft.board.entities)
        .filter((entity) => entity.kind === 'minion' && detonationDue(draft, entity.id))
        .map((entity) => entity.id)) {
        if (!draft.active) {
          break
        }
        if (minionDetonation(catalog, draft, minionId) !== null) {
          submit({ kind: 'detonate_minion', sourceId: minionId })
          detonated = true
        }
      }
      // A Whelp reaching its fuse IS the Brood Call going unanswered, so the
      // Beat's authored `escalation_if_unanswered` is charged here rather than
      // at the Round-end step a detonating Whelp can never reach. Without it a
      // party that simply stepped out of the blast paid nothing at all for the
      // adds, and the measured sweep put a solo victory on the board — a
      // tuning defect by definition (D-016).
      //
      // Once per Round, not once per Whelp, because that is the rate the
      // Round-end demand charged at and this is the same demand moved rather
      // than a new one: billing each Whelp separately front-loads the same
      // total into one Round and pulls the collapse forward half a Round
      // across the sweep. Clearing part of a brood is still paid for — in the
      // blasts that never land — just not in Escalation.
      if (detonated && draft.active) {
        const demand = minionDemandTerms(catalog, draft)
        if (demand.amount > 0) {
          submit({
            kind: 'gain_escalation',
            sourceId: ENCOUNTER_SOURCE,
            amount: demand.amount,
            reason: 'unanswered_minions',
            beatId: demand.beatId,
          })
        }
      }
      if (!draft.active) {
        return { state: draft, facts }
      }
      // Re-aim the telegraphs before the Incoming Row resolves.
      refreshTelegraphs(catalog, draft)
      for (const action of actionsForTrack(catalog, draft, 'incoming')) {
        submit(action)
      }
      break
    }
    case 'incoming':
      submit(advanceAction('incoming', 'slow', draft.round))
      break
    case 'slow': {
      for (const action of cleanupActions(catalog, draft, 'slow')) {
        submit(action)
      }
      // The Minion end step (D-006): each living Minion, in spawn order,
      // bites its nearest Hero when adjacent or advances one hex toward
      // them — before the Round wraps, so bites meet the Round's remaining
      // Armor. Each intent is recomputed from the live draft, so a later
      // Minion sees the positions its predecessors just took.
      const minionIds = Object.values(draft.board.entities)
        .filter((entity) => entity.kind === 'minion')
        .map((entity) => entity.id)
      for (const minionId of minionIds) {
        if (!draft.active) {
          break
        }
        const intent = minionIntent(catalog, draft, minionId)
        if (!intent) {
          continue
        }
        if (intent.damage > 0) {
          const escalationBonus = escalationModifiers(draft).minionDamageBonus
          submit({
            kind: 'damage',
            sourceId: minionId,
            targetId: intent.targetHeroId,
            amount: intent.damage + escalationBonus,
            reasonText: `${draft.board.entities[minionId].title} bites`,
            factContext: {
              minion_intent: true,
              damage_keywords: [RAID_HIT],
              ...(escalationBonus > 0 ? { escalation_bonus: escalationBonus } : {}),
            },
          })
        } else if (intent.route.length > 0) {
          // The same action the Boss's movement clause emits (D-069). A Minion
          // crossing the board is the same event as a Boss crossing it, and the
          // separate `move_minion` action retired because it quietly differed:
          // it applied no Hazard entry at all, so a Whelp crossing ground the
          // party had laid walked through it for free.
          submit({
            kind: 'traverse_piece',
            sourceId: minionId,
            path: intent.route,
            traversal: catalog.minions[draft.board.entities[minionId].contentId ?? '']?.traversal ?? 'walk',
            reasonText: `${draft.board.entities[minionId].title} advances`,
          })
        }
      }
      if (!draft.active) {
        return { state: draft, facts }
      }
      // The Escalation step (ADR 0027): the automatic tick once it has begun,
      // then acceleration for any demand still standing — after the Minion end
      // step, so a bite that downs the Hero resolves first. Escalation is the
      // only clock, so its top threshold ends the fight; there is no separate
      // round-limit check.
      for (const action of escalationActionsForRoundEnd(catalog, draft)) {
        submit(action)
      }
      const nextRound = draft.round + 1
      if (draft.escalation >= ESCALATION_MAX) {
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
