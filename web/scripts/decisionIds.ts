// Decision-log ids, checked and assigned before a push rather than renumbered
// after a merge.
//
// The log's ids are one global counter and this repo has more than one branch
// open at a time. That combination has collided three times: D-045/046/047,
// then D-050/051/052 taken by another branch while the first collision was
// being renumbered, then D-057. Each time the author had read the log, taken
// the next free number, and lost the race. `decisionLog.test.ts` catches it,
// but only on the merged file — by then the fix is a renumber plus every
// citation of the wrong number.
//
// The fix is to stop picking numbers. Write `D-NEW` in the ID column; this
// assigns the number against the freshest state of the branch you are merging
// into, at the moment you push. The same pass moves a number you did pick that
// has since been taken upstream.
//
//   npm run log:ids           # check, and name the command that fixes it
//   npm run log:ids -- --fix  # assign and rewrite the log
//
// Exit status is the gate: 0 when there is nothing to assign, 1 otherwise.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DECISION_PLACEHOLDER, datedRowCount, parseDecisionRows, planDecisionIds, type Reassignment } from '../src/content/decisionIds'

const LOG_PATH = 'docs/content/design-decision-log.md'
// The branch every branch here merges into. Named once rather than derived:
// `origin/HEAD` is not set in a fresh clone, and guessing wrong would silently
// compare against nothing and report no collisions.
const UPSTREAM = 'origin/main'

const args = process.argv.slice(2).filter((arg) => arg !== '--')
const FIX = args.includes('--fix')

// Where the placeholder legitimately lives: the machinery that defines it and
// the docs that teach writing it. Everywhere else a `D-NEW` is a citation that
// never received its number — which shipped once, in D-075's commit, as eleven
// code comments nothing was scanning for. The log itself is deliberately not in
// this list even though the authoring instruction at its top says `D-NEW`:
// `decisionLog.test.ts` already refuses a placeholder *row*, and this scan is
// what refuses the instruction line ever being the only mention left behind —
// so the log is exempted by the row parser having its own guard, not here.
const PLACEHOLDER_HOMES = [
  LOG_PATH,
  'docs/content/authoring-a-new-hero.md',
  'web/scripts/decisionIds.ts',
  'web/src/content/decisionIds.ts',
  'web/src/content/decisionLog.test.ts',
]

const git = (...argv: string[]): string => execFileSync('git', argv, { encoding: 'utf8' }).trim()
const repoRoot = git('rev-parse', '--show-toplevel')
const logFile = join(repoRoot, LOG_PATH)

// Tracked and untracked text, minus the homes. `git grep` exits 1 for a clean
// tree, which is the one failure this must not confuse with a real git error.
function strayPlaceholderFiles(): string[] {
  try {
    const out = execFileSync(
      'git',
      ['grep', '-l', '--untracked', '-F', DECISION_PLACEHOLDER, '--', '.', ...PLACEHOLDER_HOMES.map((home) => `:!${home}`)],
      { cwd: repoRoot, encoding: 'utf8' },
    )
    return out.trim().split('\n').filter(Boolean)
  } catch (error) {
    if ((error as { status?: number }).status === 1) {
      return []
    }
    throw error
  }
}

function refuseStrays(strays: string[]): void {
  console.error(`\nlog:ids: \`${DECISION_PLACEHOLDER}\` cited outside the log in: ${strays.join(', ')}`)
  console.error('log:ids: a placeholder in a source comment is a citation that never got its number — replace each with the assigned id.')
  process.exit(1)
}

// Best-effort refresh, and deliberately not fatal. D-056 took validation out of
// CI because a gate that fails for reasons the author cannot act on is one
// everybody learns to ignore, and a gate that needs the network to pass is
// exactly that. A stale `origin/main` still catches every collision that had
// already landed when it was last fetched, which is most of them.
let upstreamNote = ''
try {
  execFileSync('git', ['fetch', '--quiet', 'origin', 'main'], { stdio: 'ignore' })
} catch {
  upstreamNote = ` (could not fetch; using the ${UPSTREAM} already on disk)`
}

// `git show <ref>:<path>` is the log as that ref has it, without touching the
// working tree.
const logAt = (ref: string): string | null => {
  try {
    return execFileSync('git', ['show', `${ref}:${LOG_PATH}`], { encoding: 'utf8' })
  } catch {
    return null
  }
}

const upstreamLog = logAt(UPSTREAM)
if (upstreamLog === null) {
  // A checkout with no `origin/main` — a fresh clone of a fork, or a detached
  // build. Nothing to compare against, so say so and pass rather than inventing
  // an answer.
  console.log(`log:ids: no ${UPSTREAM} in this checkout, nothing to compare against`)
  process.exit(0)
}

// The merge base is what separates "both sides invented this number" from "both
// sides are carrying a row that merged weeks ago". Without it every id shared
// with upstream looks like a collision, and renumbering those would break the
// citations the log exists to serve.
let baseRef: string
try {
  baseRef = git('merge-base', 'HEAD', UPSTREAM)
} catch {
  console.error(`log:ids: no merge base between HEAD and ${UPSTREAM}; cannot tell a collision from a shared row`)
  process.exit(1)
}
const baseLog = logAt(baseRef) ?? ''

