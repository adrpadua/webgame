import type { ContentCatalog, EncounterState } from '@/engine'
import { selectState, type TimelinePosition } from '@/store/workbench'
import { slotCanFire } from '../actionBar/slots'

// Who still owes this window an action (D-092).
//
// Multi-character play introduced a failure a solo slice cannot have: a Hero
// whose console you are not looking at can sit through a whole window doing
// nothing, and nothing on screen says so. Total War's campaign map answers it
// with one control — the end-turn button becomes "a unit has not moved", each
// press jumps to one of them, and it goes back to end-turn when there are no
// more — and that is the shape adopted here (the ally frames nudge, the rail
// cycles). This module is the single rule both faces read, so the frame that
// breathes and the rail that offers can never disagree about who is waiting.
//
// Nothing here decides legality. "Could this Hero still act" is asked of the
// same predicates the Action Bar and the skip warning already use, so a frame
// can never nudge toward a window in which the rules would refuse everything.

// What counts as using a window: the five kinds a Scenario replays, which is
// the existing definition of "a move that advances the Encounter"
// (`SCENARIO_STEP_KINDS`). A rejected action is not one of them — facts carry
// `succeeded`, and a refused fire cost the player nothing and did nothing.
const PLAYER_ACTION_KINDS = new Set(['load_slot', 'charge_slot', 'fire_slot', 'move_hero', 'discard_for_stamina'])

// Whether this Hero has taken a player action in the window that is open now.
// Facts carry their Round and phase, so the window's own actions are simply
// the ones on the timeline that name it — no per-window bookkeeping on the
// state, and undo un-acts a Hero for free by moving the index back.
export function heroActed(position: TimelinePosition, heroId: string): boolean {
  const state = selectState(position)
  return position.entries
    .slice(0, position.index + 1)
    .some((entry) =>
      entry.facts.some(
        (fact) =>
          fact.succeeded &&
          fact.round === state.round &&
          fact.phase === state.phase &&
          fact.sourceId === heroId &&
          PLAYER_ACTION_KINDS.has(fact.kind),
      ),
    )
}

// Whether anything is still possible for this Hero in the window that is open
// now. A body on the floor is not nudged: a Downed Hero's own move is a rescue
// somebody else pays for, and its frame already carries that offer.
//
// Loadout asks the Loadout question — is a Slot still empty with a card in
// hand to fill it — because an empty Slot is what Loadout can waste. Quick and
// Slow ask the window question: a Slot that could fire, or any card in hand
// (a Charge, or a paid step). Both are the clauses the skip warning has always
// used, lifted here so the warning and the nudge stay one rule.
export function heroCanAct(catalog: ContentCatalog, state: EncounterState, heroId: string): boolean {
  const hero = state.heroes[heroId]
  if (!state.active || hero === undefined || hero.status !== 'living') {
    return false
  }
  if (state.phase === 'loadout') {
    return hero.hand.length > 0 && hero.actionBar.some((slot) => slot.topCard === null)
  }
  if (state.phase !== 'quick' && state.phase !== 'slow') {
    return false
  }
  return hero.hand.length > 0 || hero.actionBar.some((_slot, slotIndex) => slotCanFire(catalog, state, heroId, slotIndex))
}

// Every seat that has not acted and still could, in authored order. Empty in
// the Boss's own rows and on an ended Encounter, because `heroCanAct` refuses
// them — a nudge in a window nobody can act in would be a lie about the rules.
export function unactedHeroIds(catalog: ContentCatalog, position: TimelinePosition): string[] {
  const state = selectState(position)
  return state.partyHeroIds.filter((heroId) => heroCanAct(catalog, state, heroId) && !heroActed(position, heroId))
}

// The Hero the rail would hand control to, or null when the rail is Next.
//
// Two exclusions, and the second is the whole safety argument. The pilot is
// skipped because their console is the bottom half of the screen — the rail
// nudges toward the characters you are *not* looking at, and the pilot's own
// unused window is what the skip warning has always been for. And a Hero the
// rail has already offered in this window is skipped, so the cycle is finite:
// the fight can always be moved forward in at most one press per seat.
//
// That is the deliberate departure from Total War, which nags until every unit
// has actually moved. Here a Hero can be legally able to act and have nothing
// worth doing — cards in hand, no Slot in reach — and a rail that refused to
// become Next until they acted would trap the window. The frame keeps
// breathing after the offer; only the rail lets go.
export function nextNudge(
  catalog: ContentCatalog,
  position: TimelinePosition,
  pilotId: string,
  offered: readonly string[],
): string | null {
  return unactedHeroIds(catalog, position).find((heroId) => heroId !== pilotId && !offered.includes(heroId)) ?? null
}
