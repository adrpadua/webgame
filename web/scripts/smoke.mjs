// Browser smoke run for the milestone exit criteria: play a full Round loop
// in the Encounter Workbench (M1), drive Scenario replay and time travel
// (M2), and export the played session as an Encounter Record that the
// headless runner replays to an identical final state (M3).
// Usage: npm run build && node scripts/smoke.mjs
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
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
  // The board paints to a canvas and so cannot wear a token the way a plate
  // can: it keeps numeric fallbacks for the colours it reads at scene boot.
  // A fallback that has drifted from its token is how the Boss came to be
  // drawn in ember on the board while every plate drew it in ember coral, so
  // hold the two lists against each other before anything renders.
  const paletteSource = readFileSync(new URL('../src/board/palette.ts', import.meta.url), 'utf8')
  const stylesheet = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  const drifted = [...paletteSource.matchAll(/'([a-z]+-\d+)':\s*0x([0-9a-f]{6})/g)].flatMap(([, name, value]) => {
    const token = new RegExp(`--color-${name}:\\s*#([0-9a-fA-F]{6})`).exec(stylesheet)
    if (!token) return [`--color-${name} is not defined in index.css`]
    return token[1].toLowerCase() === value ? [] : [`--color-${name} is #${token[1]} but the board falls back to #${value}`]
  })
  assert(drifted.length === 0, `every board palette fallback matches its token (${drifted.join(' | ') || 'all match'})`)

  // A sprite sheet is sliced by numbers the scene carries, and nothing in the
  // type system ties them to the file. Rebuild the sheet at a different size
  // and every frame silently shifts — the character would face the wrong way
  // and animate through pieces of two poses. The PNG's own header settles it.
  const sceneSource = readFileSync(new URL('../src/board/BoardScene.ts', import.meta.url), 'utf8')
  const frames = Number(/IDLE_FRAMES = (\d+)/.exec(sceneSource)?.[1])
  const specs = [...sceneSource.matchAll(/(\w+): \{ key: '([\w-]+)', url: (\w+), frameWidth: (\d+), frameHeight: (\d+)/g)]
  assert(specs.length > 0, 'the scene declares at least one sprite sheet')
  const imports = Object.fromEntries([...sceneSource.matchAll(/import (\w+) from '@\/assets\/([\w.-]+)'/g)].map((m) => [m[1], m[2]]))
  const mismatched = specs.flatMap(([, kind, , binding, frameW, frameH]) => {
    const file = imports[binding]
    if (!file) return [`${kind}: no asset import named ${binding}`]
    const png = readFileSync(new URL(`../src/assets/${file}`, import.meta.url))
    const [sheetW, sheetH] = [png.readUInt32BE(16), png.readUInt32BE(20)]
    const [wantW, wantH] = [Number(frameW) * frames, Number(frameH) * 6]
    return sheetW === wantW && sheetH === wantH ? [] : [`${kind}: ${file} is ${sheetW}x${sheetH}, sliced as ${wantW}x${wantH}`]
  })
  assert(
    mismatched.length === 0,
    `every sprite sheet slices into ${frames} frames across 6 facings (${mismatched.join(' | ') || `${specs.length} sheets checked`})`,
  )

  // Let Playwright resolve the browser it installed (`npx playwright install
  // chromium`). PLAYWRIGHT_CHROMIUM_PATH overrides it for images that ship
  // their own build at a fixed path.
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined })
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } })
  // The desktop pass drives the debug rail (Scenarios, time travel, seed),
  // which is opt-in on a build: ?debug=1 shows it.
  await page.goto(`${BASE_URL}?debug=1`)
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

  // WCAG 2.2 text contrast (1.4.3): every visible, live text node on the
  // play surface must meet 4.5:1, or 3:1 if large (≥24px, or ≥18.66px bold).
  // The background is composited down through translucent layers, and a
  // wb-plate's face is read from its --wb-face variable since it paints on a
  // pseudo-element. Inert text — gated, disabled, or in a receded Hand — is
  // exempt, as the standard exempts inactive components. Returns failures.
  const contrastFailures = (pg) =>
    pg.evaluate(() => {
      // Resolve through a canvas rather than a regex over rgb(). Tailwind's
      // own default ramps compute to oklch(), which an rgb-only parser
      // returns null for — and a null foreground was skipped, so every
      // element wearing a stock Tailwind colour went unmeasured and the suite
      // reported "all pass" over text it had never looked at. Painting the
      // colour and reading the pixel back handles oklch, oklab, color() and
      // any future syntax alike.
      const swatch = document.createElement('canvas')
      swatch.width = 1
      swatch.height = 1
      const ctx = swatch.getContext('2d', { willReadFrequently: true })
      const parse = (c) => {
        if (!c || c === 'transparent' || c === 'none') return { r: 0, g: 0, b: 0, a: 0 }
        ctx.clearRect(0, 0, 1, 1)
        // An unparseable value leaves fillStyle untouched, so seed a sentinel
        // and treat "unchanged" as unreadable rather than as black.
        ctx.fillStyle = '#000000'
        ctx.fillStyle = c
        if (ctx.fillStyle === '#000000' && !/^(#000000|black|rgba?\(0, ?0, ?0)/.test(c)) return null
        ctx.fillRect(0, 0, 1, 1)
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
        return { r, g, b, a: a / 255 }
      }
      const over = (top, bot) => {
        const a = top.a + bot.a * (1 - top.a)
        if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
        return {
          r: (top.r * top.a + bot.r * bot.a * (1 - top.a)) / a,
          g: (top.g * top.a + bot.g * bot.a * (1 - top.a)) / a,
          b: (top.b * top.a + bot.b * bot.a * (1 - top.a)) / a,
          a,
        }
      }
      const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
      const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)
      const resolveVar = (v) => {
        const probe = document.createElement('div')
        probe.style.color = v
        document.body.appendChild(probe)
        const c = parse(getComputedStyle(probe).color)
        probe.remove()
        return c
      }
      const bgOf = (el) => {
        let acc = { r: 0, g: 0, b: 0, a: 0 }
        for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
          const cs = getComputedStyle(node)
          let bg = null
          if (node.classList.contains('wb-plate')) {
            const face = cs.getPropertyValue('--wb-face').trim()
            if (face) bg = resolveVar(face)
          }
          if (!bg) bg = parse(cs.backgroundColor)
          if (bg && bg.a > 0) {
            acc = acc.a === 0 ? bg : over(acc, bg)
            if (acc.a >= 0.999) return acc
          }
        }
        const body = parse(getComputedStyle(document.body).backgroundColor) || { r: 9, g: 9, b: 11, a: 1 }
        return acc.a === 0 ? body : over(acc, body)
      }
      // GATED_CLASS is `pointer-events-none opacity-30 saturate-50`. Match
      // both halves: pointer-events-none alone rides live overlay wrappers
      // (the toast, the Phase Banner, the MovePad), whose text is checked.
      const isGated = (el) => {
        for (let a = el; a && a !== document.body; a = a.parentElement) {
          if (a.classList.contains('pointer-events-none') && a.classList.contains('opacity-30')) return true
        }
        return false
      }
      const fails = []
      const seen = new Set()
      const root = document.querySelector('[data-testid="play-surface"]') || document.body
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
      })
      for (let n; (n = walker.nextNode()); ) {
        const el = n.parentElement
        if (!el || seen.has(el)) continue
        seen.add(el)
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || cs.display === 'none') continue
        let op = 1
        for (let a = el; a && a !== document.body; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity)
        // Fully transparent text is not presented, so 1.4.3 has nothing to
        // say about it. Everything else is held to the ratio at its real
        // opacity: a live label dimmed to 0.4 by a bug must fail rather than
        // slip under a blanket threshold. Only genuinely inactive components
        // are exempt — disabled controls, the receded Hand, and the gated
        // overlay, which is the one place opacity is the disabled styling.
        if (op === 0 || el.closest('[disabled]') || el.closest('[data-inert="true"]') || isGated(el)) continue
        const fg = parse(cs.color)
        if (!fg) continue
        const bg = bgOf(el)
        const cr = ratio(over({ ...fg, a: fg.a * op }, bg), bg)
        const px = parseFloat(cs.fontSize)
        const bold = (parseInt(cs.fontWeight, 10) || 400) >= 700
        const need = px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5
        if (cr < need) fails.push(`"${n.textContent.trim().slice(0, 24)}" ${cr.toFixed(2)}:1 < ${need}:1 (${el.closest('[data-testid]')?.dataset.testid ?? el.tagName.toLowerCase()})`)
      }
      return fails
    })
  // Optional visual record: SMOKE_SHOTS_DIR=<dir> writes a screenshot at
  // each named state, so a reviewer gets the whole walk from one run rather
  // than driving the app by hand.
  const shotsDir = process.env.SMOKE_SHOTS_DIR ?? null
  let shotIndex = 0
  const shot = async (pg, name) => {
    if (!shotsDir) return
    shotIndex += 1
    await pg.screenshot({ path: `${shotsDir}/${String(shotIndex).padStart(2, '0')}-${name}.png`, fullPage: false })
  }
  // A five-card Hand is the tightest row in the interface, and a card name
  // that outgrows its plate neither wraps nor clips — it spills over the
  // rake's cut edge onto the neighbouring card. Measured off the rendered
  // text rather than scrollWidth: an overflowing word in a visible-overflow
  // block leaves scrollWidth at the padding box, so the spill does not show
  // up in the element's own metrics. A Range reports where glyphs land.
  const cardSpill = (pg) =>
    pg.evaluate(() => {
      const out = []
      for (const card of document.querySelectorAll('[data-testid="hand-card"]')) {
        const cs = getComputedStyle(card)
        const box = card.getBoundingClientRect()
        const left = box.left + parseFloat(cs.paddingLeft)
        const right = box.right - parseFloat(cs.paddingRight)
        const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT, {
          acceptNode: (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
        })
        const range = document.createRange()
        for (let n; (n = walker.nextNode()); ) {
          range.selectNodeContents(n)
          const r = range.getBoundingClientRect()
          if (r.width === 0) continue
          if (r.left < left - 0.5 || r.right > right + 0.5) {
            out.push(`${card.dataset.cardId} "${n.textContent.trim().slice(0, 16)}" by ${Math.round(Math.max(left - r.left, r.right - right))}px`)
          }
        }
      }
      return out
    })
  const assertContrast = async (pg, label) => {
    // Entrance motion (wb-slide-up, wb-seat, the Phase Banner) passes
    // through low opacity on its way in, so a probe that lands mid-flight
    // scores a ratio no player is ever shown. Let every finite animation
    // reach its end state first; ambient loops never finish by definition
    // and are excluded, which is correct — they hold text opacity steady.
    await pg.waitForFunction(() =>
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .every((a) => a.playState === 'finished'),
    )
    const fails = await contrastFailures(pg)
    assert(fails.length === 0, `text contrast meets WCAG 1.4.3 ${label} (${fails.join(' | ') || 'all pass'})`)
  }
  // The card the scripted turn is pointing at is the only live card in Hand.
  const scriptedCard = () => page.locator('[data-testid="hand-card"][data-scripted="true"]')
  // Which face the Hand is wearing: the card as itself, its Keywords, or
  // movement currency. See web/src/ui/handFace.ts.
  const handFace = () => page.locator('[data-testid="hand"]').getAttribute('data-face')
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
  assert((await handFace()) === 'card', 'the Loadout Step shows each card as itself')

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
  await assertContrast(page, 'with the Hero Stat Panel open')
  await shot(page, 'hero-stat-panel')
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
  // A hand card in the Quick Window is a Charge and its Keywords, so the
  // Hand leads with the Keyword marks rather than with the card's own timing
  // and Charge Value — both of which describe it as a Top Card.
  assert((await handFace()) === 'keywords', 'the Quick Window turns the Hand to its Keyword face')
  await scriptedCard().dragTo(slot0)
  assert((await slot0.getAttribute('data-charges')) === '1', 'a tucked hand card adds one Charge')
  assert((await cueStep()) === 'fire-quick', 'a charged Slot moves the script to firing')
  assert((await inspectTile(1, -1)) === 'embermaw', 'tapping the Boss tile switches the panel to Embermaw')
  await assertContrast(page, 'with the Boss Stat Panel open')
  await shot(page, 'boss-stat-panel')
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
  // Held over a hex the Hero can step to, every card in hand is one Stamina
  // and nothing else, and the Hand says so while the card is still in flight.
  const dropAt = await hexPosition(boardCanvas, -1, 0)
  const boardOrigin = await boardCanvas.boundingBox()
  const cardBox = await scriptedCard().boundingBox()
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(boardOrigin.x + dropAt.x, boardOrigin.y + dropAt.y, { steps: 12 })
  await page.waitForTimeout(150)
  assert((await handFace()) === 'stamina', 'lining up a move turns the Hand to movement currency')
  await page.mouse.up()
  await page.waitForTimeout(150)
  assert((await handFace()) === 'keywords', 'the Hand returns to its Keyword face once the move lands')
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
  // that opens the window replays paced, and every beat — the opening one
  // included — waits behind a Continue prompt that names it, so the player
  // reads every part of the turn before it lands.
  await next()
  await page.waitForSelector('[data-testid="playout-continue"]')
  assert((await phase()) === 'instant', 'Round 2 Next opens Boss Instant and paces its beats')
  await assertContrast(page, 'during a paced Boss row')
  await shot(page, 'boss-row-paced')
  // The Row lands announced, not already swinging: no chip is lit yet.
  assert(
    (await page.locator('[data-testid="beat-chip"][data-playing="true"]').count()) === 0,
    'the opening prompt arms before any beat has played',
  )
  const promptText = await page.locator('[data-testid="playout-continue"]').textContent()
  assert((promptText ?? '').includes('Continue'), `the playout pauses on a Continue prompt (${promptText?.trim()})`)
  // The prompt is a trailer, not a caption: the beat it names is the beat
  // the press plays. Naming the beat already on the board made every press
  // read as a skip, so hold each promise against what actually lights. The
  // Instant track's beats are pressed through one at a time until the last
  // one settles the playout on its own.
  const instantBeats = await page.locator('[data-testid="beat-track"][data-track="instant"] [data-testid="beat-chip"]').count()
  assert(instantBeats > 1, `the Instant track lists more than one beat to press through (${instantBeats})`)
  let presses = 0
  // Bounded so a prompt that never retires fails loudly instead of hanging.
  while ((await page.locator('[data-testid="playout-continue"]').count()) > 0 && presses <= instantBeats) {
    const prompt = page.locator('[data-testid="playout-continue"]')
    const promised = (await prompt.getAttribute('data-next-beat')) ?? ''
    presses += 1
    assert(promised !== '', `Continue prompt ${presses} names the beat it will play`)
    assert((await prompt.textContent())?.includes(promised), `prompt ${presses} shows that beat's name (${promised})`)
    await prompt.click()
    const playing = ((await page.locator('[data-testid="beat-chip"][data-playing="true"]').first().textContent()) ?? '').trim()
    assert(playing === promised, `Continue ${presses} plays the beat it promised (promised ${promised}, played ${playing})`)
    // Let the moment settle so a next prompt — if there is one — can arm.
    await page.waitForTimeout(900)
  }
  assert(presses === instantBeats, `every beat of the Instant Row took its own press, the first included (${presses} of ${instantBeats})`)
  assert((await page.locator('[data-testid="playout-continue"]').count()) === 0, 'the last beat needs no prompt and the playout settles')
  // The resolved track waits in the Boss's window; Next moves on.
  assert((await phase()) === 'instant', 'the settled track waits in Boss Instant for Next')
  // During a Boss row no card in hand has a legal action, so the Hand
  // recedes — and it must come back the moment a player window opens. A
  // Hand that hides has to be provably reachable, or the recession is a
  // trap. Test intent (data-inert) and reality (a card can be selected).
  assert((await page.locator('[data-testid="hand"]').getAttribute('data-inert')) === 'true', 'the Hand is inert during Boss Instant')
  await next()
  assert((await phase()) === 'quick', 'Next moves on into the Quick Window')
  assert((await page.locator('[data-testid="hand"]').getAttribute('data-inert')) === null, 'the Hand is live again in the Quick Window')
  await page.locator('[data-testid="hand-card"]').first().click()
  assert((await page.locator('[data-testid="hand-card"][data-selected="true"]').count()) === 1, 'a Hand card can be selected once the window opens')
  await page.locator('[data-testid="hand-card"]').first().click()

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

  // M2 debug tooling: load the committed terminal Scenario and walk its line
  // with time travel. The solo-ceiling Scenario is the deepest solo push the
  // policy search can manage and it ends short of Boss defeat by design —
  // it exists to prove a lone Guardian cannot win the Ashen Trial (D-016) —
  // so its terminal banner is Defeat. What this asserts is that a committed
  // Scenario replays to its terminal outcome and time travel walks it.
  await page.selectOption('[data-testid="scenario-select"]', 'embermaw_solo_ceiling')
  await page.locator('[data-testid="load-scenario"]').click()
  await page.waitForSelector('[data-testid="outcome-banner"][data-outcome="defeat"]')
  assert(
    (await page.locator('[data-testid="outcome-banner"]').getAttribute('data-outcome')) === 'defeat',
    'the solo-ceiling Scenario replays to its Defeat banner',
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
  // The phone pass tests what a player sees: no rail. Its fit-and-target
  // guards are only honest against the surface a player is actually handed.
  await phone.goto(BASE_URL)
  await phone.waitForSelector('[data-testid="play-surface"]')
  await phone.locator('[data-testid="guide-skip"]').click()
  await phone.waitForSelector('[data-testid="first-turn-cue"]')
  // Check the spill here, on the opening Hand: it holds five cards and the
  // longest name in the catalogue, and both are gone by the time the walk
  // below reaches the busiest state.
  const spilling = await cardSpill(phone)
  assert(spilling.length === 0, `no Compact Card's text overflows its plate at 390x844 (${spilling.join(' | ') || 'all contained'})`)
  // Walk to the Quick Window and select a card, so the measurements below
  // run against the busiest state the phone ever shows: the move pad out
  // beside the board.
  // Park the cursor somewhere harmless before the touch-only section. Clicking
  // Skip leaves the mouse resting where that button was, and an element that
  // later lays out under a stationary cursor gets a real pointerenter — so the
  // first-turn cue opens its own hover popover, and the singleton popup surface
  // shows that instead of the card's. A touch device cannot be in that state at
  // all, so leaving the cursor there makes this section measure something no
  // player experiences: it broke the moment a row was added above the cue,
  // 42px being enough to move it under the pointer.
  await phone.mouse.move(5, 500)
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
  // Test overlap against the hexes themselves, not the canvas rectangle: the
  // canvas is a hexagon's bounding box, and the strip below its bottom hex
  // row is empty. The pad lives in that strip, so a canvas-box test would
  // fail every button while none of them touches a hex.
  const padOverHex = await phone.evaluate(() => {
    const hexes = window.__workbench.hexRects()
    if (hexes.length === 0) {
      return ['no hexes']
    }
    return [...document.querySelectorAll('[data-testid="move-pad"] button')]
      .map((node) => ({ id: node.dataset.testid, rect: node.getBoundingClientRect() }))
      .flatMap(({ id, rect }) =>
        hexes
          .map((hex) => ({
            key: hex.key,
            w: Math.min(rect.right, hex.right) - Math.max(rect.left, hex.left),
            h: Math.min(rect.bottom, hex.bottom) - Math.max(rect.top, hex.top),
          }))
          .filter(({ w, h }) => w > 0 && h > 0)
          .map(({ key, w, h }) => `${id} covers ${Math.round(w)}x${Math.round(h)} of hex ${key}`),
      )
  })
  assert(padOverHex.length === 0, `the move pad sits below the bottom hex row without covering a hex (${padOverHex.join(' | ') || 'no overlap'})`)
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
  await assertContrast(phone, 'at 390x844')
  await shot(phone, 'phone-390x844')
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
