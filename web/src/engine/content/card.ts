import { z } from 'zod'
import { AUTHORED_WHENS } from './grammar'
import { requireKeyword, KEYWORD_REFERENCES } from '../keywords'
import { evaluatedGrantWhens, grantSubscription, whenCarriesKeywords } from '../events'
import type { ContentCatalog } from './schemas'
import type { CounterDefinition } from './counterDef'

// The Card concept, whole: its shape, its cross-field rules, and its derived
// properties in one file (engine-deepening candidate 3 — "state each content
// concept once"). Adding a Card field means editing here, not a schema in one
// file and its rule four hundred lines away in another. The Charge Modifier
// rides along because it is the fired card's charge grammar.

export const chargeModifierSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  keyword_id: z.string().default(''),
  effect: z.enum(['armor', 'healing', 'boss_damage', 'target_damage']),
  amount_per_match: z.number().int().min(1),
})

// What a Card does with Counters when it fires. Three verbs, and no way to
// combine them with boolean logic: every `gate` has to pass, and that is the
// entire grammar. The moment this wants `or`, what is being written is an
// interpreter, and the mechanic belongs in engine code instead — the escape
// hatch a Beat kind already provides.
export const cardReaderSchema = z.object({
  // gate:  refuse the fire unless the count qualifies.
  // scale: add `per` to an effect for each Counter held.
  // spend: remove Counters.
  verb: z.enum(['gate', 'scale', 'spend']),
  // Exactly one of these names what is read. `counter_keyword` matches every
  // Counter carrying that Keyword, which is the Charge Modifier's
  // match-by-keyword generalised off the Charge Stack.
  counter: z.string().default(''),
  counter_keyword: z.string().default(''),
  // A closed set of subjects, never a path expression. Phase 1 reads the
  // firing Hero or the Card's chosen target and nothing else.
  on: z.enum(['self', 'target']).default('target'),
  effect: z.enum(['armor', 'healing', 'boss_damage', 'target_damage']).default('target_damage'),
  // These floor at 0, not 1, because 0 is what an omitted field means and a
  // Reader only uses the one its verb needs. The real rule — a `gate` without
  // `at_least`, a `scale` without `per`, a `spend` without `amount` is a
  // Reader that does nothing — is a catalog check, where it can name the card.
  // Enforcing it here instead made every default invalid, which no test caught
  // because every test supplied all three fields by hand and no authored card
  // used `reads` at all until Quench.
  at_least: z.number().int().min(0).default(0),
  per: z.number().int().default(0),
  amount: z.number().int().min(0).default(0),
  // A cost is paid before the Card's effects are computed and is not refunded
  // if they come to nothing; a resolution spend happens after. The difference
  // is visible whenever a Card both scales off a Counter and spends it.
  timing: z.enum(['cost', 'resolution']).default('cost'),
})

// A Signature's standing clause: a Grant, the mirror of a Counter Reader
// (D-064). It answers one event from the same closed `when` set, narrowed by
// the same `event_keyword` mechanism (D-049), and produces a Charge on the
// fixed Slot where a Reader produces a number. Gates follow the cardReader
// rule verbatim: a closed enumerated set, every gate must pass, and there is
// no boolean combination — the moment this wants `or`, what is being written
// is an interpreter.
export const signatureGrantSchema = z.object({
  when: z.enum(AUTHORED_WHENS),
  event_keyword: z.string().default(''),
  // The closed gate list. `health_loss_zero` is the perfect block —
  // mitigation fully answered the blow — and `guarded_front` is the Warden
  // sentence as a predicate. Both already exist as engine computations; a
  // Grant only exposes them (D-064).
  // The closed gate list. `health_loss_zero` is the perfect block —
  // mitigation fully answered the blow — and `guarded_front` is the Warden
  // sentence as a predicate; both are questions about a blow taken.
  // `effect_landed` asks whether the event actually did anything, which is
  // what stops an offensive or tempo earn being farmed by firing into
  // nothing (ADR 0037). Which gates each `when` may use is a closed pairing
  // the catalog checks, because a gate asking about a blow is incoherent on
  // an event that is not one.
  gates: z.array(z.enum(['health_loss_zero', 'guarded_front', 'effect_landed'])).default([]),
  grants_charge: z.number().int().min(1).default(1),
})

// What a fixed card does only when fired at its full Charge cap — ADR 0008's
// anticipated "class-specific full-charge mechanics", first exercised by the
// Riposte's Sundered rider (D-064 decision 13). The Counter lands on the
// Boss, following the card's Boss damage rather than its `target_type`, and
// lands after that damage resolves: the follow-through opens the wound; the
// rider's own hit does not benefit.
export const fullChargeSchema = z.object({
  places_counter: z.string().default(''),
  counter_amount: z.number().int().min(1).default(1),
})

