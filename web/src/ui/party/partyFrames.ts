import {
  cardChargeCap,
  currentProgram,
  heroRole,
  legality,
  rescueDeadlineRound,
  selectBeatTarget,
  type ContentCatalog,
  type EncounterState,
} from '@/engine'

// The ally frames (party-frame layout direction 1A): the primary Hero's frame
// with the console removed — a readout, not a console. This module is the
// frame's whole state as one pure function, the same one-definition
// discipline `heroFrame.ts` keeps for the Signature control, so the component
// and the tests read the same answer to every question a frame shows.
//
// One field here is an action, not a readout: `revivable`. The mock's rule is
// that a frame at rest owes no tap target, and in the moment a legal ally
// action exists the frame itself becomes the button. Legality is asked of the
// engine's own predicate (ADR 0014) rather than re-derived, so the frame can
// never light up for a rescue `submit` would refuse.

export interface PartyFrameModel {
  heroId: string
  name: string
  // The Role keyword the seat's whole deck agrees on, or '' where it names
  // none — the same read the Boss's target selector uses (ADR 0035).
  role: string
  status: 'living' | 'downed' | 'incapacitated'
  health: number
  maxHealth: number
  armor: number
  // Rounds before the rescue window closes: 1 on the Round the Hero fell, 0
  // on the deadline Round itself. Meaningful only while `status` is 'downed'.
  rescueRoundsLeft: number
  // The ally's own Signature bank — every seat may field one (ADR 0035) — or
  // 0/0 where this seat fields none.
  signatureCharges: number
  signatureCap: number
  // The Boss's attention (mock: the Threat mark, ember coral): this Hero is
  // who the current program's first Role-selecting Beat resolves to. It names
  // the Boss's plan, not the Hero's state, so it reads the same selector the
  // Beat will use rather than a parallel rule.
  threat: boolean
  // The one legal action this frame can carry: the primary Hero reviving this
  // Downed ally. True only when the engine's own legality predicate says a
  // `revive_ally` would be accepted.
  revivable: boolean
  // This seat has not acted in the open window and still could: the frame
  // carries the unspent pip until the Hero acts, the window closes, or the
  // player takes control. Passed in rather than derived here because the answer
  // is a reading of the session timeline (`unacted.ts`) and a frame model is a
  // reading of one Encounter state — the frame renders the answer, it does not
  // own it.
  unacted: boolean
  // ...and this is the seat the forward rail's next press hands over to: one
  // frame at most, and always one that is also `unacted`. The distinction is
  // the difference between "this seat owes the window an action" and "the
  // button at your thumb goes here", which at three seats are no longer the
  // same claim about three identical marks.
  nextUp: boolean
}

// What the nudge rule says about the open window, as the column needs it: who
// owes an action, and which one the rail is pointing at. One argument rather
// than two lists, because they are one reading taken at one moment — passing
// them separately invites a caller to compute them from different positions on
// the timeline, and then the pip and the rail would disagree about who is next.
export interface NudgeReading {
  unacted: readonly string[]
  nextUp: string | null
}

// Who the Boss's current program is aimed at, by the same selection the Beats
// themselves run. '' when no Beat in the program names a Role.
function threatHeroId(catalog: ContentCatalog, state: EncounterState): string {
  const program = currentProgram(catalog, state)
  if (!program) {
    return ''
  }
  const beat = [...program.instant_beats, ...program.incoming_beats].find((entry) => entry.target_selector !== '')
  if (!beat) {
    return ''
  }
  return selectBeatTarget(catalog, state, beat).heroId
}

// Whether the primary Hero could legally revive this ally right now. The
// engine's predicate wants a specific card, but which card pays is the
// player's later choice; any hand card probes the rest of the rule (living
// rescuer, Downed target, adjacency) because the cost is one card, not one
// particular card.
function reviveIsLegal(catalog: ContentCatalog, state: EncounterState, targetId: string): boolean {
  const probe = state.heroes[state.primaryHeroId]?.hand[0]
  if (!probe) {
    return false
  }
  return legality(catalog, state, {
    kind: 'revive_ally',
    sourceId: state.primaryHeroId,
    targetId,
    cardInstanceId: probe.instanceId,
  }).legal
}

// Every seat but the primary, in authored order — the column reads seats the
// way the Encounter authored them, so two sessions of the same Encounter show
// the same stack.
export function partyFrames(
  catalog: ContentCatalog,
  state: EncounterState,
  pilotId: string = state.primaryHeroId,
  nudge: NudgeReading = { unacted: [], nextUp: null },
): PartyFrameModel[] {
  const aimedAt = threatHeroId(catalog, state)
  // Every seat but the pilot's: the column shows whoever the console does
  // not, so switching control swaps a Hero out of the column and the
  // displaced one in, symmetrically.
  return state.partyHeroIds
    .filter((heroId) => heroId !== pilotId)
    .map((heroId) => {
      const hero = state.heroes[heroId]
      const definition = catalog.heroes[heroId]
      const signatureSlot = hero.actionBar.find((slot) => slot.fixed && slot.topCard !== null)
      const signatureCard = signatureSlot ? catalog.cards[(signatureSlot.topCard as { cardId: string }).cardId] : null
      return {
        heroId,
        name: definition?.title ?? heroId,
        role: heroRole(catalog, state.encounterId, heroId),
        status: hero.status,
        health: hero.health,
        maxHealth: hero.maxHealth,
        armor: hero.armor,
        rescueRoundsLeft: hero.status === 'downed' ? Math.max(rescueDeadlineRound(hero) - state.round, 0) : 0,
        signatureCharges: signatureSlot?.earnedCharges ?? 0,
        signatureCap: signatureCard ? cardChargeCap(signatureCard) : 0,
        threat: heroId === aimedAt,
        revivable: hero.status === 'downed' && reviveIsLegal(catalog, state, heroId),
        unacted: nudge.unacted.includes(heroId),
        nextUp: nudge.nextUp === heroId,
      }
    })
}

// Whether the primary frame should carry the Threat mark. Exported beside the
// ally models because it is the same question about a different frame, and
// two definitions of "the Boss's attention" would drift.
export function primaryHasThreat(catalog: ContentCatalog, state: EncounterState): boolean {
  return threatHeroId(catalog, state) === state.primaryHeroId
}

// What one tap on an ally frame does (D-107). Three things can want the same press, so
// the order they are asked in is the rule, written here rather than inside a
// click handler where it would be three ifs nobody can test.
//
//   expand — the column is tucked, so the press opens it and does nothing else
//   revive — the one legal ally action (direction 1A: the frame is the button)
//   switch — the resting frame, which is the control cursor's portrait click
//
// **A tucked column swallows the rescue tap**, which is the whole reason the
// order is written down. It looks wrong beside the 40/44 rule — the rescue is
// meant to be the one thing a grown frame can mean — until you look at what a
// tucked frame is showing: 66pt of Role glyph, a striped track and an ember
// accent, with `REVIVE · 1 CARD` among the things the tuck dropped. A press
// that spent the player's card on a rescue they were never offered would be
// the interface acting on information it had just hidden. So the first press
// gives the words back and the second spends the card, which is one extra tap
// on a state the player themselves asked to stop looking at.
export type AllyTap = 'expand' | 'revive' | 'switch'

export function allyTap(frame: PartyFrameModel, tucked: boolean): AllyTap {
  if (tucked) {
    return 'expand'
  }
  return frame.revivable ? 'revive' : 'switch'
}
