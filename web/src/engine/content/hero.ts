import { z } from 'zod'
import type { ContentCatalog } from './schemas'

// A Hero as first-class authored content: identity, health pool, and the
// Signature printed on them (ADR 0034). What a Hero *is* was previously three
// inline strings on every Encounter that fielded them, which meant a Hero
// could not exist before an Encounter did and could not be shared by two —
// retuning Elian's health in the prototype silently left the teaching slice's
// copy behind. What stays on the Encounter is everything the *fight* decides:
// where the Hero starts, what deck they bring, how many Slots the bar holds,
// and whether the Signature is fielded at all (the teaching slice keeps its
// two-Slot bar until its scripted first turn learns the third).
//
// A Hero's Role is deliberately absent: every card in their deck carries the
// Role Keyword, so the deck already states it and `heroRole` reads it back
// out. A copy here would be the one nothing checks.
export const heroSchema = z.object({
  id: z.string().min(1),
  // A Hero is addressed by first name everywhere the game speaks (D-095):
  // `title` is what every readout prints — `Elian`, `Maren` — and the id is
  // the same word lowercased, so a Scenario's `sourceId` reads as the person
  // it names rather than as the job they hold.
  title: z.string().min(1),
  // The name on the character sheet — `Captain Elian Voss`, `Registrar Maren
  // Tallis`. Flavour, never a readout: rank and house are what a party learns
  // about someone, not how they are called in the middle of a fight, and a
  // frame 208px wide truncates them into nothing. Empty falls back to `title`
  // wherever the full name is told.
  full_name: z.string().default(''),
  rules_text: z.string().default(''),
  max_health: z.number().int().min(1),
  // The Signature printed on this Hero (D-064, ADR 0032): a `fixed: true`
  // card, installed as an always-present extra Slot wherever an Encounter
  // fields this Hero. Empty means the Hero has no Signature authored yet.
  signature_card: z.string().default(''),
})

export type Hero = z.infer<typeof heroSchema>

// The Signature contract's cross-concept half (D-064, ADR 0034): a Hero and
// a fixed card name each other, checked in both directions.
export function validateSignatures(
  catalog: ContentCatalog,
  heroAt: (id: string) => string,
  cardAt: (id: string) => string,
): void {
  // Only a Hero-named card may be fixed (D-064): a Signature is printed on a
  // Hero, and the Hero definition in data/heroes/ is where it is printed
  // (ADR 0034). Checked in both directions — a Hero naming a non-fixed card,
  // and a fixed card no Hero names, are both authoring errors.
  const referencedSignatures = new Set<string>()
  for (const hero of Object.values(catalog.heroes)) {
    if (hero.signature_card === '') {
      continue
    }
    const signature = catalog.cards[hero.signature_card]
    if (!signature) {
      throw new Error(`${heroAt(hero.id)} references unknown signature card ${hero.signature_card}`)
    }
    if (!signature.fixed) {
      throw new Error(`${heroAt(hero.id)} names ${signature.id} as their signature card, but that card is not fixed`)
    }
    referencedSignatures.add(signature.id)
  }
  for (const card of Object.values(catalog.cards)) {
    if (card.fixed && !referencedSignatures.has(card.id)) {
      throw new Error(`${cardAt(card.id)} is fixed but no Hero names it as their signature card, so nothing carries it`)
    }
  }}