const working = readFileSync(logFile, 'utf8')
// The parser checked against the file it is about to reason over, the same
// self-check `decisionLog.test.ts` makes. A regex that stopped matching would
// report nothing to assign, forever, and read as a clean gate.
const parsed = parseDecisionRows(working)
if (parsed.length !== datedRowCount(working)) {
  console.error(
    `log:ids: parsed ${parsed.length} decision rows but the log has ${datedRowCount(working)} dated rows — the row format changed and this check is no longer reading it`,
  )
  process.exit(1)
}

const ids = (log: string): string[] => parseDecisionRows(log).map((row) => row.id)
const plan = planDecisionIds({ log: working, baseIds: ids(baseLog), upstreamIds: ids(upstreamLog) })

if (plan.reassignments.length === 0) {
  const strays = strayPlaceholderFiles()
  if (strays.length > 0) {
    refuseStrays(strays)
  }
  console.log(`log:ids: every decision id is free against ${UPSTREAM}${upstreamNote}`)
  process.exit(0)
}

const REASONS: Record<Reassignment['reason'], string> = {
  placeholder: `unnumbered (${DECISION_PLACEHOLDER})`,
  taken_upstream: `already taken on ${UPSTREAM}`,
  duplicate_locally: 'held by an earlier row in this log',
}
for (const entry of plan.reassignments) {
  console.log(`  ${LOG_PATH}:${entry.lineIndex + 1}  ${entry.from} -> ${entry.to}  (${REASONS[entry.reason]})`)
}

if (!FIX) {
  console.error(`\nlog:ids: ${plan.reassignments.length} decision id(s) need assigning${upstreamNote}. Run: cd web && npm run log:ids -- --fix`)
  process.exit(1)
}

writeFileSync(logFile, plan.log)

// A row this branch authored can be cited by the same branch's own prose, so a
// reassignment has to carry those with it — but only where the old number
// unambiguously meant *this* row, and that is decided by why the row moved.
//
// `taken_upstream` carries. The number is live on this branch only as this row:
// upstream's row of that number is not in this working tree, so every mention
// here is a mention of this one.
//
// `duplicate_locally` does not. The number stays on the earlier row, so a
// citation could mean either, and guessing would silently repoint a correct
// one. Reported instead, so the author resolves it.
//
// `placeholder` carries only when this run assigned exactly one. A branch that
// wrote `D-NEW` in a source comment meant the row it was authoring, so with one
// new row the rewrite is unambiguous — and with two, guessing would repoint
// half the citations at the wrong decision, so both are left for the author.
// It never rewrites inside PLACEHOLDER_HOMES, where `D-NEW` is the literal the
// machinery is made of rather than a citation.
const carry = plan.reassignments.filter((entry) => entry.reason === 'taken_upstream')
const placeholders = plan.reassignments.filter((entry) => entry.reason === 'placeholder')
const placeholderCarry = placeholders.length === 1 ? [{ from: DECISION_PLACEHOLDER, to: placeholders[0].to }] : []
const ambiguous = plan.reassignments.filter((entry) => entry.reason === 'duplicate_locally')

// Working tree against the merge base, not `HEAD` against it, plus untracked
// files. The common case is authoring the row and the prose that cites it in
// one uncommitted edit, and diffing commits would have skipped exactly that —
// the check would report the carry-over done while the citation still pointed
// at the old number.
// Both run from the repo root, not from web/ where npm puts the script:
// `ls-files --others` restricts itself to the current directory, so run from
// web/ it could not see an untracked citation anywhere else in the repo — and
// the paths it did return were web-relative, which `join(repoRoot, ...)` then
// pointed at files that do not exist.
const gitAtRoot = (...argv: string[]): string => execFileSync('git', argv, { encoding: 'utf8', cwd: repoRoot }).trim()
const changed = new Set([
  ...gitAtRoot('diff', '--name-only', baseRef).split('\n'),
  ...gitAtRoot('ls-files', '--others', '--exclude-standard').split('\n'),
])
changed.delete('')
changed.delete(LOG_PATH)

const moved: string[] = []
for (const name of changed) {
  const path = join(repoRoot, name)
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    continue // deleted on this branch, or not a file we can read
  }
  // A sprite that happens to contain these bytes would be silently corrupted by
  // the replace below, and `web/src/assets` is full of PNGs. A NUL byte is the
  // cheap, encoding-independent test for "this is not text".
  if (text.includes('\0')) {
    continue
  }
  let updated = text
  for (const entry of carry) {
    updated = updated.split(entry.from).join(entry.to)
  }
  if (!PLACEHOLDER_HOMES.includes(name)) {
    for (const entry of placeholderCarry) {
      updated = updated.split(entry.from).join(entry.to)
    }
  }
  if (updated !== text) {
    writeFileSync(path, updated)
    moved.push(name)
  }
}

// What the fix could not resolve on its own — two placeholders assigned at
// once, or a stray in a file the branch never touched — still fails, so a
// citation without its number cannot ride a green check into the history.
const remaining = strayPlaceholderFiles()

console.log(`\nlog:ids: assigned ${plan.reassignments.length} id(s) in ${LOG_PATH}${upstreamNote}`)
if (moved.length > 0) {
  console.log(`log:ids: carried the new ids into ${moved.join(', ')}`)
}
for (const entry of ambiguous) {
  console.log(
    `log:ids: left citations of ${entry.from} alone — it is still held by an earlier row, so a mention of it could mean either. Check any reference you meant for ${entry.to}.`,
  )
}
if (remaining.length > 0) {
  refuseStrays(remaining)
}
