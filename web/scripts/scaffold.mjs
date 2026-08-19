#!/usr/bin/env node
// Stamp a new content file into data/ from its authoring template.
//
// This is the "copy the closest existing file" step of the daily workflow,
// minus the part where the copy arrives pre-loaded with another Hero's
// assumptions: the templates in docs/content/templates/ carry only the
// required fields and safe defaults, so what the designer edits next is the
// design, not leftover Embermaw tuning. The templates themselves are
// schema-validated by `templates.test.ts`, so a scaffolded file starts life
// parsing cleanly; cross-references it does not have yet (a deck card, a
// program id) fail the build by name, which is the loader teaching the next
// step rather than this script guessing at it.
//
//   npm run scaffold -- hero kessa_varn "Kessa Varn"
//   npm run scaffold -- card momentum_strike
//   npm run scaffold -- --list
//
// Exit status: 0 when the file is written, 1 on any refusal.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const TEMPLATES = join(REPO, 'docs', 'content', 'templates')

// Template name -> the data/ directory the loader globs. Scenarios are
// deliberately absent: they are exported from the Workbench debug rail,
// never authored by hand.
const TYPES = {
  hero: 'heroes',
  card: 'cards',
  keyword: 'keywords',
  charge_modifier: 'charge_modifiers',
  counter: 'counters',
  hazard: 'hazards',
  minion: 'minions',
  boss_program: 'boss_programs',
  encounter: 'encounters',
  deck: 'decks',
}

// What to do after the file exists, by type. Printed rather than linked-only
// because the person running this may not have the handoff doc open.
const NEXT_STEPS = {
  hero: [
    'Fill max_health, and set signature_card once the Signature card exists (scaffold it as a card with "fixed": true).',
    'Field the Hero from an Encounter by id ("hero": "<id>").',
    'Design contract: docs/rules/character-design-bible.md; walkthrough: docs/content/authoring-a-new-hero.md.',
  ],
  card: [
    'Write rules_text stating the base effect first, then pick speed, target_type, and effect fields.',
    'Register tags in data/keywords/ and reference the ids here.',
    'Authoring contract: docs/rules/player-card-authoring.md.',
  ],
  keyword: ['Pick the kind — role, trait, damage_type, or answer — because every reference is checked against it.'],
  charge_modifier: ['Set keyword_id to count one Keyword (empty counts every charged card) and reference this id from a card.'],
  counter: ['Choose the host, the max, and the Readers that give the count meaning; a Counter nothing can read fails the build.'],
  hazard: ['Set duration_rounds and at least one behavior: enter_damage or blocks_voluntary_movement.'],
  minion: ['Set max_health and attack_damage; a fuse (explode_damage + explode_radius) is both-or-neither.'],
  boss_program: ['Author the Instant and Incoming rows; Beat kinds are a closed set — see the handoff doc contract table.'],
  encounter: ['Point hero, player_deck, and boss_programs at real ids; the build names each missing reference.'],
  deck: ['Point encounter at the fight to measure against, then run: npm run evaluate -- --deck <id>.'],
}

const args = process.argv.slice(2).filter((arg) => arg !== '--')

if (args.includes('--list') || args.length === 0) {
  console.log('Usage: npm run scaffold -- <type> <id> ["Display Title"]')
  console.log(`Types: ${Object.keys(TYPES).join(', ')}`)
  process.exit(args.includes('--list') ? 0 : 1)
}

const [type, id, ...titleWords] = args

if (!TYPES[type]) {
  console.error(`Unknown type "${type}". Types: ${Object.keys(TYPES).join(', ')}`)
  process.exit(1)
}
// The id contract from the handoff doc: stable lowercase snake_case, filename
// to match. Refused here so the loader never has to.
if (!id || !/^[a-z][a-z0-9_]*$/.test(id)) {
  console.error(`The id must be lowercase snake_case (got "${id ?? ''}").`)
  process.exit(1)
}

const target = join(REPO, 'data', TYPES[type], `${id}.json`)
if (existsSync(target)) {
  console.error(`Refusing to overwrite ${target}`)
  process.exit(1)
}

// "kessa_varn" -> "Kessa Varn" when no title is given.
const title = titleWords.length > 0 ? titleWords.join(' ') : id.split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')

const template = JSON.parse(readFileSync(join(TEMPLATES, `${type}.json`), 'utf8'))
template.id = id
template.title = title
// A Program's Beats carry ids of their own; re-stem the placeholders so two
// scaffolded Programs never collide on a Beat id.
if (type === 'boss_program') {
  for (const row of ['instant_beats', 'incoming_beats']) {
    for (const beat of template[row] ?? []) {
      beat.id = beat.id.replace(/^new_program/, id)
    }
  }
}

mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, `${JSON.stringify(template, null, 2)}\n`)

console.log(`Wrote ${target}`)
for (const step of NEXT_STEPS[type] ?? []) {
  console.log(`  - ${step}`)
}
console.log('  - Validate: cd web && npm test (the running Workbench hot-reloads on save).')
