import type { EncounterState, HeroState } from './types'

// The zero-health lifecycle (D-074, ADR 0039). A Hero at `0` health is not out
// of the fight and their player is never out of the game: they go `Downed`,
// and they stay Downed until somebody picks them up.
//
// There is exactly one state, and it is stable. ADR 0036 had two — a two-Round
// rescue window and an `Incapacitated` state past it — and the window is what
// ADR 0039 removes: no timer, no expiry, no terminal successor, so a body on
// the floor is a standing demand rather than a countdown. What that ADR kept
// is the half worth keeping, that the *player* goes on acting even when the
// *Hero* cannot.
//
// Every transition lives here rather than beside the damage that causes one,
// because the rules that ask about it are scattered — the Boss's selector, the
// proximity demand, the wipe check, the Round boundary — and each needs the
// same answer to "is this Hero in the fight?". One module, one answer.

// Whether a Hero can still act, be hit, and answer a demand. A body is not a
// Hero: this is the predicate the Boss's selector and the proximity demand
// both read, and getting it wrong in either place is what lets a party park a
// corpse beside the Boss to dodge the D-041 charge.
//
// Health is the whole predicate, and `status` rides along only so the two can
// never be read apart. `Downed` is *derived* from `health <= 0` rather than
// stored as an independent fact, so no code path can leave a Hero recorded as
// standing at zero health, or as a body at full.
export function isLivingHero(hero: HeroState | undefined): boolean {
  return hero !== undefined && hero.status === 'living' && hero.health > 0
}

export function livingHeroIds(state: EncounterState): string[] {
  return state.partyHeroIds.filter((heroId) => isLivingHero(state.heroes[heroId]))
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
  // when the body leaves, and under one stable state a body never leaves.
  //
  // The Action Bar is deliberately untouched — Slots keep their Top Cards and
  // their earned Charges, frozen where they stood. That is D-045's argument
  // applied one level up: the host is still on the board, so what rides on
  // them survives. It is also what makes a rescue worth a card, since a Hero
  // returning at `1` health with empty Slots returns unable to act, and the
  // rescue would be a formality rather than a save.
  const entity = state.board.entities[heroId]
  if (entity) {
    entity.health = 0
  }
}

// The rescue landed. The Hero returns at the authored `revive_to` — content
// rather than an engine constant, because it is the number that decides how
// forgiving the whole game is (ADR 0036's constraint, kept).
//
// Absolute rather than a fraction of maximum: the ruling this implements is
// about the *state* a Hero comes back in — one blow from going down again —
// and a fraction says something different at 40 maximum health than at 12.
export function reviveHero(state: EncounterState, heroId: string, reviveTo: number): number {
  const hero = state.heroes[heroId]
  if (!hero || hero.status !== 'downed') {
    return 0
  }
  hero.status = 'living'
  hero.downedRound = 0
  hero.health = Math.min(hero.maxHealth, Math.max(1, reviveTo))
  const entity = state.board.entities[heroId]
  if (entity) {
    entity.health = hero.health
  }
  return hero.health
}

// How many Hero-Rounds this Party has spent short-handed, counted from each
// body's `downedRound`. This is the evidence D-016 actually wants: a binary
// "did anyone finish on the floor" fires on a Party that lost somebody in the
// last Round and won anyway, which is a good fight rather than a decorative
// Hero. A dose says whether the missing Hero mattered.
export function heroRoundsLost(state: EncounterState): number {
  return state.partyHeroIds.reduce((total, heroId) => {
    const hero = state.heroes[heroId]
    if (hero?.status !== 'downed') {
      return total
    }
    return total + Math.max(0, state.round - hero.downedRound)
  }, 0)
}

// The three actions a Downed Hero chooses between each Round, each costing one
// card from hand. All ally-facing and none of them touches the Boss's health:
// a Downed Hero who could still push the kill is a Hero the Party has little
// reason to rescue, which would invert the rescue demand into an option.
//
// The card cost is ADR 0039's, and it is what lets the set survive the loss of
// the window. Hands refill to `refillTarget` every Round, and a Downed hand
// does not refill at all, so the hand a Hero fell with is the whole budget for
// their time on the floor. Free, these would be strongest on the state that
// never ends: `reduce_escalation` is the only effect in the game that moves
// the clock backwards, against a ceiling of five, so an unpriced version would
// make getting knocked out the best play available.
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
