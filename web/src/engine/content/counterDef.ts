import { z } from 'zod'
import { AUTHORED_WHENS } from './grammar'
import { requireKeyword, KEYWORD_REFERENCES } from '../keywords'
import { readableReaderPairs, readerSubscription, whenCarriesKeywords } from '../events'
import { ENGINE_COUNTERS } from '../counters'
import type { ContentCatalog } from './schemas'

// What a Counter does while it is held, and when it does it (D-047). A
// Counter is inert on its own — a named, counted marker — and a Reader is the
// only thing that turns a count into an effect. The payload lives here rather
// than on the marker, so what a Counter *means* is decided by what reads it.
// That is the whole reason a marker is worth having: three cards may place
// Ash, and the cards that read Ash decide what Ash is worth.
export const counterReaderSchema = z.object({
  when: z.enum(AUTHORED_WHENS),
  // Narrows a damage Reader to blows carrying one Keyword (D-049): empty
  // answers every blow, `raid_hit` answers only a Minion's bite. This is the
  // Reader reading the *event* rather than the host — the fact stream already
  // carried these Keywords, and this is what lets content read them.
  event_keyword: z.string().default(''),
  effect: z.enum(['armor', 'healing', 'boss_damage', 'target_damage']),
  // Signed, and applied once per Counter held: Sundered raises what its host
  // takes at `1`, Weakened lowers what its host deals at `-1`, and Fortified
  // banks Armor at `1` per Counter so the count *is* the stored Armor. Zero is
  // refused by the catalog rather than allowed as a Reader that does nothing.
  per: z.number().int().default(1),
})

// A Counter: identity, host, bounds, and what reads it. Counters replace the
// Status Effect definition entirely (D-047). The two named payload fields
// D-034 chose are gone — an Enemy-facing Counter is one whose Readers happen
// to fire on an Enemy's events, not a separate kind of thing with its own
// schema.
export const counterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  keywords: z.array(z.string()).default([]),
  // What holds this Counter. A combatant is the Boss, a Hero, or a Minion; a
  // `hex` is ground, which outlives whoever is standing on it; a `slot` is a
  // prepared Top Card, which is D-035's ally attachment finally reachable.
  // `encounter` is deliberately absent — Escalation is the encounter-wide
  // counter, and its band effects are not `per`-count modifiers (D-048).
  host: z.enum(['combatant', 'hex', 'slot']).default('combatant'),
  // The stacking rule, as a number. `1` is the old non-stacking behaviour: a
  // second placement is refused rather than refreshing. Anything higher
  // accumulates, which is how Fortified's additive stacking (D-019) survives
  // without a `stacking` flag.
  max: z.number().int().min(1).default(1),
  // `0` means no clock — the Counter sits until something spends it. That is
  // the axis a duration cannot express, and the more interesting one.
  duration_rounds: z.number().int().min(0).default(0),
  readers: z.array(counterReaderSchema).default([]),
})

export type CounterReader = z.infer<typeof counterReaderSchema>
export type CounterDefinition = z.infer<typeof counterSchema>

export function validateCounters(catalog: ContentCatalog): void {
  for (const counter of Object.values(catalog.counters)) {
    for (const keywordId of counter.keywords) {
      requireKeyword(catalog, keywordId, KEYWORD_REFERENCES.counterKeyword, `Counter ${counter.id}`, 'keywords')
    }
    for (const reader of counter.readers) {
      if (readerSubscription(reader.when, reader.effect) === undefined) {
        throw new Error(
          `Counter ${counter.id} authors a ${reader.when}/${reader.effect} reader, which nothing reads; the readable pairs are ${readableReaderPairs().join(', ')}`,
        )
      }
      if (reader.per === 0) {
        throw new Error(`Counter ${counter.id} has a ${reader.when} reader with per 0, which does nothing`)
      }
      if (reader.event_keyword !== '') {
        // Only a damage event carries Keywords. A Round starting and a Slot
        // firing are not made of anything, so narrowing them by Keyword would
        // author a Reader that can never fire.
        if (!whenCarriesKeywords('reader', reader.when)) {
          throw new Error(`Counter ${counter.id} narrows a ${reader.when} reader by event_keyword, but only damage events carry Keywords`)
        }
        requireKeyword(catalog, reader.event_keyword, KEYWORD_REFERENCES.damageKeywords, `Counter ${counter.id}`, 'event_keyword')
      }
    }
    // A Reader's `when` has to name something that happens to its host.
    // Combatant events — the Round's Armor grant, taking or dealing damage,
    // firing a Slot — never happen to ground, and `host_entered` (D-086)
    // never happens to a combatant: it is the one Reader a hex-hosted
    // Counter may carry, and the ground's only one. A prepared Slot has no
    // events at all, so a slot-hosted Counter stays a pure marker.
    for (const reader of counter.readers) {
      if (counter.host === 'hex' && reader.when !== 'host_entered') {
        throw new Error(`Counter ${counter.id} is hosted on a hex but authors a ${reader.when} reader; ground hears only host_entered (D-086)`)
      }
      if (counter.host === 'combatant' && reader.when === 'host_entered') {
        throw new Error(`Counter ${counter.id} is hosted on a combatant but authors a host_entered reader; a combatant is never entered (D-086)`)
      }
    }
    if (counter.host === 'slot' && counter.readers.length > 0) {
      throw new Error(`Counter ${counter.id} is hosted on a slot but declares readers, and a prepared Slot has no events`)
    }
    // The reachability half that can be enforced today: a Counter nothing
    // reads is an unreachable mechanic. The other half — a Counter nothing
    // places — is deliberately not an error yet, because Sundered and
    // Weakened are exactly that and are waiting on the deck-evaluation gate
    // for their first card (backlog item 10). Enforcing it now would delete
    // authored content to satisfy a lint.
    const readByCard = Object.values(catalog.cards).some((card) =>
      card.reads.some((reader) => reader.counter === counter.id || (reader.counter_keyword !== '' && counter.keywords.includes(reader.counter_keyword))),
    )
    if (counter.readers.length === 0 && !readByCard && !ENGINE_COUNTERS.includes(counter.id)) {
      throw new Error(`Counter ${counter.id} has no readers and no card reads it, so nothing can ever make it matter`)
    }
  }}
