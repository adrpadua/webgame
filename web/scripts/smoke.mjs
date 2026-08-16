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

  // A fresh browser context counts as a first visit, so the How to Play
  // guide opens over the play surface; walk one step, then skip past it.
  await page.waitForSelector('[data-testid="guide-modal"]')
  assert((await page.locator('[data-testid="guide-modal"]').count()) === 1, 'first visit opens the How to Play guide')
  await page.locator('[data-testid="guide-next"]').click()
  await page.locator('[data-testid="guide-skip"]').click()
  await page.waitForSelector('[data-testid="guide-modal"]', { state: 'detached' })
  assert((await page.locator('[data-testid="guide-modal"]').count()) === 0, 'skipping dismisses the guide')

  // The guide reopens on demand and dismisses via Escape (Modal contract).
  await page.locator('[data-testid="open-guide"]').click()
  await page.waitForSelector('[data-testid="guide-modal"]')
  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-testid="guide-modal"]', { state: 'detached' })
  assert((await page.locator('[data-testid="guide-modal"]').count()) === 0, 'Escape dismisses the reopened guide')

  const phase = () => page.locator('[data-phase]').getAttribute('data-phase')
  const next = () => page.locator('[data-testid="next-phase"]').click()
  const cueStep = () => page.locator('[data-testid="first-turn-cue"]').getAttribute('data-step')
  // The card the scripted turn is pointing at is the only live card in Hand.
  const scriptedCard = () => page.locator('[data-testid="hand-card"][data-scripted="true"]')
  const slot0 = page.locator('[data-testid="slot-0"]')
  const slot1 = page.locator('[data-testid="slot-1"]')

  // A first visit opens the First Turn Encounter with the scripted Round
  // running: one cue, one live control, no coach prompts competing with it.
  await page.waitForSelector('[data-testid="first-turn-cue"]')
  assert((await phase()) === 'loadout', 'Encounter opens in the Loadout Step')
  assert((await cueStep()) === 'prepare-quick', 'the scripted first turn opens on the prepare step')
  assert((await page.locator('[data-testid="coach-mark"]').count()) === 0, 'the scripted turn owns the prompt row alone')
  assert((await page.locator('[data-testid="hand-card"]').count()) === 5, 'the First Turn Hand holds 5 Compact Cards')
  assert((await scriptedCard().count()) === 1, 'exactly one Hand card is scripted at a time')

  // Tap-and-hold is where the words went: press a Compact Card and its full
  // card text pops up; release dismisses it.
  const firstCard = page.locator('[data-testid="hand-card"]').first()
  const cardBox = await firstCard.boundingBox()
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
  await page.mouse.down()
  await page.waitForSelector('[data-testid="hold-popover"]')
  assert((await page.locator('[data-testid="hold-popover"]').count()) === 1, 'holding a Compact Card opens its detail popup')
  await page.mouse.up()
  await page.waitForSelector('[data-testid="hold-popover"]', { state: 'detached' })
  assert((await page.locator('[data-testid="hold-popover"]').count()) === 0, 'releasing the hold dismisses the popup')

  // Step 1-2: prepare the quick Slot by drag, the slow Slot by the tap path.
  await scriptedCard().dragTo(slot0)
  const topCard = await slot0.getAttribute('data-top-card')
  assert(topCard !== '', `dragging the scripted card prepares Slot 1 (${topCard})`)
  assert((await cueStep()) === 'prepare-slow', 'the script advances to the slow Slot')
  await scriptedCard().click()
  assert((await scriptedCard().getAttribute('data-selected')) === 'true', 'tapping a Compact Card selects it')
  assert((await slot1.getAttribute('data-incoming-action')) === 'Prepare', 'an empty Slot advertises Prepare')
  await slot1.click()
  assert((await slot1.getAttribute('data-top-card')) !== '', 'tapping the empty Slot prepares the selected card')
  assert((await cueStep()) === 'start-round', 'with both Slots set the script asks for Next')

  // Step 3-4: the Boss opens the Round and the Claw lands on the tank.
  await next()
  assert((await phase()) === 'instant', 'Next advances into Boss Instant')
  assert((await cueStep()) === 'boss-instant', 'the script narrates the Boss Instant')
  await next()
  assert((await phase()) === 'quick', 'Boss Instant resolves into the Quick Window')
  const heroHealth = await page.locator('[data-testid="hero-health"]').textContent()
  assert(heroHealth?.includes('30'), `Raking Claw hit the tank for 4 (${heroHealth?.trim()})`)

  // Step 5-6: charge the quick Slot, then fire it in its matching window.
  assert((await cueStep()) === 'charge-quick', 'the Quick Window opens on the charge step')
  await scriptedCard().dragTo(slot0)
  assert((await slot0.getAttribute('data-charges')) === '1', 'a tucked hand card adds one Charge')
  assert((await cueStep()) === 'fire-quick', 'a charged Slot moves the script to firing')
  const bossBeforeQuick = await page.locator('[data-testid="boss-health"]').textContent()
  await slot0.click()
  await page.waitForTimeout(150)
  assert((await slot0.getAttribute('data-slot-state')) === 'fired', 'the charged Slot activated in its matching window')
  const bossAfterQuick = await page.locator('[data-testid="boss-health"]').textContent()
  assert(bossBeforeQuick !== bossAfterQuick, `the quick Slot moved the Boss bar (${bossBeforeQuick?.trim()} -> ${bossAfterQuick?.trim()})`)

  // Step 7: step out of the telegraphed breath cone, paying a card.
  assert((await cueStep()) === 'move-away', 'the script asks for the dodge next')
  const handBeforeMove = await page.locator('[data-testid="hand-card"]').count()
  await scriptedCard().dragTo(page.locator('[data-testid="board"]'), { targetPosition: axialOffset(-1, 0) })
  await page.waitForTimeout(150)
  assert((await page.locator('[data-testid="hand-card"]').count()) === handBeforeMove - 1, 'the Stamina discard left the Hand')
  const factLog = await page.locator('[data-testid="fact-log"]').textContent()
  assert(factLog?.includes('Move to (-1, 0)'), 'the fact log records the Hero move')

  await next()
  assert((await phase()) === 'incoming', 'Quick Window resolves into Boss Incoming')
  await next()
  assert((await phase()) === 'slow', 'Boss Incoming resolves into the Slow Window')
  const incomingLog = await page.locator('[data-testid="fact-log"]').textContent()
  assert(incomingLog?.includes('Spawn whelp_1'), 'Brood Call spawned Whelps')
  const heroAfterBreath = await page.locator('[data-testid="hero-health"]').textContent()
  assert(heroAfterBreath?.includes('30'), `the dodged Cinder Breath dealt nothing (${heroAfterBreath?.trim()})`)

  // Step 8: charge and fire the slow Slot before the Round turns.
  assert((await cueStep()) === 'charge-slow', 'the Slow Window opens on the slow charge step')
  await scriptedCard().dragTo(slot1)
  assert((await cueStep()) === 'fire-slow', 'a charged slow Slot moves the script to firing')
  const bossBeforeSlow = await page.locator('[data-testid="boss-health"]').textContent()
  await slot1.click()
  await page.waitForTimeout(150)
  assert((await slot1.getAttribute('data-slot-state')) === 'fired', 'the slow Slot activated in the Slow Window')
  const bossAfterSlow = await page.locator('[data-testid="boss-health"]').textContent()
  assert(bossBeforeSlow !== bossAfterSlow, `the slow Slot moved the Boss bar (${bossBeforeSlow?.trim()} -> ${bossAfterSlow?.trim()})`)

  await next()
  assert((await phase()) === 'loadout', 'the Slow Window rolls into the next Round')
  const round = await page.locator('[data-testid="round-display"]').textContent()
  assert(round?.includes('Round 2'), `the Boss Timeline rolled forward (${round?.trim()})`)
  assert((await page.locator('[data-testid="hand-card"]').count()) === 5, 'end-of-Round draw refilled the Hand')

  // The script retires itself with the Round it taught, and ordinary
  // coaching takes the row back.
  await page.waitForSelector('[data-testid="first-turn-cue"]', { state: 'detached' })
  assert((await page.locator('[data-testid="first-turn-cue"]').count()) === 0, 'the scripted first turn ends with Round 1')
  await page.waitForSelector('[data-testid="coach-mark"]')
  assert(
    (await page.locator('[data-testid="coach-mark"]').getAttribute('data-tip')) === 'loadout-next',
    'coach prompts resume once the script is done, reading the Slots the player already kept',
  )

  // Slot Replacement is destructive, so it must confirm before resolving —
  // and a cancelled confirmation must leave no trace in the Scenario steps.
  const stepsBeforeReplace = JSON.parse(await page.evaluate(() => window.__workbench.exportScenario())).steps.length
  const slot0CardBefore = await slot0.getAttribute('data-top-card')
  await page.locator('[data-testid="hand-card"]').first().click()
  assert((await slot0.getAttribute('data-incoming-action')) === 'Replace', 'an occupied Slot advertises Replace during Loadout')
  await slot0.click()
  await page.waitForSelector('[data-testid="replace-confirm"]')
  assert((await page.locator('[data-testid="replace-confirm"]').count()) === 1, 'replacing an occupied Slot opens the confirmation modal')
  await page.locator('[data-testid="cancel-replace"]').click()
  await page.waitForSelector('[data-testid="replace-confirm"]', { state: 'detached' })
  assert((await slot0.getAttribute('data-top-card')) === slot0CardBefore, 'cancelling keeps the Slot bundle intact')
  const stepsAfterCancel = JSON.parse(await page.evaluate(() => window.__workbench.exportScenario())).steps.length
  assert(stepsAfterCancel === stepsBeforeReplace, 'a cancelled replacement records no Scenario step')

  // A confirmed replacement (Round 2 Loadout, refilled hand) resolves as
  // exactly one load_slot step.
  const stepsBeforeConfirm = JSON.parse(await page.evaluate(() => window.__workbench.exportScenario())).steps.length
  const replacementCard = page.locator('[data-testid="hand-card"]').first()
  const replacementCardId = await replacementCard.getAttribute('data-card-id')
  await replacementCard.click()
  await slot0.click()
  await page.waitForSelector('[data-testid="replace-confirm"]')
  await page.locator('[data-testid="confirm-replace"]').click()
  await page.waitForSelector('[data-testid="replace-confirm"]', { state: 'detached' })
  assert((await slot0.getAttribute('data-top-card')) === replacementCardId, 'confirming replaces the Top Card with the selected card')
  assert((await slot0.getAttribute('data-charges')) === '0', 'the replacement loads at 0 Charge')
  const stepsAfterConfirm = JSON.parse(await page.evaluate(() => window.__workbench.exportScenario())).steps.length
  assert(stepsAfterConfirm === stepsBeforeConfirm + 1, 'a confirmed replacement records exactly one Scenario step')

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
  assert(
    (await page.locator('[data-testid="outcome-banner"]').getAttribute('data-outcome')) === 'victory',
    'the victory Scenario replays to the Victory banner',
  )

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
