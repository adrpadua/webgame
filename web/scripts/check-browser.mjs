// Is the browser this repo's Playwright version needs actually on this
// machine? Exits 0 with the path, or 1 with the one command that fixes it.
//
// Worth a script rather than letting the smoke fail on its own, because the
// two failures look nothing alike. Missing browser, unchecked, surfaces as a
// stack trace from inside Playwright about an executable path — which reads
// like a broken suite. Checked, it is one line naming the command to run.
//
// It resolves through `chromium.executablePath()` rather than looking for any
// chrome on the box, so it answers the question that matters: the build this
// Playwright version drives. A runner carrying a browser from an older pin
// fails here, which is correct — that is the mismatch that would otherwise
// surface as an inscrutable launch error mid-suite.
import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

// smoke.mjs launches with `executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH
// || undefined`, so a machine pointing at its own build is a supported setup —
// a sandbox with a system Chromium, or a runner sharing one between checkouts.
// Check whatever the suite will actually launch, or this refuses environments
// the suite runs in perfectly well.
const override = process.env.PLAYWRIGHT_CHROMIUM_PATH
const path = override && override !== '' ? override : chromium.executablePath()

if (existsSync(path)) {
  console.log(`chromium ok -> ${path}${override ? ' (PLAYWRIGHT_CHROMIUM_PATH)' : ''}`)
  process.exit(0)
}

console.error(
  `No Chromium for this Playwright version at ${path}. ` +
    'Install it once with: cd web && npx playwright install --with-deps chromium ' +
    '(macOS: drop --with-deps). If this machine already has a build somewhere else, ' +
    'point PLAYWRIGHT_CHROMIUM_PATH at it instead.',
)
process.exit(1)
