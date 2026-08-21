// Do any two modules in one directory collide on a case-insensitive
// filesystem? Exits 0 in silence, or 1 naming every colliding pair.
//
// Worth a script because the failure it prevents is invisible where the gate
// runs: this repo's checks execute on case-sensitive Linux, where
// `./BeatCard` can only ever resolve `BeatCard.tsx` — but on a contributor's
// macOS checkout the same specifier can resolve a sibling `beatCard.ts`
// first, and the build fails with missing-export and inconsistent-casing
// errors (TS1149) that no gate here ever saw. The engine-hardening follow-up
// review caught exactly that: four component/helper pairs differing only by
// capitalization shipped green and broke the reviewer's clean build.
//
// The rule: within a directory, two module files whose names-without-extension
// are equal case-insensitively are one import specifier fighting over two
// files. `foo.test.ts` keeps its `.test` suffix as part of the name, so a
// module and its test never collide with each other.
import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src')
const MODULE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs)$/

const collisions = []

function scan(directory) {
  const entries = readdirSync(directory, { withFileTypes: true })
  const byLoweredName = new Map()
  for (const entry of entries) {
    if (entry.isDirectory()) {
      scan(join(directory, entry.name))
      continue
    }
    if (!MODULE_EXTENSIONS.test(entry.name)) {
      continue
    }
    const moduleName = entry.name.replace(MODULE_EXTENSIONS, '')
    const lowered = moduleName.toLowerCase()
    const holder = byLoweredName.get(lowered) ?? []
    holder.push(entry.name)
    byLoweredName.set(lowered, holder)
  }
  for (const names of byLoweredName.values()) {
    if (names.length > 1) {
      collisions.push(`${relative(ROOT, directory) || '.'}: ${names.sort().join(' / ')}`)
    }
  }
}

scan(ROOT)

if (collisions.length > 0) {
  console.error('Module names that collide on a case-insensitive filesystem:')
  for (const collision of collisions.sort()) {
    console.error(`  ${collision}`)
  }
  console.error('Rename one of each pair to a distinct name (see scripts/check-module-casing.mjs).')
  process.exit(1)
}