export const cardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  speed: z.enum(['quick', 'slow', 'fast']),
  // A Signature card (D-064, ADR 0032): printed on a Hero, never in the deck,
  // never drawn, never replaceable, never discarded. Its Slot charges only
  // through the `standing` Grants below — hand cards physically cannot reach
  // it — and firing spends the whole stack while the card stays. Only a card
  // a Hero names as their `signature_card` may set this (ADR 0034).
  fixed: z.boolean().default(false),
  standing: z.array(signatureGrantSchema).default([]),
  full_charge: fullChargeSchema.default({ places_counter: '', counter_amount: 1 }),
  // What the Hero Frame calls this Signature's earned Charges (D-065):
  // Elian's are "Ripostes", Kessa's will be "Momentum". Empty falls back to
  // the card title. Presentation vocabulary only — the rules say Charges.
  resource_title: z.string().default(''),
  max_charge: z.number().int().min(0).default(2),
  // What must be selected to fire this card.
  //
  // `ally` is the Healer seam: a living party member, chosen at fire time,
  // who receives this card's Armor and healing instead of the firing Hero.
  // It is its own family rather than a widening of `piece` because `piece`
  // means "an Enemy" everywhere else in the rules — legality, range, Counter
  // hosting — and overloading it would make every existing target check ask
  // which kind of piece it meant. The firing Hero is a legal `ally` target:
  // self-preservation is a worse use of the card, not an illegal one, and a
  // rule refusing it would make a solo Party unable to fire its own cards.
  target_type: z.enum(['none', 'hex', 'board_slot', 'piece', 'ally']).default('none'),
  armor_delta: z.number().int().default(0),
  armor_next_round: z.number().int().min(0).default(0),
  healing: z.number().int().default(0),
  boss_damage: z.number().int().default(0),
  // How far this card reaches, in hexes, measured from the firing Hero to
  // whatever it lands on — a selected piece, a selected hex, or the Boss a
  // `boss_damage` card never has to name (D-073). `0` is a card that reaches
  // nothing but its own Hero, and the catalog refuses both halves of the
  // mismatch: a card that reaches without a reach, and a reach on a card that
  // touches nobody.
  //
  // It was here from the start and only some of the reaching effects read it.
  // `boss_damage` was deliberately exempt — the positionless ruling behind
  // D-017 — which made Steady Strike a melee swing in its rules text and an
  // artillery piece in the Workbench: a Guardian standing three hexes clear of
  // Embermaw hit exactly as hard as one holding the Guarded Front. Reach is now
  // one property that every ability answers, the same way every reaching Beat
  // does.
  range_tiles: z.number().int().min(0).default(0),
  damage: z.number().int().default(0),
  draw_count: z.number().int().min(0).max(3).default(0),
  burst_radius: z.number().int().min(0).default(0),
  push_tiles: z.number().int().min(0).default(0),
  pull_tiles: z.number().int().min(0).default(0),
  tags: z.array(z.string()).default([]),
  charge_modifiers: z.array(z.string()).default([]),
  // The Counter this card places, if any. Where it lands comes from
  // `target_type`, which D-033 made load-bearing and D-047 leaves alone:
  // `none` places on the firing Hero, `piece` on a selected piece,
  // `board_slot` on a prepared Slot — solo, one of the firing Hero's own,
  // since D-035's ally has no seat at the table yet.
  places_counter: z.string().default(''),
  counter_amount: z.number().int().min(1).default(1),
  // What this card's damage is made of, so a Counter can answer it (D-049).
  // The party's damage was unkeyworded while only Boss Beats classified
  // theirs, which left "increase fire damage by 1" authorable in one
  // direction only.
  damage_keywords: z.array(z.string()).default([]),
  // What this card reads before and while it resolves (D-047).
  reads: z.array(cardReaderSchema).default([]),
})

export type ChargeModifier = z.infer<typeof chargeModifierSchema>
export type CardReader = z.infer<typeof cardReaderSchema>
export type SignatureGrant = z.infer<typeof signatureGrantSchema>
export type Card = z.infer<typeof cardSchema>

