import { describe, expect, it } from 'vitest'
import {
  DECISION_PLACEHOLDER,
  datedRowCount,
  decisionNumbers,
  formatDecisionId,
  parseDecisionRows,
  planDecisionIds,
} from './decisionIds'

// Synthetic logs rather than the real one. The real file is the subject of
// `decisionLog.test.ts`, which asserts the property it currently has; this
// asserts the arithmetic, and the arithmetic's interesting cases are states the
// real log is never allowed to be in.
const HEADER = ['# Design Decision Log', '', '| Date | ID | Status | Decision |', '| --- | --- | --- | --- |'].join('\n')

function log(...rows: string[]): string {
  return [HEADER, ...rows, ''].join('\n')
}

function row(id: string, decision = 'something'): string {
  return `| 2026-08-19 | ${id} | Adopted | ${decision} |`
}

describe('decision id parsing', () => {
  it('reads the id out of every dated row, and only those', () => {
    const text = log(row('D-001'), row('D-002'), row(DECISION_PLACEHOLDER))
    expect(parseDecisionRows(text).map((entry) => entry.id)).toEqual(['D-001', 'D-002', DECISION_PLACEHOLDER])
    // The parser checked against the file, which is what stops a regex that
    // silently stopped matching from reporting no collisions forever.
    expect(parseDecisionRows(text)).toHaveLength(datedRowCount(text))
  })

  it('ignores the placeholder when counting numbers', () => {
    expect(decisionNumbers(['D-007', DECISION_PLACEHOLDER, 'D-012'])).toEqual([7, 12])
  })

  it('pads to three digits, which is the form every citation uses', () => {
    expect(formatDecisionId(7)).toBe('D-007')
    expect(formatDecisionId(112)).toBe('D-112')
  })
})

