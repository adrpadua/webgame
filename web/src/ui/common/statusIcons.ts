import {
  combatantRef,
  getCounters,
  hexCounterRef,
  parseHexKey,
  type ContentCatalog,
  type EncounterState,
  type HazardInstance,
  type HexKey,
} from '@/engine'

// The mark a condition wears on the HUD (party-frame direction 1A's Status
// Icon): which glyph is cut into the square, and which material the square's
// leading edge and glyph are made of. Two kinds of thing wear one: a Counter,
// held by a piece, and a Hazard, held by ground.
//
// Presentation, keyed by content id, the way `keywordIcons.tsx` keys a
// Hero's Keyword marks: what a Counter or a Hazard *does* is authored in
// `data/`, and what it *looks like* is the interface direction's material
// language, which no content file should be spelling in hex. Something with
// no mark here is not a load error — it falls back to the neutral steel mark
// and still reads as a condition, which is what keeps a freshly authored rule
// visible on the frame the day it lands.
//
// The material is the direction's channel, not decoration:
//   ember  — damage taken; the affliction that makes a blow land harder
//   coral  — the Boss's own body, on a Counter the Boss is carrying
//   glass  — Armor and the player's own affordances
//   gold   — lockwork: a certified cover, a charge held
//   steel  — a blunted edge, and anything unmarked
export type StatusGlyph = 'flame' | 'crack' | 'shield' | 'blocks' | 'cross' | 'spike' | 'chain' | 'mark'

export type StatusMaterial = 'ember' | 'coral' | 'glass' | 'gold' | 'cloth' | 'steel'

export interface StatusMark {
  glyph: StatusGlyph
  material: StatusMaterial
}

// An unmarked Counter: a plain rhombus in oathsteel. It says "this piece is
// carrying an authored rule, hold to read it" and claims nothing else, which
// is the honest thing to draw for a rule this file has never heard of.
export const NEUTRAL_MARK: StatusMark = { glyph: 'mark', material: 'steel' }

const MARKS: Record<string, StatusMark> = {
  // Burning: the Hero takes more from every blow while the sear is on them.
  seared: { glyph: 'flame', material: 'ember' },
  // The same fire, held by the thing that set it — so it is drawn in the
  // Boss's own coral rather than in the ember of a wound.
  heat: { glyph: 'flame', material: 'coral' },
  // Armour split open: the piece takes more from every source.
  sundered: { glyph: 'crack', material: 'ember' },
  // A dulled edge: the piece deals less. Steel, because what changed is the
  // weapon rather than the wound.
  weakened: { glyph: 'spike', material: 'steel' },
  // Banked Armor, in the runeglass the Armor overlay already uses.
  fortified: { glyph: 'shield', material: 'glass' },
  // The Registry's cover on the next blow: lockwork gold, the cross the
  // healing marks are drawn with.
  underwritten: { glyph: 'cross', material: 'gold' },
  // Ground that bites what steps on it (D-086): the spike, in ember — a
  // wound waiting in the arena rather than a dulled weapon, which is what
  // keeps it apart from Weakened's steel spike.
  staked_ground: { glyph: 'spike', material: 'ember' },
}

export function statusMark(counterId: string): StatusMark {
  return MARKS[counterId] ?? NEUTRAL_MARK
}

// Ground's own marks, kept as their own table rather than folded into the one
// above: a Counter id and a Hazard id are separate namespaces in `data/`, and
// merging them here would let a Hazard silently inherit a Counter's mark the
// day someone authors `data/hazards/heat.json`.
//
// A Hazard and a Counter may wear the same mark, and Scorched and Seared do:
// they are the same fire on two different hosts, which is what the material
// language is for. They never share a tray — one stands on the piece's
// readout and the other on the ground's — and the panel each opens names
// which host is carrying it.
const HAZARD_MARKS: Record<string, StatusMark> = {
  // Fire on the floor: it burns what walks in, and it is the same ember flame
  // the Sear it leaves behind is drawn with.
  scorched: { glyph: 'flame', material: 'ember' },
  // The floor gone: not a wound, a wall. Steel, because what this costs is
  // standing room rather than Health.
  collapsed: { glyph: 'blocks', material: 'steel' },
}

export function hazardMark(hazardId: string): StatusMark {
  return HAZARD_MARKS[hazardId] ?? NEUTRAL_MARK
}

// One square's worth of condition, whatever kind of thing is carrying it.
// The tray draws these and knows nothing else: a Counter and a Hazard reach
// it as the same six answers, which is what lets one component stand on a
// piece's readout and on the ground's.
export interface StatusEntry {
  // Unique within its tray — a React key and the icon's `data-counter`.
  id: string
  title: string
  mark: StatusMark
  // How many are held. Ground counts the same way a piece does: two Scorched
  // on one hex is a `×2`, not two identical squares the eye has to compare.
  count: number
  remainingRounds: number
  // What the clock is measured against; `0` draws no clock, which is what
  // permanent ground and a clockless Counter both want.
  durationRounds: number
  rulesText: string
  // What kind of thing this is, printed on the popup a single one opens.
  badge: string
  // The numbers that popup lists, composed by whoever knows what they mean.
  stats: { label: string; value: string }[]
}

