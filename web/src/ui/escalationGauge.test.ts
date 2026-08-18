import { describe, expect, it } from 'vitest'
import { loadCatalog } from '@/content'
import { createEncounterState, ESCALATION_MAX, type EncounterState } from '@/engine'
import {
  escalationBandLabel,
  escalationDetail,
  escalationFuseFraction,
  escalationGaugeLabel,
  escalationPips,
  nextEscalationPip,
} from './EscalationGauge'

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
  })

  it('burns a fuse through the first band while the ticks are dormant', () => {
    const state = start()
    const startRound = state.escalationStartRound
    const band = 1 / ESCALATION_MAX

    // Something moves every dormant Round: an empty track that reads the same
    // in Round 1 and Round 3 reads as a broken clock.
    const dormant = Array.from({ length: startRound - 1 }, (_, index) => escalationFuseFraction(index + 1, startRound))
    expect(dormant.length).toBeGreaterThan(0)
    for (const [index, fraction] of dormant.entries()) {
      expect(fraction).toBeGreaterThan(index === 0 ? 0 : dormant[index - 1])
      // And it stays inside the first band, so the fuse can never be misread
      // as a band the clock has actually crossed.
      expect(fraction).toBeLessThan(band)
    }

    // The tick lands exactly where the fuse was heading, so the clock takes
    // over from it rather than restarting behind it.
    expect(escalationFuseFraction(startRound, startRound)).toBe(0)
    expect(escalationFuseFraction(startRound + 3, startRound)).toBe(0)
    expect(escalationFuseFraction(startRound - 1, startRound) + band / startRound).toBeCloseTo(band)

    // An Encounter whose ticks start at Round 1 has no dormant stretch to draw.
    expect(escalationFuseFraction(1, 1)).toBe(0)
  })

  it('announces the dormant schedule rather than an imminent band', () => {
    const state = start()
    // `Next: Ashen Verge` alone tells a screen reader the band is imminent
    // when it can be three Rounds away.
    expect(escalationGaugeLabel(state)).toBe(
      `Escalation 0 of ${ESCALATION_MAX}. Automatic ticks begin at the end of Round ${state.escalationStartRound}. Next: ${thresholds.find((t) => t.value === 1)!.title}.`,
    )

    const ticking = { ...state, round: state.escalationStartRound, escalation: 1 }
    expect(escalationGaugeLabel(ticking)).toBe(`Escalation 1 of ${ESCALATION_MAX}. Next: ${thresholds.find((t) => t.value === 2)!.title}.`)

    const wiped = { ...state, round: state.escalationStartRound, escalation: ESCALATION_MAX }
    expect(escalationGaugeLabel(wiped)).toBe(`Escalation ${ESCALATION_MAX} of ${ESCALATION_MAX}.`)
  })

  it('names every band on the ladder, and quotes the enrage line for the wipe', () => {
    const state = start()
    const pips = escalationPips(1, thresholds)
    for (const pip of pips.filter((candidate) => !candidate.isWipe)) {
      expect(escalationBandLabel(pip, state.enrageText)).toBe(pip.title)
    }
    // The wipe band has no authored threshold to name it, so it quotes the
    // Encounter's own enrage line rather than inventing a phrase for the end
    // of the fight.
    expect(escalationBandLabel(pips.at(-1)!, state.enrageText)).toBe(state.enrageText)
  })
})
