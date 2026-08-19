import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import { advancePhase, createEncounterState, type EncounterState } from '@/engine'
import { beatCardStats, findLiveBeat, standingDemand } from './beatCard'

const catalog = loadCatalog()

function start(seed?: number): EncounterState {
  return createEncounterState(catalog, 'embermaw_prototype', seed)
}

function stepTo(state: EncounterState, phase: EncounterState['phase']): EncounterState {
  let current = state
  for (let guard = 0; guard < 20 && current.phase !== phase; guard += 1) {
    current = advancePhase(catalog, current).state
  }
  expect(current.phase).toBe(phase)
  return current
}

// Seed 3 puts Brood Pattern second, which is the earliest a proximity demand
// can land — the pinned opener carries none.
const BROOD_SECOND_SEED = 3

describe('Boss Beat cards (D-055)', () => {
  describe('what a card prints', () => {
    it('prints every authored parameter a Beat resolves against', () => {
      // The port's authoring gate: a Beat whose resolution consults something
      // the card does not print cannot be put on a table. Asserted as a
      // property over live content rather than against one worked example, so
      // a new authored field that changes an outcome and never reaches the
      // card fails here rather than at print time.
      const printed: Record<string, (stat: string) => boolean> = {
        damage: (text) => /Damage/.test(text),
        unguarded_bonus: (text) => /unguarded/.test(text),
        range_tiles: (text) => /Reach/.test(text),
        move_tiles: (text) => /Advances/.test(text),
        minion: (text) => /Spawns/.test(text),
        hazard: (text) => /Leaves/.test(text),
        escalation_if_unanswered: (text) => /Escalation \+/.test(text),
        target_selector: (text) => /Target/.test(text),
      }
      for (const program of Object.values(catalog.programs)) {
        for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
          const text = beatCardStats(beat)
            .map((stat) => `${stat.label} ${stat.value}`)
            .join(' | ')
          for (const [field, appears] of Object.entries(printed)) {
            const value = (beat as unknown as Record<string, unknown>)[field]
            const carried = typeof value === 'number' ? value > 0 : typeof value === 'string' ? value !== '' : value !== undefined
            if (carried) {
              expect(appears(text), `${beat.id} authors ${field} but its card does not print it — ${text}`).toBe(true)
            }
          }
        }
      }
    })

    it('says permanent rather than a round count for ground that never comes back', () => {
      // A printed card cannot rely on the reader knowing D-039. Ash Trail is
      // the Beat where "1 round" would be an outright lie.
      const trail = catalog.programs.embermaw_hunt.instant_beats.find((beat) => beat.kind === 'hazard_last_impact')!
      expect(trail.permanent).toBe(true)
      const leaves = beatCardStats(trail).find((stat) => stat.label === 'Leaves')!
      expect(leaves.value).toContain('permanent')
      expect(leaves.value).not.toMatch(/round/)
    })

    it('prints nothing for a Beat that carries no parameters', () => {
      const turn = catalog.programs.embermaw_hunt.instant_beats.find((beat) => beat.kind === 'turn_toward_player')!
      expect(beatCardStats(turn)).toEqual([])
    })
  })

  describe('finding the Beat behind a prompt', () => {
    it('names the row the Beat belongs to', () => {
      const state = start()
      expect(findLiveBeat(catalog, state, 'raking_claw')?.track).toBe('instant')
      expect(findLiveBeat(catalog, state, 'cinder_breath')?.track).toBe('incoming')
    })

    it('returns null for a Beat the running program does not carry', () => {
      // Not an error case: the playout can name a Beat from a program that has
      // since been swapped at a Phase Break, and a card with no Beat falls back
      // to its title rather than throwing.
      expect(findLiveBeat(catalog, start(), 'brood_call')).toBeNull()
    })
  })

  describe('the standing demand', () => {
    function broodIncoming(): EncounterState {
      const state = createEncounterState(catalog, 'embermaw_prototype', BROOD_SECOND_SEED)
      expect(state.programSequence[1]).toBe('embermaw_brood')
      state.heroes[state.primaryHeroId].maxHealth = 5000
      state.heroes[state.primaryHeroId].health = 5000
      let current = state
      // Into Round 2, then to its Incoming Row.
      for (let guard = 0; guard < 10 && current.round < 2; guard += 1) {
        current = advancePhase(catalog, current).state
      }
      return stepTo(current, 'incoming')
    }

    it('is absent from a program that carries no demand', () => {
      // Round 1 is Hunt Pattern, which authors none.
      expect(standingDemand(catalog, start())).toBeNull()
    })

    it('is absent before its own row has resolved, on a Round that does carry one', () => {
      // The case the test above cannot make: Brood Pattern *has* the demand, so
      // reaching null here can only be the phase guard doing it. Written after
      // the mutation audit caught the first version — which used Round 1, where
      // there is no demand to withhold, so removing the phase guard entirely
      // left it passing.
      // The same Round as `broodIncoming`, stopped one window earlier.
      let state = createEncounterState(catalog, 'embermaw_prototype', BROOD_SECOND_SEED)
      state.heroes[state.primaryHeroId].maxHealth = 5000
      state.heroes[state.primaryHeroId].health = 5000
      for (let guard = 0; guard < 10 && state.round < 2; guard += 1) {
        state = advancePhase(catalog, state).state
      }
      state = stepTo(state, 'quick')
      expect(state.currentProgramId).toBe('embermaw_brood')
      expect(
        state.programSequence[1] === 'embermaw_brood' &&
          catalog.programs.embermaw_brood.incoming_beats.some((beat) => beat.kind === 'demand_proximity'),
        'fixture must be a Round that authors a proximity demand',
      ).toBe(true)
      expect(standingDemand(catalog, state)).toBeNull()
    })

    it('stands from the Incoming Row through the Slow Window', () => {
      const incoming = broodIncoming()
      expect(standingDemand(catalog, incoming)?.beat.kind).toBe('demand_proximity')
      const slow = stepTo(incoming, 'slow')
      expect(standingDemand(catalog, slow)?.beat.kind).toBe('demand_proximity')
    })

    it('reads answered from where the Hero is standing, at the authored distance', () => {
      // The half that makes this a status rather than a notification: the
      // player can still move during the Slow Window, and the card has to say
      // so. Distances come from the Beat's own `range_tiles` (D-043), never a
      // literal, so the card and the Round-end check cannot disagree.
      const state = broodIncoming()
      const boss = state.board.entities[state.bossId]
      const demand = standingDemand(catalog, state)!
      expect(demand.beat.range_tiles).toBeGreaterThan(0)

      state.board.entities[state.primaryHeroId].coords = { q: boss.coords.q, r: boss.coords.r + demand.beat.range_tiles }
      expect(standingDemand(catalog, state)?.answered).toBe(true)

      state.board.entities[state.primaryHeroId].coords = { q: boss.coords.q, r: boss.coords.r + demand.beat.range_tiles + 1 }
      expect(standingDemand(catalog, state)?.answered).toBe(false)
    })

    it('clears once the Encounter is over', () => {
      const state = broodIncoming()
      state.active = false
      expect(standingDemand(catalog, state)).toBeNull()
    })
  })
})