// The Counters one piece is holding.
export function counterEntries(catalog: ContentCatalog, state: EncounterState, entityId: string): StatusEntry[] {
  return getCounters(state, combatantRef(entityId)).map((counter) => {
    const definition = catalog.counters[counter.id]
    const stats = [{ label: 'Held', value: String(counter.count) }]
    if (counter.remainingRounds > 0) {
      stats.push({ label: 'Rounds left', value: String(counter.remainingRounds) })
    }
    return {
      id: counter.id,
      title: counter.title,
      mark: statusMark(counter.id),
      count: counter.count,
      remainingRounds: counter.remainingRounds,
      durationRounds: definition?.duration_rounds ?? counter.remainingRounds,
      // The authored rules text where the Counter came from `data/counters/`,
      // and the trigger reason for an engine-built one.
      rulesText: definition?.rules_text ?? counter.triggerReason,
      badge: 'Counter',
      stats,
    }
  })
}

// Everything one hex is carrying: its Hazards first, then any Counter held by
// the ground itself (D-048). Both are conditions of the tile rather than of
// whoever is standing on it, so they read on one tray — a Hero walking off
// leaves both behind.
//
// Hazards are grouped by id because the board stacks them as a list: two
// Scorched on one hex are one mark counting two, the way a stacked Counter
// is, and the longest clock among them is the one the ground is actually
// running.
export function groundEntries(catalog: ContentCatalog, state: EncounterState, key: HexKey): StatusEntry[] {
  const grouped = new Map<string, HazardInstance[]>()
  for (const hazard of state.board.hazards[key] ?? []) {
    grouped.set(hazard.id, [...(grouped.get(hazard.id) ?? []), hazard])
  }
  const hazards = [...grouped.values()].map(([first, ...rest]) => {
    const stack = [first, ...rest]
    const permanent = stack.some((hazard) => hazard.permanent === true)
    const remainingRounds = permanent ? 0 : Math.max(...stack.map((hazard) => hazard.remainingRounds))
    const stats = [{ label: 'On this ground', value: permanent ? 'Permanent' : `${remainingRounds} round${remainingRounds === 1 ? '' : 's'} left` }]
    if (first.enterDamage > 0) {
      stats.push({ label: 'Damage on entry', value: String(first.enterDamage) })
    }
    // The two questions ground answers about being entered (D-075), printed
    // only when the answer is yes: physics first, then choice, because a hex
    // nothing can enter has already answered the other one.
    if (first.impassable) {
      stats.push({ label: 'Entry', value: 'Nothing enters' })
    } else if (first.blocksVoluntaryMovement) {
      stats.push({ label: 'Entry', value: 'No willing step' })
    }
    return {
      id: first.id,
      title: first.title,
      mark: hazardMark(first.id),
      count: stack.length,
      remainingRounds,
      durationRounds: catalog.hazards[first.id]?.duration_rounds ?? remainingRounds,
      rulesText: catalog.hazards[first.id]?.rules_text ?? '',
      badge: 'Ground',
      stats,
    }
  })
  const marks = getCounters(state, hexCounterRef(parseHexKey(key))).map((counter) => {
    const definition = catalog.counters[counter.id]
    const stats = [{ label: 'Held', value: String(counter.count) }]
    if (counter.remainingRounds > 0) {
      stats.push({ label: 'Rounds left', value: String(counter.remainingRounds) })
    }
    return {
      id: counter.id,
      title: counter.title,
      mark: statusMark(counter.id),
      count: counter.count,
      remainingRounds: counter.remainingRounds,
      durationRounds: definition?.duration_rounds ?? counter.remainingRounds,
      rulesText: definition?.rules_text ?? counter.triggerReason,
      badge: 'Ground',
      stats,
    }
  })
  return [...hazards, ...marks]
}

// The one-line reading of a condition's state, used as the tray's accessible
// name: the squares carry the glyphs, and this carries what a glyph cannot —
// which condition it is, how many are held, how long it lasts.
export function statusLabel(title: string, count: number, remainingRounds: number): string {
  const held = count > 1 ? `${title}, ${count} held` : title
  return remainingRounds > 0 ? `${held}, ${remainingRounds} round${remainingRounds === 1 ? '' : 's'} left` : held
}

// The same two numbers as a figure, for a list row beside the square that is
// already drawing them: `×2 · 1r`. Empty for the quiet case — one held,
// no clock — because a row that prints `×1` for every unstacked Counter
// teaches the reader to stop looking at the column.
export function statusFigure(count: number, remainingRounds: number): string {
  const held = count > 1 ? `×${count}` : ''
  const clock = remainingRounds > 0 ? `${remainingRounds}r` : ''
  return [held, clock].filter((part) => part !== '').join(' · ')
}
