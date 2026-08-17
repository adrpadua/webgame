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

// Mirrors web/src/board/layout.ts, then scales into the rendered canvas:
// the board fits itself to whatever room the HUD leaves, so a drop target
// has to be measured rather than assumed.
async function hexPosition(canvas, q, r) {
  const box = await canvas.boundingBox()
  const scale = box.width / 380
  return { x: (190 + HEX_SIZE * (SQRT3 * q + (SQRT3 / 2) * r)) * scale, y: (200 + HEX_SIZE * 1.5 * r) * scale }
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
  // A Boss Row resolves in the batch that opens its window and replays
  // beat by beat; Next is inert until the last beat's moment has played.
  const waitForBeatsToSettle = (view = page) =>
    view.waitForSelector('[data-testid="beat-chip"][data-playing="true"]', { state: 'detached', timeout: 8000 })
  const next = () => page.locator('[data-testid="next-phase"]').click()
  const cueStep = () => page.locator('[data-testid="first-turn-cue"]').getAttribute('data-step')
  const boardCanvas = page.locator('[data-testid="board"] canvas')
  // Persistent gauges left the HUD: tapping a piece's tile opens its stat
  // panel, which stays up as a live readout until dismissed. Returns the
  // opened panel's piece id.
  const inspectTile = async (q, r) => {
    await boardCanvas.click({ position: await hexPosition(boardCanvas, q, r) })
    await page.waitForSelector('[data-testid="entity-inspect"]')
    return page.locator('[data-testid="entity-inspect"]').getAttribute('data-entity')
  }
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

  // Detail popups are where the words went. A mouse gets them by hovering,
  // one element at a time: a Compact Card explains the card...
  const firstCard = page.locator('[data-testid="hand-card"]').first()
  await firstCard.hover()
  await page.waitForSelector('[data-testid="hold-popover"]')
  assert(
    (await page.locator('[data-testid="hold-popover"]').getAttribute('data-hold-id'))?.startsWith('hand:'),
    'hovering a Compact Card opens its detail popup',
  )
  // ...and a boss beat chip explains that beat, rather than the whole strip.
  await page.locator('[data-testid="beat-chip"]').nth(1).hover()
  await page.waitForTimeout(400)
  const beatPopoverId = await page.locator('[data-testid="hold-popover"]').getAttribute('data-hold-id')
  assert(beatPopoverId?.startsWith('beat:'), `hovering a boss beat explains that beat (${beatPopoverId})`)
  const beatPopoverText = await page.locator('[data-testid="hold-popover"]').innerText()
  assert(beatPopoverText.includes('Damage'), `the beat popup carries the beat's numbers (${beatPopoverText.split('\n').join(' / ')})`)
  await page.locator('[data-testid="hand"]').hover()
  await page.waitForSelector('[data-testid="hold-popover"]', { state: 'detached' })
  assert((await page.locator('[data-testid="hold-popover"]').count()) === 0, 'moving the pointer away dismisses the popup')
  // A hover must never swallow the click that follows it.
  await firstCard.hover()
  await page.waitForSelector('[data-testid="hold-popover"]')
  await firstCard.click()
  assert((await firstCard.getAttribute('data-selected')) === 'true', 'clicking a hovered card still selects it')
  await firstCard.click()

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

  // Step 3-4: the Boss opens the Round and the Claw lands on the tank. The
  // Instant Row resolves in the batch that opens Boss Instant, so the beats
  // replay while the phase IS the Boss's window. The tank's stat panel goes
  // up first — it is the health readout now, and it rides the beats live.
  assert((await inspectTile(0, 0)) === 'guardian', 'tapping the Hero tile opens its stat panel')
  await next()
  assert((await phase()) === 'instant', 'Next opens Boss Instant with its beats replaying')
  assert((await cueStep()) === 'boss-instant', 'the script narrates the Boss Instant')
  // The claw's damage reaches the gauge at its beat's playout moment, not
  // the instant the batch resolves: wait out the staggered replay.
  await page.waitForFunction(() => document.querySelector('[data-testid="hero-health"]')?.textContent?.includes('30'), null, { timeout: 5000 })
  const heroHealth = await page.locator('[data-testid="hero-health"]').textContent()
  assert(heroHealth?.includes('30'), `Raking Claw hit the tank for 4, on its beat (${heroHealth?.trim()})`)
  await waitForBeatsToSettle()
  await next()
  assert((await phase()) === 'quick', 'Boss Instant resolves into the Quick Window')

  // Step 5-6: charge the quick Slot, then fire it in its matching window.
  assert((await cueStep()) === 'charge-quick', 'the Quick Window opens on the charge step')
  await scriptedCard().dragTo(slot0)
  assert((await slot0.getAttribute('data-charges')) === '1', 'a tucked hand card adds one Charge')
  assert((await cueStep()) === 'fire-quick', 'a charged Slot moves the script to firing')
  assert((await inspectTile(1, -1)) === 'embermaw', 'tapping the Boss tile switches the panel to Embermaw')
  const bossBeforeQuick = await page.locator('[data-testid="boss-health"]').textContent()
  await slot0.click()
  await page.waitForTimeout(150)
  assert((await slot0.getAttribute('data-slot-state')) === 'fired', 'the charged Slot activated in its matching window')
  const bossAfterQuick = await page.locator('[data-testid="boss-health"]').textContent()
  assert(bossBeforeQuick !== bossAfterQuick, `the quick Slot moved the Boss bar (${bossBeforeQuick?.trim()} -> ${bossAfterQuick?.trim()})`)

  // Step 7: step out of the telegraphed breath cone, paying a card.
  assert((await cueStep()) === 'move-away', 'the script asks for the dodge next')
  const handBeforeMove = await page.locator('[data-testid="hand-card"]').count()
  // The whole board must be on screen: a hex a player can legally step to
  // is useless if the HUD cropped it away.
  const boardBox = await boardCanvas.boundingBox()
  const areaBox = await page.locator('[data-testid="board"]').boundingBox()
  assert(
    boardBox.height <= areaBox.height + 1 && boardBox.width <= areaBox.width + 1,
    `the board fits its play area (${Math.round(boardBox.width)}x${Math.round(boardBox.height)} in ${Math.round(areaBox.width)}x${Math.round(areaBox.height)})`,
  )
  await scriptedCard().dragTo(boardCanvas, { targetPosition: await hexPosition(boardCanvas, -1, 0) })
  await page.waitForTimeout(150)
  assert((await page.locator('[data-testid="hand-card"]').count()) === handBeforeMove - 1, 'the Stamina discard left the Hand')
  const factLog = await page.locator('[data-testid="fact-log"]').textContent()
  assert(factLog?.includes('Move to (-1, 0)'), 'the fact log records the Hero move')

  await next()
  assert((await phase()) === 'incoming', 'the Quick Window ends and Boss Incoming opens with its beats replaying')
  await waitForBeatsToSettle()
  await next()
  assert((await phase()) === 'slow', 'Boss Incoming resolves into the Slow Window')
  const incomingLog = await page.locator('[data-testid="fact-log"]').textContent()
  assert(incomingLog?.includes('Spawn whelp_1'), 'Brood Call spawned Whelps')
  // The Hero stepped to (-1, 0); the panel follows the piece by its tile.
  assert((await inspectTile(-1, 0)) === 'guardian', 'tapping the moved Hero reopens its panel')
  const heroAfterBreath = await page.locator('[data-testid="hero-health"]').textContent()
  assert(heroAfterBreath?.includes('30'), `the dodged Cinder Breath dealt nothing (${heroAfterBreath?.trim()})`)

  // Step 8: charge and fire the slow Slot before the Round turns.
  assert((await cueStep()) === 'charge-slow', 'the Slow Window opens on the slow charge step')
  await scriptedCard().dragTo(slot1)
  assert((await cueStep()) === 'fire-slow', 'a charged slow Slot moves the script to firing')
  await inspectTile(1, -1)
  const bossBeforeSlow = await page.locator('[data-testid="boss-health"]').textContent()
  await slot1.click()
  await page.waitForTimeout(150)
  assert((await slot1.getAttribute('data-slot-state')) === 'fired', 'the slow Slot activated in the Slow Window')
  const bossAfterSlow = await page.locator('[data-testid="boss-health"]').textContent()
  assert(bossBeforeSlow !== bossAfterSlow, `the slow Slot moved the Boss bar (${bossBeforeSlow?.trim()} -> ${bossAfterSlow?.trim()})`)

  // A tap on an empty hex puts the panel away.
  await boardCanvas.click({ position: await hexPosition(boardCanvas, 2, 0) })
  await page.waitForSelector('[data-testid="entity-inspect"]', { state: 'detached' })
  assert((await page.locator('[data-testid="entity-inspect"]').count()) === 0, 'tapping an empty hex closes the stat panel')

  await next()
  assert((await phase()) === 'loadout', 'the Slow Window rolls into the next Round')
  const round = await page.locator('[data-testid="round-display"]').textContent()
  assert(round?.includes('2/8'), `the Boss Timeline rolled forward (${round?.trim()})`)
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

  // Outside the script, a Boss Row steps through beat by beat: the batch
  // that opens the window replays paced, the resolving beat lights its Boss
  // Beat chip, and a Continue prompt gates each next beat, so the player
  // reads every part of the turn.
  await next()
  await page.waitForSelector('[data-testid="playout-continue"]')
  assert((await phase()) === 'instant', 'Round 2 Next opens Boss Instant and paces its beats')
  assert(
    (await page.locator('[data-testid="beat-chip"][data-playing="true"]').count()) >= 1,
    'the resolving beat lights its Boss Beat chip',
  )
  const promptText = await page.locator('[data-testid="playout-continue"]').textContent()
  assert((promptText ?? '').includes('Continue'), `the playout pauses on a Continue prompt (${promptText?.trim()})`)
  await page.locator('[data-testid="playout-continue"]').click()
  await page.waitForSelector('[data-testid="playout-continue"]', { state: 'detached' })
  await page.waitForSelector('[data-testid="playout-continue"]')
  await page.locator('[data-testid="playout-continue"]').click()
  await page.waitForSelector('[data-testid="playout-continue"]', { state: 'detached' })
  // The last beat needs no prompt: give a wrongly-armed one time to appear.
  await page.waitForTimeout(900)
  assert((await page.locator('[data-testid="playout-continue"]').count()) === 0, 'the last beat needs no prompt and the playout settles')
  // The resolved track waits in the Boss's window; Next moves on.
  assert((await phase()) === 'instant', 'the settled track waits in Boss Instant for Next')
  await next()
  assert((await phase()) === 'quick', 'Next moves on into the Quick Window')

  // Skipping a window that still holds phase-appropriate actions warns
  // first: nothing has been fired or charged this Quick Window.
  await next()
  await page.waitForSelector('[data-testid="phase-skip-confirm"]')
  assert((await phase()) === 'quick', 'the warned Next has not advanced the phase')
  await page.locator('[data-testid="cancel-skip"]').click()
  await page.waitForSelector('[data-testid="phase-skip-confirm"]', { state: 'detached' })
  assert((await phase()) === 'quick', 'staying keeps the Quick Window open')
  await next()
  await page.waitForSelector('[data-testid="phase-skip-confirm"]')
  await page.locator('[data-testid="confirm-skip"]').click()
  await page.waitForSelector('[data-testid="phase-skip-confirm"]', { state: 'detached' })
  assert((await phase()) === 'incoming', 'confirming the skip advances into Boss Incoming')

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
  await page.selectOption('[data-testid="scenario-select"]', 'embermaw_solo_ceiling')
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
  assert(roundAtStart?.includes('1/8'), 'step 0 is Round 1')

  await page.screenshot({ path: process.env.SMOKE_SHOT ?? 'smoke.png', fullPage: false })

  // Accessibility contract, checked on the canonical portrait canvas: the
  // whole board on screen, every enabled control at 44px, and no page
  // scroll. A fresh context is a first visit, so this also proves the
  // scripted turn lays out on a phone.
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await phone.goto(BASE_URL)
  await phone.waitForSelector('[data-testid="play-surface"]')
  await phone.locator('[data-testid="guide-skip"]').click()
  await phone.waitForSelector('[data-testid="first-turn-cue"]')
  // Walk to the Quick Window and select a card, so the measurements below
  // run against the busiest state the phone ever shows: the move pad out
  // beside the board.
  // Touch has no hover, so it keeps press-and-hold: the same detail, opened
  // by holding a finger down and dismissed on release.
  const phoneCard = phone.locator('[data-testid="hand-card"]').first()
  await phoneCard.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true, bubbles: true })
  await phone.waitForSelector('[data-testid="hold-popover"]')
  assert((await phone.locator('[data-testid="hold-popover"]').count()) === 1, 'holding a Compact Card on touch opens its detail popup')
  await phoneCard.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true, bubbles: true })
  await phone.waitForSelector('[data-testid="hold-popover"]', { state: 'detached' })
  assert((await phone.locator('[data-testid="hold-popover"]').count()) === 0, 'releasing the hold dismisses the popup')

  const phoneScripted = () => phone.locator('[data-testid="hand-card"][data-scripted="true"]')
  await phoneScripted().dragTo(phone.locator('[data-testid="slot-0"]'))
  await phoneScripted().dragTo(phone.locator('[data-testid="slot-1"]'))
  // The first Next opens Boss Instant and replays its beats; Next is inert
  // until they settle, then the second press enters the Quick Window.
  await phone.locator('[data-testid="next-phase"]').click()
  await waitForBeatsToSettle(phone)
  await phone.locator('[data-testid="next-phase"]').click()
  await phone.waitForTimeout(400)
  await phoneScripted().click()
  await phone.waitForSelector('[data-testid="move-pad"]')
  // The board refits itself when the HUD changes; give the scale manager
  // its poll interval before measuring.
  await phone.waitForTimeout(700)
  const padOverBoard = await phone.evaluate(() => {
    const canvas = document.querySelector('[data-testid="board"] canvas')?.getBoundingClientRect()
    if (!canvas) {
      return ['no board']
    }
    return [...document.querySelectorAll('[data-testid="move-pad"] button')]
      .map((node) => ({ id: node.dataset.testid, rect: node.getBoundingClientRect() }))
      .map(({ id, rect }) => ({
        id,
        w: Math.min(rect.right, canvas.right) - Math.max(rect.left, canvas.left),
        h: Math.min(rect.bottom, canvas.bottom) - Math.max(rect.top, canvas.top),
      }))
      .filter(({ w, h }) => w > 0 && h > 0)
      .map(({ id, w, h }) => `${id} covers ${Math.round(w)}x${Math.round(h)} of the board`)
  })
  assert(padOverBoard.length === 0, `the move pad flanks the board without covering a hex (${padOverBoard.join(' | ') || 'no overlap'})`)
  const cropped = await phone.evaluate(() => {
    const canvas = document.querySelector('[data-testid="board"] canvas')
    const area = document.querySelector('[data-testid="board"]')
    if (!canvas || !area) {
      return 'no board'
    }
    const c = canvas.getBoundingClientRect()
    const a = area.getBoundingClientRect()
    const hidden = Math.max(a.top - c.top, c.bottom - a.bottom, a.left - c.left, c.right - a.right)
    return hidden > 1 ? `${Math.round(hidden)}px of the board is outside the play area` : ''
  })
  assert(cropped === '', `the whole board is on screen at 390x844 (${cropped || 'nothing cropped'})`)
  const undersized = await phone.evaluate(() =>
    [...document.querySelectorAll('[data-testid="play-surface"] button, [data-testid="play-surface"] input')]
      .filter((node) => !node.disabled)
      .map((node) => ({ id: node.dataset.testid ?? node.textContent?.trim().slice(0, 16), rect: node.getBoundingClientRect() }))
      .filter(({ rect }) => (rect.width > 0 || rect.height > 0) && (rect.width < 44 || rect.height < 44))
      .map(({ id, rect }) => `${id} ${Math.round(rect.width)}x${Math.round(rect.height)}`),
  )
  assert(undersized.length === 0, `every enabled control meets the 44px target at 390x844 (${undersized.join(' | ') || 'all pass'})`)
  const scrolls = await phone.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  assert(!scrolls, 'the portrait play surface never scrolls sideways')
  // The whole HUD fits the phone's viewport: the frame spans it edge to
  // edge and the Hand — the bottom interaction zone — is on screen without
  // any vertical scrolling. (The debug rail below the fold is allowed to be
  // the page's only overflow.)
  const overflows = await phone.evaluate(() => {
    const surface = document.querySelector('[data-testid="play-surface"]')?.getBoundingClientRect()
    const hand = document.querySelector('[data-testid="hand"]')?.getBoundingClientRect()
    if (!surface || !hand) {
      return ['missing play surface or hand']
    }
    const problems = []
    if (surface.top < 0 || surface.bottom > window.innerHeight + 1) {
      problems.push(`frame spans ${Math.round(surface.top)}..${Math.round(surface.bottom)} in a ${window.innerHeight}px viewport`)
    }
    if (Math.round(surface.width) < window.innerWidth) {
      problems.push(`frame is ${Math.round(surface.width)}px wide in a ${window.innerWidth}px viewport`)
    }
    if (hand.bottom > window.innerHeight + 1) {
      problems.push(`the Hand ends at ${Math.round(hand.bottom)}px, below the ${window.innerHeight}px viewport`)
    }
    return problems
  })
  assert(overflows.length === 0, `the full HUD fits the phone viewport without scrolling (${overflows.join(' | ') || 'fits'})`)
  await phone.screenshot({ path: process.env.SMOKE_PHONE_SHOT ?? 'smoke-portrait.png', fullPage: false })
  await phone.close()

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