// What a Card touches that is not the Hero firing it, named rather than
// counted so the authoring error can say which field asked for a reach. Every
// one of these is measured from the Hero's hex at fire time, so every one of
// them needs `range_tiles` to say how far that measurement may stretch.
//
// `boss_damage` is in this list and used not to be. It resolved without a
// range check under the positionless ruling behind D-017, which meant reach
// was a property some abilities had and others silently did without.
function cardReachingEffects(card: Card): string[] {
  const reaching: string[] = []
  if (card.boss_damage > 0) {
    reaching.push('boss_damage')
  }
  if (card.damage > 0) {
    reaching.push('damage')
  }
  if (card.push_tiles > 0) {
    reaching.push('push_tiles')
  }
  if (card.pull_tiles > 0) {
    reaching.push('pull_tiles')
  }
  if (card.target_type === 'hex' || card.target_type === 'piece' || card.target_type === 'ally') {
    reaching.push(`target_type ${card.target_type}`)
  }
  return reaching
}

// Which `target_type` values can supply each Counter host.
const HOST_TARGETS: Record<CounterDefinition['host'], string[]> = {
  // An `ally` target is a combatant like any other, which is what lets a
  // Healer card place a Counter on the party member it preserves — the ward
  // shape the healer research note calls the Bond.
  combatant: ['none', 'piece', 'ally'],
  hex: ['hex'],
  slot: ['board_slot'],
}

