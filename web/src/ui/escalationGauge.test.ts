import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import { createEncounterState, ESCALATION_MAX, type EncounterState } from '@/engine'
import { escalationDetail, escalationPips, nextEscalationPip } from './EscalationGauge'

const catalog = loadCatalog()
const start = (): EncounterState => createEncounterState(catalog, 'embermaw_prototype')
const thresholds = catalog.encounters.embermaw_prototype.escalation_thresholds

describe('Escalation gauge', () => {
  it('shows one pip per band, none crossed at the pull', () => {
    const pips = escalationPips(0, thresholds)
    expect(pips).toHaveLength(ESCALATION_MAX)
    expect(pips.map((pip) => pip.value)).toEqual([1, 2, 3, 4, 5])
    expect(pips.every((pip) => !pip.crossed)).toBe(true)
    // Only the top band is the wipe, and it is the engine's rule rather than
    // authored content, so it carries no threshold title of its own.
    expect(pips.filter((pip) => pip.isWipe).map((pip) => pip.value)).toEqual([ESCALATION_MAX])
  })

  it('takes its titles from the authored thresholds', () => {
    const pips = escalationPips(2, thresholds)
    expect(pips[0]).toMatchObject({ value: 1, crossed: true, title: thresholds.find((t) => t.value === 1)!.title })
    expect(pips[1]).toMatchObject({ value: 2, crossed: true })
    expect(pips[2].crossed).toBe(false)
    // Derived from the same authored data the engine resolves, so the gauge
    // cannot show a band the rules do not have.
    for (const threshold of thresholds) {
      expect(pips[threshold.value - 1].title).toBe(threshold.title)
    }
  })

  it('names the band the party is walking into', () => {
    expect(nextEscalationPip(escalationPips(0, thresholds))?.value).toBe(1)
    expect(nextEscalationPip(escalationPips(3, thresholds))?.value).toBe(4)
    expect(nextEscalationPip(escalationPips(ESCALATION_MAX, thresholds))).toBeNull()
  })

  it('explains the automatic schedule before it starts, and the next band after', () => {
    const state = start()
    expect(state.round).toBeLessThan(state.escalationStartRound)
    expect(escalationDetail(state, state.enrageText).hint).toBe(
      `Automatic ticks begin at the end of Round ${state.escalationStartRound}.`,
    )

    const ticking = { ...state, round: state.escalationStartRound, escalation: 1 }
    const detail = escalationDetail(ticking, ticking.enrageText)
    expect(detail.hint).toBe(`Next: ${thresholds.find((t) => t.value === 2)!.title}.`)
    expect(detail.badge).toBe(`1 of ${ESCALATION_MAX}`)
    // The wipe row quotes the Encounter's own enrage line rather than inventing
    // a phrase for the end of the fight.
    expect(detail.stats?.at(-1)?.value).toBe(state.enrageText)
  })
})
