import { hexKey, type Axial } from './hex'
import type { CounterDefinition } from './content/schemas'
import type { CounterInstance, EncounterState, Phase } from './types'

export const RIPOSTE_READY = 'riposte_ready'
export const FORTIFIED = 'fortified'
export const SHIELD_SLAM = 'shield_slam'

// Counters engine code places rather than content. Both are exempt from the
// "nothing reads this" lint: Fortified is read by its own Reader, and Riposte
// Ready's graded consumption (D-015) is read by code the vocabulary cannot
// express, which is exactly why D-033 left it there.
export const ENGINE_COUNTERS = [FORTIFIED, RIPOSTE_READY]

// Where a Counter lives, as one tagged string (D-046). Counters were keyed by
// entity id while combatants were the only host; the moment ground and
// prepared cards can hold one too, the key has to say *what kind* of thing it
// names, or the upkeep cannot tell a Minion that died from a hex that is
// simply empty. One map and one upkeep loop, rather than three parallel
// structures that drift.
// Branded, so a bare entity id cannot be passed where a ref is wanted. The
// ref is a string at runtime and a distinct type at compile time, which is
// what turns "did every call site get migrated?" from a question into a
// build error.
export type CounterRef = string & { readonly __counterRef: unique symbol }

export function combatantRef(entityId: string): CounterRef {
  return `combatant:${entityId}` as CounterRef
}

export function hexCounterRef(coords: Axial): CounterRef {
  return `hex:${hexKey(coords)}` as CounterRef
}

export function slotRef(heroId: string, slotIndex: number): CounterRef {
  return `slot:${heroId}:${slotIndex}` as CounterRef
}

// Parses a ref back to the entity it names, or '' when it names something
// else. Only presentation and fact-logging need this; the rules never do.
export function refEntityId(ref: CounterRef): string {
  const [kind, ...rest] = (ref as string).split(':')
  return kind === 'combatant' ? rest.join(':') : ''
}

// Whether the thing a ref names is still there. A Counter never outlives its
// host: a Minion's mark dies with the Minion (D-043), ground that burned away
// takes its Counters with it, and a Slot's Counters go when its Top Card does.
function hostIsLive(state: EncounterState, ref: CounterRef): boolean {
  const [kind, ...rest] = ref.split(':')
  const body = rest.join(':')
  if (kind === 'combatant') {
    return state.board.entities[body] !== undefined || state.heroes[body] !== undefined
  }
  if (kind === 'hex') {
    return state.board.hexes[body] !== undefined
  }
  if (kind === 'slot') {
    const [heroId, index] = body.split(':')
    return state.heroes[heroId]?.actionBar[Number(index)]?.topCard != null
  }
  return false
}

export function getCounters(state: EncounterState, ref: CounterRef): CounterInstance[] {
  return state.counters[ref] ?? []
}

export function getCounter(state: EncounterState, ref: CounterRef, counterId: string): CounterInstance | undefined {
  return getCounters(state, ref).find((counter) => counter.id === counterId)
}

export function hasCounter(state: EncounterState, ref: CounterRef, counterId: string): boolean {
  return getCounter(state, ref, counterId) !== undefined
}

export function counterCount(state: EncounterState, ref: CounterRef, counterId: string): number {
  return getCounter(state, ref, counterId)?.count ?? 0
}

// Every Counter on a combatant carrying a given Keyword, summed. This is the
// Charge Modifier's match-by-keyword (`cardResolver.ts`) lifted off the Charge
// Stack: one card can read "every fire Counter" without naming them all, which
// is what lets a Counter be added later without editing the cards that care.
export function counterCountByKeyword(
  catalog: { counters: Record<string, CounterDefinition> },
  state: EncounterState,
  ref: CounterRef,
  keywordId: string,
): number {
  let total = 0
  for (const counter of getCounters(state, ref)) {
    if (catalog.counters[counter.id]?.keywords.includes(keywordId)) {
      total += counter.count
    }
  }
  return total
}

// Places `amount` Counters on a combatant, up to the authored `max`. Returns
// how many actually landed, so a refusal is a number rather than a boolean:
// placing 3 on a host holding 1 of a max-2 Counter lands 1, and the fact log
// can say so. A full host refuses with 0, which is the old non-stacking rule
// expressed as arithmetic rather than as a flag.
export function placeCounter(state: EncounterState, ref: CounterRef, counter: CounterInstance, amount = 1): number {
  if (amount <= 0 || !hostIsLive(state, ref)) {
    return 0
  }
  const existing = getCounter(state, ref, counter.id)
  if (existing) {
    const placed = Math.min(amount, existing.max - existing.count)
    existing.count += placed
    if (placed > 0) {
      // A refreshed Counter keeps the longer of the two clocks: adding to a
      // stack must never shorten what is already there.
      existing.remainingRounds = Math.max(existing.remainingRounds, counter.remainingRounds)
    }
    return placed
  }
  const placed = Math.min(amount, counter.max)
  if (!state.counters[ref]) {
    state.counters[ref] = []
  }
  state.counters[ref].push({ ...counter, count: placed })
  return placed
}

// Removes `amount` Counters and returns how many actually came off. A spend
// that cannot be paid in full pays what it can; whether that is legal at all
// is a `gate`'s job, upstream of here.
export function spendCounter(state: EncounterState, ref: CounterRef, counterId: string, amount: number): number {
  const counter = getCounter(state, ref, counterId)
  if (!counter || amount <= 0) {
    return 0
  }
  const spent = Math.min(amount, counter.count)
  counter.count -= spent
  if (counter.count <= 0) {
    removeCounter(state, ref, counterId)
  }
  return spent
}

