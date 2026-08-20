import { describe, expect, it } from 'vitest'
import {
  bossProgramSchema,
  bossSchema,
  cardSchema,
  chargeModifierSchema,
  counterSchema,
  encounterSchema,
  evaluationDeckSchema,
  hazardSchema,
  heroSchema,
  keywordSchema,
  minionSchema,
} from '@/engine'

// The authoring templates in docs/content/templates/ are the copy-ready
// starting points the scaffold tool (`npm run scaffold`) stamps into data/.
// They live outside data/ so the loader never mistakes a template for live
// content — which also means nothing validates them at load. This test is
// that validation: a template that stops parsing is a designer's very first
// file failing the build with a schema error they did not cause.
const templates = import.meta.glob('../../../docs/content/templates/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

// One entry per template file, named for the schema it must satisfy. The
// two-way check below keeps this table and the directory in step: a new
// template without a schema here, or a schema here without its template,
// both fail loudly.
const SCHEMAS = {
  boss: bossSchema,
  boss_program: bossProgramSchema,
  card: cardSchema,
  charge_modifier: chargeModifierSchema,
  counter: counterSchema,
  deck: evaluationDeckSchema,
  encounter: encounterSchema,
  hazard: hazardSchema,
  hero: heroSchema,
  keyword: keywordSchema,
  minion: minionSchema,
} as const

function templateName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1).replace(/\.json$/, '')
}

describe('authoring templates', () => {
  it('covers every template with a schema, and every schema with a template', () => {
    expect(Object.keys(templates).map(templateName).sort()).toEqual(Object.keys(SCHEMAS).sort())
  })

  for (const [path, payload] of Object.entries(templates)) {
    const name = templateName(path)
    it(`parses ${name}.json against its schema`, () => {
      const schema = SCHEMAS[name as keyof typeof SCHEMAS]
      expect(schema, `no schema mapped for template ${name}`).toBeDefined()
      const parsed = schema.parse(payload)
      // Every template id starts with new_ so a forgotten rename shows up in
      // validation output as itself rather than shadowing real content.
      expect(parsed.id.startsWith('new_'), `template ${name} id "${parsed.id}" must start with new_`).toBe(true)
    })
  }
})