describe('decision id planning', () => {
  const upstreamIds = ['D-001', 'D-002', 'D-003']
  const baseIds = ['D-001', 'D-002']

  it('numbers a placeholder above everything anybody has used', () => {
    // Upstream reached D-003 after the merge base stopped at D-002, so the next
    // free number is D-004 — not D-003, which counting from the local file alone
    // would have produced.
    const plan = planDecisionIds({ log: log(row('D-001'), row('D-002'), row(DECISION_PLACEHOLDER)), baseIds, upstreamIds })
    expect(plan.reassignments).toEqual([{ from: DECISION_PLACEHOLDER, to: 'D-004', lineIndex: 6, reason: 'placeholder' }])
    expect(plan.log).toContain('| D-004 |')
    expect(plan.log).not.toContain(DECISION_PLACEHOLDER)
  })

  it('numbers several placeholders in file order', () => {
    const plan = planDecisionIds({
      log: log(row('D-001'), row('D-002'), row(DECISION_PLACEHOLDER, 'first'), row(DECISION_PLACEHOLDER, 'second')),
      baseIds,
      upstreamIds,
    })
    expect(plan.reassignments.map((entry) => entry.to)).toEqual(['D-004', 'D-005'])
    expect(plan.log.indexOf('D-004')).toBeLessThan(plan.log.indexOf('D-005'))
  })

  it('moves a number this branch invented that upstream invented too', () => {
    // The collision that has happened three times: both sides took the next
    // free number against the main they branched from.
    const plan = planDecisionIds({ log: log(row('D-001'), row('D-002'), row('D-003', 'mine')), baseIds, upstreamIds })
    expect(plan.reassignments).toEqual([{ from: 'D-003', to: 'D-004', lineIndex: 6, reason: 'taken_upstream' }])
    expect(plan.log).toContain('| D-004 | Adopted | mine |')
  })

  it('leaves a pre-existing row alone even though upstream also has it', () => {
    // The case that looks identical without the merge base, and where moving
    // the row would be the damage rather than the fix: D-002 is on both sides
    // because it merged weeks ago, and every citation of it is correct.
    const plan = planDecisionIds({ log: log(row('D-001'), row('D-002')), baseIds, upstreamIds })
    expect(plan.reassignments).toEqual([])
    expect(plan.log).toContain('| D-002 |')
  })

  it('does not renumber a row upstream has never seen', () => {
    // An author who did pick a number, and picked a free one, is left alone.
    const plan = planDecisionIds({ log: log(row('D-001'), row('D-002'), row('D-009')), baseIds, upstreamIds })
    expect(plan.reassignments).toEqual([])
  })

  it('never assigns a number a later row in the same file already holds', () => {
    // Counting from the maximum is not enough on its own: the placeholder sits
    // above a row that already holds D-004, so a naive "one past upstream"
    // would duplicate it inside one file.
    const plan = planDecisionIds({
      log: log(row('D-001'), row('D-002'), row(DECISION_PLACEHOLDER, 'new'), row('D-004', 'already mine')),
      baseIds,
      upstreamIds,
    })
    expect(plan.reassignments.map((entry) => entry.to)).toEqual(['D-005'])
    expect(parseDecisionRows(plan.log).map((entry) => entry.id)).toEqual(['D-001', 'D-002', 'D-005', 'D-004'])
  })

  it('rewrites only the ID column, never a citation in the row body', () => {
    // Decision bodies routinely cite other decisions. A global replace would
    // point every one of them at the row being renumbered.
    const plan = planDecisionIds({
      log: log(row('D-003', 'supersedes D-003 elsewhere and refines D-001')),
      baseIds,
      upstreamIds,
    })
    expect(plan.reassignments.map((entry) => entry.to)).toEqual(['D-004'])
    expect(plan.log).toContain('| D-004 | Adopted | supersedes D-003 elsewhere and refines D-001 |')
  })

  it('moves the later of two rows holding the same number', () => {
    // The plain mistake rather than the race: an author picked a number the log
    // already holds. The first row keeps it, because every existing citation of
    // that number means the first row.
    const plan = planDecisionIds({ log: log(row('D-001', 'original'), row('D-001', 'mine')), baseIds, upstreamIds })
    expect(plan.reassignments).toEqual([{ from: 'D-001', to: 'D-004', lineIndex: 5, reason: 'duplicate_locally' }])
    expect(plan.log).toContain('| D-001 | Adopted | original |')
    expect(plan.log).toContain('| D-004 | Adopted | mine |')
  })

  it('is a no-op on a log with nothing new in it', () => {
    const text = log(row('D-001'), row('D-002'))
    expect(planDecisionIds({ log: text, baseIds, upstreamIds }).log).toBe(text)
  })

  // The state the merge base cannot describe: this branch invented D-003, then
  // merged the upstream branch that had invented D-003 too. Now one log holds
  // both rows, the merge base predates each of them, and by id alone they are
  // the same case. Upstream's row has landed and is cited from the files that
  // merged with it, so it is the one that must not move — whichever order the
  // conflict resolution happened to leave them in.
  describe('after the merge that brought the collision in', () => {
    const upstreamLog = log(row('D-001'), row('D-002'), row('D-003', 'theirs'))

    it('moves this branch\'s row when upstream\'s came first', () => {
      const plan = planDecisionIds({
        log: log(row('D-001'), row('D-002'), row('D-003', 'theirs'), row('D-003', 'mine')),
        baseIds,
        upstreamIds,
        upstreamLog,
      })
      expect(plan.reassignments).toEqual([{ from: 'D-003', to: 'D-004', lineIndex: 7, reason: 'duplicate_locally' }])
      expect(plan.log).toContain('| D-003 | Adopted | theirs |')
      expect(plan.log).toContain('| D-004 | Adopted | mine |')
    })

    it("moves this branch's row when it came first, and leaves upstream's number alone", () => {
      // The failing order. Before the text check the first row won by position,
      // so upstream's landed row took the new number and every file citing it
      // was rewritten to match.
      const plan = planDecisionIds({
        log: log(row('D-001'), row('D-002'), row('D-003', 'mine'), row('D-003', 'theirs')),
        baseIds,
        upstreamIds,
        upstreamLog,
      })
      expect(plan.reassignments).toEqual([{ from: 'D-003', to: 'D-004', lineIndex: 6, reason: 'taken_upstream' }])
      expect(plan.log).toContain('| D-004 | Adopted | mine |')
      expect(plan.log).toContain('| D-003 | Adopted | theirs |')
    })

    it('still moves a lone invented row that upstream has since taken', () => {
      // No merge yet, so there is one row and nothing to tell apart. This is
      // the collision the tool exists to catch, and the text check must not
      // swallow it.
      const plan = planDecisionIds({
        log: log(row('D-001'), row('D-002'), row('D-003', 'mine')),
        baseIds,
        upstreamIds,
        upstreamLog,
      })
      expect(plan.reassignments).toEqual([{ from: 'D-003', to: 'D-004', lineIndex: 6, reason: 'taken_upstream' }])
    })

    it('refuses to treat a row as upstream\'s when upstream holds that id twice', () => {
      // A log upstream should never have. If it does, no row here can claim to
      // be "the" upstream row, so the ordinary collision rules apply rather
      // than an arbitrary match against the first of two.
      const plan = planDecisionIds({
        log: log(row('D-001'), row('D-002'), row('D-003', 'theirs')),
        baseIds,
        upstreamIds,
        upstreamLog: log(row('D-003', 'theirs'), row('D-003', 'theirs')),
      })
      expect(plan.reassignments).toEqual([{ from: 'D-003', to: 'D-004', lineIndex: 6, reason: 'taken_upstream' }])
    })
  })
})