export function removeCounter(state: EncounterState, ref: CounterRef, counterId: string): boolean {
  const counters = getCounters(state, ref)
  const index = counters.findIndex((counter) => counter.id === counterId)
  if (index < 0) {
    return false
  }
  counters.splice(index, 1)
  state.counters[ref] = counters
  return true
}

// Everything a ref holds, dropped at once. A re-loaded Slot is a different
// prepared card, so whatever was riding the old one does not transfer.
export function clearCounters(state: EncounterState, ref: CounterRef): boolean {
  if (state.counters[ref] === undefined) {
    return false
  }
  delete state.counters[ref]
  return true
}

// What a combatant's Counters add to one effect at one moment: every Reader
// that fires on this event, `per` times its Counter's count. This is the only
// path from a count to a number, and it replaces D-034's two named payload
// fields — an Enemy-facing Counter is now one whose Readers happen to fire on
// an Enemy's events, not a separate kind of thing.
export function readerSum(
  state: EncounterState,
  ref: CounterRef,
  when: CounterInstance['readers'][number]['when'],
  effect: CounterInstance['readers'][number]['effect'],
): number {
  let total = 0
  for (const counter of getCounters(state, ref)) {
    for (const reader of counter.readers) {
      if (reader.when === when && reader.effect === effect) {
        total += reader.per * counter.count
      }
    }
  }
  return total
}

// Round upkeep: window-scoped Counters never expire by round; round-scoped
// ones expire when their remaining rounds run out. A Counter authored with no
// clock (`duration_rounds: 0`) sits until something spends it.
export function counterExpiresOnRoundAdvance(counter: CounterInstance): boolean {
  if (counter.expiresAtWindowEnd !== '' || counter.remainingRounds <= 0) {
    return false
  }
  counter.remainingRounds -= 1
  return counter.remainingRounds <= 0
}

// The Round's upkeep across every combatant holding a Counter — the Boss and
// its Minions included. The mechanism was always two-sided (D-032) but the
// tick ran over Heroes alone, so an authored duration meant nothing on an
// Enemy: Sundered landed once and never came off. A Counter held by a piece
// that has left the board goes with it, so a Minion's affliction cannot
// outlive the Minion.
export function roundUpkeep(state: EncounterState): { ref: CounterRef; counter: CounterInstance }[] {
  const expired: { ref: CounterRef; counter: CounterInstance }[] = []
  for (const ref of Object.keys(state.counters) as CounterRef[]) {
    if (!hostIsLive(state, ref)) {
      delete state.counters[ref]
      continue
    }
    const remaining: CounterInstance[] = []
    for (const counter of getCounters(state, ref)) {
      if (counterExpiresOnRoundAdvance(counter)) {
        expired.push({ ref, counter })
      } else {
        remaining.push(counter)
      }
    }
    state.counters[ref] = remaining
  }
  return expired
}

export function counterEvent(counter: CounterInstance, event: string, reason: string): Record<string, unknown> {
  return {
    counter_id: counter.id,
    event,
    reason,
    count: counter.count,
    expires_at_window_end: counter.expiresAtWindowEnd,
    source_id: counter.sourceId,
    source_beat_id: counter.sourceBeatId,
    trigger_round: counter.triggerRound,
    trigger_phase: counter.triggerPhase,
  }
}

// The fields every Counter instance carries but only engine-built ones use.
const ENGINE_FIELDS = {
  bonusBossDamageOnSlotFired: 0,
  bonusBossDamageOffPayoff: 0,
  consumeOnCardId: '',
  expiresAtWindowEnd: '' as Phase | '',
}

// Builds a live instance from an authored definition. Everything the Counter
// does travels with it as Readers, so nothing downstream needs the catalog to
// know what a held Counter is worth.
export function createFromDefinition(
  definition: CounterDefinition,
  source: { sourceId: string; sourceBeatId?: string; round: number; phase: Phase },
): CounterInstance {
  return {
    id: definition.id,
    title: definition.title,
    count: 0,
    max: definition.max,
    remainingRounds: definition.duration_rounds,
    readers: definition.readers.map((reader) => ({ ...reader })),
    ...ENGINE_FIELDS,
    triggerReason: 'authored_counter',
    sourceId: source.sourceId,
    sourceBeatId: source.sourceBeatId ?? '',
    triggerRound: source.round,
    triggerPhase: source.phase,
  }
}

// A Slow-window Armor commitment (D-019): the Armor lands at the NEXT Round
// start, after the wipe, so Fortify answers the next Round's pressure —
// including Instant-row hits nothing else can pre-block.
//
// The banked Armor is the count (D-045). Firing Fortify twice in one window
// places twice the Counters onto one stack, which is the additive stacking
// D-019 asked for, arrived at by addition rather than by a flag.
export function createFortified(
  catalog: { counters: Record<string, CounterDefinition> },
  sourceCardId: string,
  round: number,
  phase: Phase,
): CounterInstance | null {
  const definition = catalog.counters[FORTIFIED]
  if (!definition) {
    return null
  }
  const instance = createFromDefinition(definition, { sourceId: sourceCardId, round, phase })
  instance.triggerReason = 'slow_commitment'
  return instance
}

export function createRiposteReady(sourceId: string, sourceBeatId: string, round: number, phase: Phase): CounterInstance {
  return {
    id: RIPOSTE_READY,
    title: 'Riposte Ready',
    count: 0,
    max: 1,
    remainingRounds: 1,
    readers: [],
    bonusBossDamageOnSlotFired: 2,
    bonusBossDamageOffPayoff: 1,
    consumeOnCardId: SHIELD_SLAM,
    expiresAtWindowEnd: 'quick',
    triggerReason: 'qualifying_tank_hit',
    sourceId,
    sourceBeatId,
    triggerRound: round,
    triggerPhase: phase,
  }
}
