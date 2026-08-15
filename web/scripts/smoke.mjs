// Browser smoke run for the M1 exit criterion: play a full Round loop in the
// Encounter Workbench — Loadout -> Boss Instant -> Quick Window (prepare,
// charge, fire, Stamina move) -> Boss Incoming -> Slow Window -> next Round.
// Usage: npm run build && node scripts/smoke.mjs
import { spawn } from 'node:child_process'
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

  await page.screenshot({ path: process.env.SMOKE_SHOT ?? 'smoke.png', fullPage: false })
  await browser.close()
  console.log('\nSMOKE PASSED: full Round loop played in the browser.')
} finally {
  server.kill()
}
