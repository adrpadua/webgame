// Decision-log id arithmetic, kept pure so it can be tested and audited.
//
// The log's ids are a single global counter and the repo has more than one
// branch open at a time, which is a collision generator: an author reads the
// log, takes the next free number, and by the time the branch merges another
// branch has taken it. It has happened three times — D-045/046/047, then
// D-050/051/052 to the branch fixing the first one, then D-057 — and the
// existing `decisionLog.test.ts` catches it only *after* both sides have
// merged, at which point the fix is a renumber plus every citation of the
// wrong number.
//
// This is the other half: the arithmetic that lets an author never pick a
// number at all. Write `D-NEW` in the ID column and let the number be assigned
// against the freshest state of the branch you are merging into. The same pass
// notices a number you did pick that has since been taken upstream.
//
// The git plumbing — what "upstream" and "the merge base" are — lives in
// `scripts/decisionIds.ts`. Everything here is a function of three strings.

// What an unnumbered row carries in its ID column until a number is assigned.
// Deliberately not a number: a placeholder that looked like `D-000` or `D-999`
// would be a number somebody eventually authors for real, and the whole point
// is to have one token that can never collide.
export const DECISION_PLACEHOLDER = 'D-NEW'

export interface DecisionRow {
  lineIndex: number
  // The row's id as authored — a real id, or `DECISION_PLACEHOLDER`.
  id: string
}

// Rows look like `| <date> | D-0NN | <status> | ...`, or the same with `D-NEW`.
const ROW = /^\|[^|]*\|\s*(D-(?:\d+|NEW))\s*\|/
// Every dated row is a decision row, so the two counts have to agree. Exported
// so callers can check the parser against the file rather than trusting it: a
// regex that quietly stopped matching would report no collisions forever.
const DATED_ROW = /^\|\s*20\d\d-\d\d-\d\d\s*\|/

export function parseDecisionRows(log: string): DecisionRow[] {
  const rows: DecisionRow[] = []
  log.split('\n').forEach((line, lineIndex) => {
    const id = ROW.exec(line)?.[1]
    if (id !== undefined) {
      rows.push({ lineIndex, id })
    }
  })
  return rows
}

export function datedRowCount(log: string): number {
  return log.split('\n').filter((line) => DATED_ROW.test(line)).length
}

// Numbered ids only. A placeholder has no number yet, and an id that is not a
// number is not something to count from.
export function decisionNumbers(ids: string[]): number[] {
  return ids.filter((id) => id !== DECISION_PLACEHOLDER).map((id) => Number(id.slice(2)))
}

export function formatDecisionId(value: number): string {
  return `D-${String(value).padStart(3, '0')}`
}

export interface Reassignment {
  from: string
  to: string
  lineIndex: number
  // Why this row moved, so the script can explain itself rather than reporting
  // a diff and leaving the author to guess.
  reason: 'placeholder' | 'taken_upstream' | 'duplicate_locally'
}

export interface DecisionIdPlan {
  reassignments: Reassignment[]
  log: string
}

/**
 * Assign a number to every unnumbered row, and move any number this branch
 * invented that the upstream branch has since invented too.
 *
 * `baseIds` is what the merge base already had, and it is what separates the
 * two cases that otherwise look identical. If an id is on both sides and was
 * on neither at the merge base, both sides invented it and one has to move. If
 * it was already at the merge base, both sides are simply carrying — or
 * editing — the same pre-existing row, which is not a collision and must not
 * be renumbered: doing so would break every citation of a decision that has
 * been merged for weeks.
 */
export function planDecisionIds(input: { log: string; baseIds: string[]; upstreamIds: string[] }): DecisionIdPlan {
  const rows = parseDecisionRows(input.log)
  const base = new Set(input.baseIds)
  const upstream = new Set(input.upstreamIds)

  // Count from everything anybody has used, including this branch's own rows,
  // so a reassignment never lands on a number a later row in this same file
  // already holds.
  const used = new Set([...input.baseIds, ...input.upstreamIds, ...rows.map((row) => row.id)])
  let next = Math.max(0, ...decisionNumbers([...used]))
  const claim = (): string => {
    do {
      next += 1
    } while (used.has(formatDecisionId(next)))
    used.add(formatDecisionId(next))
    return formatDecisionId(next)
  }

  const reassignments: Reassignment[] = []
  const lines = input.log.split('\n')
  // Ids already seen earlier in this same file, so a number used twice in one
  // log is caught here too. That case is the plain mistake rather than the race
  // — an author picking a number the log already holds — and the merged-file
  // test catches it, but only after a push. The first row keeps the number and
  // the later one moves, because the earlier row is the one every existing
  // citation means.
  const seenLocally = new Set<string>()
  for (const row of rows) {
    const duplicate = row.id !== DECISION_PLACEHOLDER && seenLocally.has(row.id)
    seenLocally.add(row.id)
    const reason: Reassignment['reason'] | null =
      row.id === DECISION_PLACEHOLDER
        ? 'placeholder'
        : duplicate
          ? 'duplicate_locally'
          : upstream.has(row.id) && !base.has(row.id)
            ? 'taken_upstream'
            : null
    if (reason === null) {
      continue
    }
    const to = claim()
    reassignments.push({ from: row.id, to, lineIndex: row.lineIndex, reason })
    // Anchored to the ID column rather than replaced globally: a decision's
    // body routinely cites other decisions, and rewriting those would point
    // them at this row.
    lines[row.lineIndex] = lines[row.lineIndex].replace(ROW, (match) => match.replace(row.id, to))
  }
  return { reassignments, log: lines.join('\n') }
}
