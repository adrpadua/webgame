import { describe, expect, it } from 'vitest'
import { DECISION_PLACEHOLDER, datedRowCount, decisionNumbers, formatDecisionId, parseDecisionRows } from './decisionIds'

// The decision log's IDs have to be unique, and nothing checked.
//
// On 2026-08-18 two branches were open at once and each took what was the next
// free number against the main it had branched from. Both merged. The log came
// out with two D-045s, two D-046s and two D-047s — one set for the Counter
// system, one for the Forecast Row removal and Beat cards — and both sets were
// cited from engine comments, doc tables and test names. A log with a duplicate
// ID is not a log: "see D-047" stops resolving to anything.
//
// Git cannot catch this. The rows do not overlap textually, so both sides apply
// cleanly and the merge is silent. The only thing that can catch it is a check
// on the merged file, which is this.
//
// It then happened again, within the hour, to the branch fixing the first one.
// While D-045/046/047 were being renumbered to D-050/051/052, another branch
// merged and took D-050/051/052. This test caught it on its own first CI run —
// the fix had to move again, to D-053/054/055. Then a third time, D-057. Three
// collisions is the measurement: concurrent branches picking the next free
// number is not a rare accident here, it is the normal case.
//
// This test stayed, and it is still the last line of defence — it is the only
// check that sees the merged file. But it is a check on damage already done:
// by the time it fires, both rows exist and the fix is a renumber plus every
// citation of the wrong number. The other half now lives in `decisionIds.ts`
// and `scripts/decisionIds.ts`, which assign the number at authoring time
// against the branch you are about to merge into, so nobody picks one.

// Read through Vite's glob rather than `node:fs`, the same way the content
// loader reaches `data/`: this file is compiled under the browser tsconfig,
// which has no node types, and the repo already has one idiom for reaching
// out of `web/`.
const LOG = Object.values(
  import.meta.glob('../../../docs/content/design-decision-log.md', { eager: true, import: 'default', query: '?raw' }) as Record<string, string>,
)[0]

// One parser, shared with the authoring-time assigner. Two regexes for one row
// format is two things to keep in step, and the one that drifts is the one that
// goes quiet: a checker reading a format nobody writes any more reports no
// duplicates forever.
const decisionIds = (): string[] => parseDecisionRows(LOG).map((row) => row.id)

describe('design decision log', () => {
  it('gives every decision its own id', () => {
    const ids = decisionIds()
    // Every dated row is a decision row, so the two counts have to agree. This
    // is the parser checking itself: a regex that quietly stopped matching
    // would report zero duplicates forever, and a floor like
    // `length > 40` would only notice once the log shrank past a number
    // somebody picked.
    expect(ids.length, 'every dated row should parse to a decision id').toBe(datedRowCount(LOG))

    const seen = new Map<string, number>()
    for (const id of ids) {
      seen.set(id, (seen.get(id) ?? 0) + 1)
    }
    const duplicated = [...seen.entries()].filter(([, count]) => count > 1)
    expect(
      duplicated.map(([id, count]) => `${id} appears ${count} times`),
      'two branches can each take the next free number against a stale main, and both merge cleanly',
    ).toEqual([])
  })

  it('leaves no gaps that a future branch could reuse', () => {
    // A gap is where the next collision comes from: a branch scanning for the
    // highest id is safe, but one scanning for the lowest free id will land on
    // a hole and collide with whatever was withdrawn from it. Reported rather
    // than forbidden — a withdrawn decision is legitimate — but it has to be
    // visible, so the message names the holes.
    const numbers = decisionNumbers(decisionIds()).sort((left, right) => left - right)
    const missing: number[] = []
    for (let value = numbers[0]; value < numbers[numbers.length - 1]; value += 1) {
      if (!numbers.includes(value)) {
        missing.push(value)
      }
    }
    expect(missing, `decision ids with no row: ${missing.map(formatDecisionId).join(', ')}`).toEqual([])
  })

  it('carries no unassigned placeholder into the merged log', () => {
    // `D-NEW` is the authoring form, and `npm run log:ids -- --fix` is what
    // turns it into a number. One reaching the merged log means the assigner
    // was skipped, and an unnumbered row cannot be cited at all.
    expect(decisionIds().filter((id) => id === DECISION_PLACEHOLDER)).toEqual([])
  })
})