export function validateCards(catalog: ContentCatalog, cardAt: (id: string) => string): void {
  for (const card of Object.values(catalog.cards)) {
    // A Burst spreads whichever effect the card carries: damage over the
    // Enemies inside it, or healing over the party Heroes inside it (D-080,
    // the paper Radial pattern). A Burst carrying neither covers nothing.
    if (card.burst_radius > 0 && card.damage < 1 && card.healing < 1) {
      throw new Error(`${cardAt(card.id)} declares burst_radius ${card.burst_radius} but deals no damage and heals nothing`)
    }
    if (card.burst_radius > 0 && card.target_type !== 'hex') {
      throw new Error(`${cardAt(card.id)} declares burst_radius ${card.burst_radius} but does not target a hex`)
    }
    if (card.push_tiles > 0 && card.pull_tiles > 0) {
      throw new Error(`${cardAt(card.id)} declares both push_tiles and pull_tiles`)
    }
    const displacementField = card.push_tiles > 0 ? 'push_tiles' : card.pull_tiles > 0 ? 'pull_tiles' : ''
    if (displacementField !== '' && card.target_type !== 'piece') {
      throw new Error(`${cardAt(card.id)} declares ${displacementField} but does not target a piece`)
    }
    // Both halves of the reach rule, the same pair the ranged Beat kinds
    // answer below (D-043, extended to cards by D-073): a card that touches
    // anything past its own Hero authors how far it touches, and a card that
    // touches nobody must not author a reach nothing reads.
    //
    // `board_slot` is deliberately outside the reaching set: an ally's prepared
    // Slot is not a place on the board, and support was chosen adjacency-free
    // (D-009). An `ally` *is* in it, because ADR 0035 chose the other answer
    // for the Hero themselves — a card reaches an ally at an authored distance,
    // and `legality` enforces it — so the two halves of D-009's ruling came
    // apart: the Slot stays adjacency-free, the body does not.
    const reaching = cardReachingEffects(card)
    if (reaching.length > 0 && card.range_tiles < 1) {
      throw new Error(`${cardAt(card.id)} reaches past its Hero (${reaching.join(', ')}) but authors no range_tiles`)
    }
    if (reaching.length === 0 && card.range_tiles > 0) {
      throw new Error(`${cardAt(card.id)} authors range_tiles ${card.range_tiles} but reaches nothing past its own Hero`)
    }
    for (const modifierId of card.charge_modifiers) {
      if (!catalog.chargeModifiers[modifierId]) {
        throw new Error(`Card ${card.id} references unknown charge modifier ${modifierId}`)
      }
    }
    for (const tag of card.tags) {
      requireKeyword(catalog, tag, KEYWORD_REFERENCES.cardTag, `Card ${card.id}`, 'tag')
    }
    for (const keywordId of card.damage_keywords) {
      requireKeyword(catalog, keywordId, KEYWORD_REFERENCES.damageKeywords, `Card ${card.id}`, 'damage_keywords')
    }
    if (card.damage_keywords.length > 0 && card.damage === 0 && card.boss_damage === 0) {
      throw new Error(`Card ${card.id} declares damage_keywords but deals no damage`)
    }
    if (card.places_counter !== '') {
      const counter = catalog.counters[card.places_counter]
      if (!counter) {
        throw new Error(`Card ${card.id} references unknown counter ${card.places_counter}`)
      }
      // `target_type` is the whole rule for where a Counter lands (D-033,
      // kept by D-047): `none` places on the firing Hero, `piece` on a
      // selected piece. D-034's `applies_to` cross-check is gone with the
      // field, and nothing is lost — "written for an Enemy" stopped being a
      // property of the Counter the moment its payload became Readers. A
      // Counter whose Reader fires on `host_damage_incoming` does the same thing
      // to whoever holds it, and a card that Sunders its own Hero is a bad
      // card rather than an incoherent one.
      // A Counter's host and a card's target have to agree (D-048): only a hex
      // target can supply a hex, only a Slot target a Slot. Checked here so
      // resolution never has to ask what to do with a card that targets
      // nothing and places ground.
      if (!HOST_TARGETS[counter.host].includes(card.target_type)) {
        throw new Error(
          `Card ${card.id} places ${counter.id}, a ${counter.host} Counter, but targets ${card.target_type}; that host needs ${HOST_TARGETS[counter.host].join(' or ')}`,
        )
      }
      if (card.counter_amount > counter.max) {
        throw new Error(`Card ${card.id} places ${card.counter_amount} ${counter.id} but that Counter caps at ${counter.max}`)
      }
    }
    for (const reader of card.reads) {
      const named = [reader.counter, reader.counter_keyword].filter((value) => value !== '')
      if (named.length !== 1) {
        throw new Error(`Card ${card.id} has a ${reader.verb} reader naming ${named.length} of counter/counter_keyword; it must name exactly one`)
      }
      if (reader.counter !== '' && !catalog.counters[reader.counter]) {
        throw new Error(`Card ${card.id} reads unknown counter ${reader.counter}`)
      }
      if (reader.counter_keyword !== '') {
        requireKeyword(catalog, reader.counter_keyword, KEYWORD_REFERENCES.counterKeyword, `Card ${card.id}`, 'counter_keyword')
      }
      // A verb with none of its own numbers set is a reader that does nothing,
      // which is the failure this whole vocabulary exists to make loud.
      if (reader.verb === 'gate' && reader.at_least < 1) {
        throw new Error(`Card ${card.id} has a gate reader with no at_least`)
      }
      if (reader.verb === 'scale' && reader.per === 0) {
        throw new Error(`Card ${card.id} has a scale reader with no per`)
      }
      if (reader.verb === 'spend' && reader.amount < 1) {
        throw new Error(`Card ${card.id} has a spend reader with no amount`)
      }
      // A spend has to name one Counter. "Remove 3 of any fire Counter" would
      // make the rules pick which, and a rule that picks for the player is a
      // rule the player cannot plan against.
      if (reader.verb === 'spend' && reader.counter === '') {
        throw new Error(`Card ${card.id} spends by keyword; a spend must name one counter`)
      }
      if (reader.on === 'target' && card.target_type === 'none') {
        throw new Error(`Card ${card.id} has a ${reader.verb} reader on the target but chooses no target`)
      }
    }
    // The Signature contract (D-064, ADR 0032). A fixed card is a Hero's
    // engine: its standing clause is its only Charge source, so a fixed card
    // without one is a Slot that can never fire; and its Charges are tokens
    // with no Keywords, so a keyword-matching Charge Modifier on it would
    // author a bonus that can never match.
    if (card.fixed && card.standing.length === 0) {
      throw new Error(`${cardAt(card.id)} is fixed but authors no standing clause, so its Slot could never gain a Charge`)
    }
    if (!card.fixed && card.standing.length > 0) {
      throw new Error(`${cardAt(card.id)} authors a standing clause but is not fixed; only a Signature carries one`)
    }
    if (!card.fixed && card.full_charge.places_counter !== '') {
      throw new Error(`${cardAt(card.id)} authors a full_charge block but is not fixed; only a Signature carries one`)
    }
    if (card.fixed) {
      for (const modifierId of card.charge_modifiers) {
        if (catalog.chargeModifiers[modifierId]?.keyword_id !== '') {
          throw new Error(
            `${cardAt(card.id)} is fixed but its charge modifier ${modifierId} matches by Keyword; earned Charges are tokens and carry none`,
          )
        }
      }
      // The Signature control fires with a tap (D-065) or, since Maren's
      // Underwriting (D-080), through the same targeting flow every Slot
      // uses: `ally` targeting resolves by tapping the ally's hex, and
      // `fireTargeting` projects the legal set. Hex and piece targeting on a
      // fixed card still have no consumer, so they stay refused at load —
      // the gap loud rather than latent, exactly as D-065 wanted.
      if (card.target_type !== 'none' && card.target_type !== 'ally') {
        throw new Error(
          `${cardAt(card.id)} is fixed but targets ${card.target_type}; a Signature activates untargeted or at an ally (D-065, D-080)`,
        )
      }
    }
    if (!card.fixed && card.resource_title !== '') {
      throw new Error(`${cardAt(card.id)} authors a resource_title but is not fixed; only a Signature names a resource`)
    }
    for (const grant of card.standing) {
      // A Grant `when` no registry row hears is a load error, never a clause
      // that silently does nothing (ADR 0041). `host_damage_incoming` is the
      // modifier moment: a Grant cannot change the number, so no grant row
      // hears it and this refusal is what says so.
      const grantRow = grantSubscription(grant.when)
      if (grantRow === undefined) {
        throw new Error(
          `${cardAt(card.id)} authors a ${grant.when} standing clause, which nothing evaluates; the evaluated whens are ${evaluatedGrantWhens().join(', ')}`,
        )
      }
      // Which gates the event can answer (ADR 0037). A gate is a question
      // about a moment, and three of the four moments are not blows: asking
      // whether a Round start lost zero health is incoherent rather than
      // merely false. Refused here rather than allowed to load and quietly
      // never pass — the same trap the `when` check above closes.
      const allowedGates = grantRow.gates
      for (const gate of grant.gates) {
        if (!allowedGates.includes(gate)) {
          throw new Error(
            `${cardAt(card.id)} gates a ${grant.when} standing clause on ${gate}, which that event cannot answer; ${grant.when} takes ${allowedGates.length > 0 ? allowedGates.join(' or ') : 'no gates'}`,
          )
        }
      }
      // An event_keyword narrows a *blow*. On an event that is not one there
      // is no Keyword to match, so the clause would never fire.
      if (grant.event_keyword !== '' && !whenCarriesKeywords('grant', grant.when)) {
        throw new Error(`${cardAt(card.id)} narrows a ${grant.when} standing clause by event_keyword, but that event carries no damage Keywords`)
      }
      if (grant.event_keyword !== '') {
        requireKeyword(catalog, grant.event_keyword, KEYWORD_REFERENCES.damageKeywords, `Card ${card.id}`, 'standing event_keyword')
      }
    }
    if (card.full_charge.places_counter !== '') {
      const riderCounter = catalog.counters[card.full_charge.places_counter]
      if (!riderCounter) {
        throw new Error(`${cardAt(card.id)} full_charge references unknown counter ${card.full_charge.places_counter}`)
      }
      // The rider follows the card's Boss damage, so it marks a combatant by
      // construction — a hex or slot Counter here has nowhere to land.
      if (riderCounter.host !== 'combatant') {
        throw new Error(`${cardAt(card.id)} full_charge places ${riderCounter.id}, which is hosted on a ${riderCounter.host}; the rider marks the Boss`)
      }
      // An enemy-facing rider follows the card's Boss damage (the Riposte's
      // Sundered); a preservation Signature's rider follows its ally cover
      // instead, landing on the firing Hero (D-080). A card with neither has
      // nothing for the rider to ride.
      if (card.boss_damage === 0 && card.target_type !== 'ally') {
        throw new Error(`${cardAt(card.id)} authors a full_charge rider but deals no Boss damage for it to follow`)
      }
    }
  }}

