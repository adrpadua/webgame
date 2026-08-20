import { clearCounters, combatantRef } from './counters'
import type { EncounterState, HeroState } from './types'

// The zero-health lifecycle (ADR 0036). A Hero at `0` health is not out of
// the fight and their player is never out of the game: they go `Downed` while
// a rescue is possible, and `Incapacitated` when it is not.
//
// Every transition lives here rather than beside the damage that causes one,
// because the rules that ask about it are scattered — the Boss's selector,
// the proximity demand, the wipe check, the Round boundary — and each needs
// the same answer to "is this Hero in the fight?". One module, one answer.

// Whether a Hero can still act, be hit, and answer a demand. A body is not a
// Hero: this is the predicate the Boss's selector and the proximity demand
// both read, and getting it wrong in either place is what lets a party park a
// corpse beside the Boss to dodge the D-041 charge.
// Health is part of the predicate, not just status: a Hero reduced to zero
// with no ally to rescue them never becomes Downed at all (`canBeDowned` is
// false), so status alone would still call them living and the solo defeat
// would never fire.
export function isLivingHero(hero: HeroState | undefined): boolean {
  return hero !== undefined && hero.status === 'living' && hero.health > 0
}

export function livingHeroIds(state: EncounterState): string[] {
  return state.partyHeroIds.filter((heroId) => isLivingHero(state.heroes[heroId]))
}

// Whether a Hero reaching zero becomes Downed or simply loses the Encounter.
// Downed needs somebody who could perform the rescue: with no living ally the
// window is a loss the screen has not admitted yet, so a solo Hero at zero is
// defeat immediately and both authored solo Encounters keep behaving exactly
// as they always have.
export function canBeDowned(state: EncounterState, heroId: string): boolean {
  return livingHeroIds(state).some((id) => id !== heroId)
}

// The Round a Downed Hero must be Revived by. Downed in Round N, rescuable
// through the end of Round N+1 — the window CONTEXT.md has always described,
// stored as the Round it opened so expiry is a comparison rather than a
// countdown something has to remember to tick.
export function rescueDeadlineRound(hero: HeroState): number {
  return hero.downedRound + 1
}

export function goDowned(state: EncounterState, heroId: string): void {
  const hero = state.heroes[heroId]
  if (!hero || hero.status !== 'living') {
    return
  }
  hero.status = 'downed'
  hero.downedRound = state.round
  hero.health = 0
  hero.armor = 0
  // The body stays on the board and keeps its Counters: it is still a piece,
  // which is what makes reaching it a real decision. D-045 drops the Counters
  // when the body leaves, and not before.
  const entity = state.board.entities[heroId]
  if (entity) {
    entity.health = 0
  }
}

// The rescue landed. The Hero returns at the authored fraction of their
// maximum, rounded up so a generous-looking fraction never returns somebody
// at zero and immediately re-Downs them.
export function reviveHero(state: EncounterState, heroId: string, fraction: number): number {
  const hero = state.heroes[heroId]
  if (!hero || hero.status !== 'downed') {
    return 0
  }
  const restored = Math.max(1, Math.ceil(hero.maxHealth * fraction))
  hero.status = 'living'
  hero.downedRound = 0
  hero.health = Math.min(hero.maxHealth, restored)
  const entity = state.board.entities[heroId]
  if (entity) {
    entity.health = hero.health
  }
  return hero.health
}

// The window expired. The body leaves the board and its Counters leave with
// it (D-045, no new rule); the hand is discarded and the deck is emptied,
// because a Hero who cannot play must not keep consulting the seeded draw
// order — doing so would move every later draw for the Heroes still playing
// and quietly invalidate comparison against earlier Encounter Records.
//
// The Escalation charge for the failed rescue is *not* applied here: it is an
// action so it lands on the fact stream like every other charge, and the
// caller emits it.
export function incapacitateHero(state: EncounterState, heroId: string): void {
  const hero = state.heroes[heroId]
  if (!hero || hero.status !== 'downed') {
    return
  }
  hero.status = 'incapacitated'
  hero.downedRound = 0
  hero.health = 0
  hero.armor = 0
  hero.discard.push(...hero.hand, ...hero.deck)
  hero.hand = []
  hero.deck = []
  for (const slot of hero.actionBar) {
    slot.topCard = null
    slot.charges = []
    slot.earnedCharges = 0
    slot.activatedWindow = null
  }
  delete state.board.entities[heroId]
  clearCounters(state, combatantRef(heroId))
}

// Which Downed Heroes have run out of window as of this Round. Read at the
// Round boundary; a Hero Downed in Round N is still rescuable through Round
// N+1 and expires when Round N+2 opens.
export function expiredRescues(state: EncounterState): string[] {
  return state.partyHeroIds.filter((heroId) => {
    const hero = state.heroes[heroId]
    return hero?.status === 'downed' && state.round > rescueDeadlineRound(hero)
  })
}

// The three actions an Incapacitated Hero chooses between each Round. All
// ally-facing and none of them touches the Boss's health: an Incapacitated
// Hero who could still push the kill is a Hero the Party has little reason to
// rescue, which would invert the rescue demand into an option (ADR 0036).
//
// Named for the mechanic, never for the flavour — the same rule `bossBeatSchema`
// states for Beat kinds, and for the same reason: a flavoured identifier is one
// Hero's voice welded into a shared contract, and the moment a second Hero wants
// a different word for the same effect the name is either wrong or duplicated.
// `Steel the Party` is a fine thing to *call* `reduce_escalation` on screen; it
// is not what the rules should call it. Player-facing wording arrives with the
// UI, or with the per-Hero authored abilities that eventually replace this
// universal set — either way it rides a title, not the id.
export const DIMINISHED_ACTIONS = ['grant_ally_armor', 'ally_draws_card', 'reduce_escalation'] as const
export type DiminishedAction = (typeof DIMINISHED_ACTIONS)[number]
