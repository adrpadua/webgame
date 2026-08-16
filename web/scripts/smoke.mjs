// Browser smoke run for the milestone exit criteria: play a full Round loop
// in the Encounter Workbench (M1), drive Scenario replay and time travel
// (M2), and export the played session as an Encounter Record that the
// headless runner replays to an identical final state (M3).
// Usage: npm run build && node scripts/smoke.mjs
import { spawn, spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

const PORT = 4173
const BASE_URL = `http://localhost:${PORT}/`
const HEX_SIZE = 36
const SQRT3 = Math.sqrt(3)

function axialOffset(q, r) {
  // Mirrors web/src/board/layout.ts relative to the board container center.
  return { x: 190 + HEX_SIZE * (SQRT3 * q + (SQRT3 / 2) * r), y: 200 + HEX_SIZE * 1.5 * r }
}

async function waitForServer(url, attempts = 50) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // Server not accepting connections yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Preview server did not start at ${url}`)
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(`FAILED: ${label}`)
  }
  console.log(`ok - ${label}`)
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: 'ignore',
})

try {
  await waitForServer(BASE_URL)
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } })
  await page.goto(BASE_URL)
  await page.waitForSelector('[data-testid="play-surface"]')

  const phase = () => page.locator('[data-phase]').getAttribute('data-phase')
  const next = () => page.locator('[data-testid="next-phase"]').click()

  assert((await phase()) === 'loadout', 'Encounter opens in the Loadout Step')
  assert((await page.locator('[data-testid="hand-card"]').count()) === 4, 'opening Hand holds 4 Compact Cards')

  // Loadout: drag the first hand card onto Slot 1 to prepare it.
  const slot0 = page.locator('[data-testid="slot-0"]')
  await page.locator('[data-testid="hand-card"]').first().dragTo(slot0)
  const topCard = await slot0.getAttribute('data-top-card')
  assert(topCard !== '', `dragging a hand card prepares Slot 1 (${topCard})`)
  assert((await page.locator('[data-testid="hand-card"]').count()) === 3, 'the prepared card left the Hand')

  // Tap path (accessibility contract): select a Compact Card, tap a Slot.
  const slot1 = page.locator('[data-testid="slot-1"]')
  await page.locator('[data-testid="hand-card"]').first().click()
  assert(
    (await page.locator('[data-testid="hand-card"]').first().getAttribute('data-selected')) === 'true',
    'tapping a Compact Card selects it',
  )
  assert((await slot0.getAttribute('data-incoming-action')) === 'Replace', 'an occupied Slot advertises Replace during Loadout')
  assert((await slot1.getAttribute('data-incoming-action')) === 'Prepare', 'an empty Slot advertises Prepare')
  await slot1.click()
  assert((await slot1.getAttribute('data-top-card')) !== '', 'tapping the empty Slot prepares the selected card')
  assert((await page.locator('[data-testid="replace-confirm"]').count()) === 0, 'preparing an empty Slot needs no confirmation')

  // Slot Replacement is destructive, so it must confirm before resolving.
  const slot0CardBefore = await slot0.getAttribute('data-top-card')
  await page.locator('[data-testid="hand-card"]').first().click()
  await slot0.click()
  await page.waitForSelector('[data-testid="replace-confirm"]')
  assert(true, 'replacing an occupied Slot opens the confirmation modal')
  await page.locator('[data-testid="cancel-replace"]').click()
  await page.waitForTimeout(100)
  assert((await slot0.getAttribute('data-top-card')) === slot0CardBefore, 'cancelling keeps the Slot bundle intact')

  await next()
  assert((await phase()) === 'instant', 'Next advances into Boss Instant')
  await next()
  assert((await phase()) === 'quick', 'Boss Instant resolves into the Quick Window')
  const heroHealth = await page.locator('[data-testid="hero-health"]').textContent()
  assert(heroHealth?.includes('30'), `Raking Claw hit the tank for 4 (${heroHealth?.trim()})`)

  // Quick Window: charge the prepared Slot with another hand card.
  await page.locator('[data-testid="hand-card"]').first().dragTo(slot0)
  assert((await slot0.getAttribute('data-charges')) === '1', 'a tucked hand card adds one Charge')

  // Quick Window: discard a hand card for 1 Stamina to move one hex.
  const board = page.locator('[data-testid="board"]')
  const handBefore = await page.locator('[data-testid="hand-card"]').count()
  const west = axialOffset(-1, 0)
  await page.locator('[data-testid="hand-card"]').first().dragTo(board, { targetPosition: west })
  await page.waitForTimeout(150)
  const handAfterMove = await page.locator('[data-testid="hand-card"]').count()
  assert(handAfterMove === handBefore - 1, 'the Stamina discard left the Hand')
  const factLog = await page.locator('[data-testid="fact-log"]').textContent()
  assert(factLog?.includes('Move to (-1, 0)'), 'the fact log records the Hero move')

  // Quick Window: a charged quick Top Card activates once. Whether the Top
  // Card is an attack or a guard depends on the seeded draw, so assert the
  // activation itself plus its visible effect (Boss health or Armor moved).
  const bossBefore = await page.locator('[data-testid="boss-health"]').textContent()
  const armorBefore = await page.locator('[data-testid="hero-armor"]').textContent()
  await slot0.click()
  await page.waitForTimeout(150)
  const slotState = await slot0.textContent()
  assert(slotState?.includes('Activated'), 'the charged Slot activated in its matching window')
  const bossAfter = await page.locator('[data-testid="boss-health"]').textContent()
  const armorAfter = await page.locator('[data-testid="hero-armor"]').textContent()
  assert(
    bossBefore !== bossAfter || armorBefore !== armorAfter,
    `firing the Slot had a visible effect (boss ${bossBefore?.trim()} -> ${bossAfter?.trim()}, ${armorBefore?.trim()} -> ${armorAfter?.trim()})`,
  )

  await next()
  assert((await phase()) === 'incoming', 'Quick Window resolves into Boss Incoming')
  await next()
  assert((await phase()) === 'slow', 'Boss Incoming resolves into the Slow Window')
  const incomingLog = await page.locator('[data-testid="fact-log"]').textContent()
  assert(incomingLog?.includes('Spawn whelp_1'), 'Brood Call spawned Whelps')

  await next()
  assert((await phase()) === 'loadout', 'the Slow Window rolls into the next Round')
  const round = await page.locator('[data-testid="round-display"]').textContent()
  assert(round?.includes('Round 2'), `the Boss Timeline rolled forward (${round?.trim()})`)
  assert((await page.locator('[data-testid="hand-card"]').count()) === 4, 'end-of-Round draw refilled the Hand to 4')

  // M3 exit criterion: export the session just played as an Encounter Record
  // (schema_version 2); the headless runner replays it after the browser
  // closes and must reach an identical final state.
  const recordJson = await page.evaluate(() => window.__workbench.exportRecord())
  const record = JSON.parse(recordJson)
  assert(record.schema_version === 2, 'the exported Encounter Record is schema_version 2')
  assert(record.outcome === 'abandoned' && record.abandon_reason === 'exported_mid_encounter', 'a live session exports as an Abandoned Encounter')
  assert(/^[0-9a-f]{64}$/.test(record.content_identity.fingerprint), 'the record carries a content identity fingerprint')
  const recordPath = join(tmpdir(), `workbench-smoke-record-${process.pid}.json`)
  writeFileSync(recordPath, recordJson)

  // M2 debug tooling: load the committed victory Scenario and walk its line
  // with time travel.
  await page.selectOption('[data-testid="scenario-select"]', 'embermaw_victory_line')
  await page.locator('[data-testid="load-scenario"]').click()
  await page.waitForSelector('[data-testid="outcome-banner"][data-outcome="victory"]')
  assert(true, 'the victory Scenario replays to the Victory banner')

  const position = await page.locator('[data-testid="time-travel-position"]').textContent()
  assert(/Step \d+ \/ \d+/.test(position ?? ''), `time travel shows the Scenario line (${position?.trim()})`)
  await page.locator('[data-testid="tt-prev"]').click()
  await page.waitForTimeout(100)
  assert((await page.locator('[data-testid="outcome-banner"]').count()) === 0, 'stepping back leaves the terminal state')
  await page.locator('[data-testid="time-travel-slider"]').fill('0')
  await page.waitForTimeout(100)
  assert((await phase()) === 'loadout', 'sliding to step 0 shows the seeded Loadout')
  const roundAtStart = await page.locator('[data-testid="round-display"]').textContent()
  assert(roundAtStart?.includes('Round 1'), 'step 0 is Round 1')

  await page.screenshot({ path: process.env.SMOKE_SHOT ?? 'smoke.png', fullPage: false })
  await browser.close()

  const replay = spawnSync('npx', ['vite-node', 'scripts/runHeadless.ts', '--', '--replay', recordPath], {
    cwd: new URL('..', import.meta.url).pathname,
    encoding: 'utf8',
  })
  assert(
    replay.status === 0 && replay.stdout.includes('REPLAY MATCH'),
    `the browser session's record replays headlessly to an identical final state\n${replay.stdout}${replay.stderr}`,
  )

  console.log('\nSMOKE PASSED: round loop, Scenario replay, time travel, and headless record replay all verified.')
} finally {
  server.kill()
}