export function validateChargeModifiers(catalog: ContentCatalog): void {
  for (const modifier of Object.values(catalog.chargeModifiers)) {
    if (modifier.keyword_id !== '') {
      requireKeyword(catalog, modifier.keyword_id, KEYWORD_REFERENCES.chargeModifierMatch, `Charge modifier ${modifier.id}`, 'keyword_id')
    }
  }}

// Whether firing this card needs a chosen piece — because it puts a Counter
// on one, or reads Counters there. One predicate, because legality and the
// targeting projection the board draws from have to agree about which pieces
// are offerable; two copies of it is how they come to disagree.
export function cardNeedsPieceTarget(card: Card): boolean {
  return card.target_type === 'piece' && (card.places_counter !== '' || card.reads.some((reader) => reader.on === 'target'))
}

// The Top Card alone determines activation timing; legacy "fast" reads as quick.
export function cardWindowSpeed(card: Card): 'quick' | 'slow' {
  if (card.speed === 'fast') {
    return 'quick'
  }
  return card.speed
}

// Charge Value: an explicit max_charge wins; otherwise slow cards hold 3, quick 2.
export function cardChargeCap(card: Card): number {
  if (card.max_charge > 0) {
    return card.max_charge
  }
  return cardWindowSpeed(card) === 'slow' ? 3 : 2
}
