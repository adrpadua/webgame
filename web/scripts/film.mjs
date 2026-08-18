// Film a board effect frame by frame, so the animation that ships can be
// looked at rather than reasoned about.
//
// Every Board Feedback animation so far — the burn, the expiry, a spawn, the
// Boss going out — was found to be wrong by watching it, not by reading it.
// A flame drawn behind the Hero, a tint whose arguments were the wrong way
// round and did nothing at all: both passed their unit tests and both were
// obvious in the first frame anyone looked at.
//
// Capture is `page.screenshot()`, deliberately, and not CDP's
// `Page.startScreencast`. The board is a WebGL canvas, and a screencast hands
// back whatever is in the swap chain when the frame is encoded — with no
// `preserveDrawingBuffer` that is sometimes a buffer already presented, so
// the film shows duplicate timestamps and a flicker that is an artifact of
// the recording rather than anything a player would see. One such phantom
// cost a full investigation. `page.screenshot()` forces a real composite for
// every frame, so what lands on disk is what the compositor would have put on
// screen.
//
// The price is the frame rate. A screenshot round-trip is dominated by the
// capture itself rather than by encoding: clipped to the board, measured on
// the machine this was written on, JPEG frames land about every 60ms and PNG
// frames about every 80ms — call it 17fps against 12. So frames are JPEG
// unless `--png` asks otherwise, and every frame is named for the elapsed
// time it was actually taken at rather than the time it was meant to be
// taken at. Twelve honest frames across a 900ms effect beat sixty frames
// where some of them are last frame's buffer.
//
// Usage:
//   npm run build && node scripts/film.mjs --fact "Hazard at"
//   node scripts/film.mjs --shot spawn --ms 4000
//   node scripts/film.mjs --list                       (name every shot)
//
// Moments are found rather than driven. Loading a committed Scenario and
// stepping forward through time travel replays that step exactly as the
// session played it — the board treats a forward step as a step taken, which
// is what makes this work — so a shot is a Scenario plus the Resolution Fact
// to stop in front of, and no shot has to know which cards to drag.
//
// The Boss defeat is the one moment no committed Scenario holds: the solo
// ceiling exists to prove a lone Guardian cannot win, so nothing on disk
// kills Embermaw. To film it, drop `boss_health` in
// data/encounters/embermaw_prototype.json to something a first Slot can
// clear, rebuild, film `--fact "to embermaw"`, and put the file back.
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4174
const BASE_URL = `http://localhost:${PORT}/`

// The shots worth having a name for. Each is a Scenario and the Fact that
// carries the effect: a Hazard landing, the Round boundary that takes it
// back, a Whelp arriving. `ms` is how long that effect owns the screen —
// long enough to include the Continue prompts a Boss Row waits behind.
const SHOTS = {
  hazard: { scenario: 'embermaw_solo_ceiling', fact: 'Hazard at', ms: 3200 },
  expiry: { scenario: 'embermaw_solo_ceiling', fact: 'begins', ms: 2000 },
  spawn: { scenario: 'embermaw_brood_pressure', fact: 'Spawn ', ms: 4000 },
}

// Options that carry a value, and how to read it. Everything else is a flag.
const VALUED = { '--shot': String, '--scenario': String, '--fact': String, '--out': String, '--hex': String, '--ms': Number, '--every': Number, '--columns': Number, '--zoom': Number }

function parseArgs(argv) {
  const args = { every: 0, sheet: true, columns: 8, png: false, zoom: 0.5 }
  for (let at = 0; at < argv.length; at += 1) {
    const flag = argv[at]
    if (VALUED[flag]) {
      args[flag.slice(2)] = VALUED[flag](argv[at + 1])
      at += 1
    } else if (flag === '--list') {
      console.log(Object.keys(SHOTS).join('\n'))
      process.exit(0)
    } else if (flag === '--no-sheet') {
      args.sheet = false
    } else if (flag === '--png') {
      args.png = true
    } else {
      throw new Error(`Unknown option ${flag}`)
    }
  }
  const named = args.shot === undefined ? null : SHOTS[args.shot]
  if (args.shot !== undefined && !named) {
    throw new Error(`Unknown shot ${args.shot} — try one of: ${Object.keys(SHOTS).join(', ')}`)
  }
  return {
    ...args,
    scenario: args.scenario ?? named?.scenario ?? 'embermaw_solo_ceiling',
    fact: args.fact ?? named?.fact ?? null,
    ms: args.ms ?? named?.ms ?? 2400,
    // Which hex to frame on, if the film should be a hex rather than the
    // board. A Hazard says where it landed in its own fact, so that case
    // needs no flag; anything else — a spawn, a Boss going out — names the
    // hex here or gets the whole board.
    hex: args.hex ?? named?.hex ?? null,
    out: args.out ?? `film/${args.shot ?? 'shot'}`,
  }
}

async function waitForServer(url, attempts = 60) {
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
  throw new Error(`Preview server did not start at ${url} — run npm run build first`)
}

const options = parseArgs(process.argv.slice(2))
if (options.fact === null) {
  throw new Error('Nothing to film: pass --shot <name> or --fact "<text from the fact log>"')
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: 'ignore',
})

try {
  await waitForServer(BASE_URL)
  // Let Playwright resolve the browser it installed; PLAYWRIGHT_CHROMIUM_PATH
  // overrides it for images that ship their own build at a fixed path.
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined })
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } })
  // The Scenario picker and time travel are debug-rail controls, and the rail
  // is opt-in on a build.
  await page.goto(`${BASE_URL}?debug=1`)
  await page.waitForSelector('[data-testid="play-surface"]')
  // A fresh context is a first visit, so the How to Play guide is over the
  // board until it is sent away.
  await page.waitForSelector('[data-testid="guide-modal"]')
  await page.locator('[data-testid="guide-skip"]').click()
  await page.waitForSelector('[data-testid="guide-modal"]', { state: 'detached' })

  await page.selectOption('[data-testid="scenario-select"]', options.scenario)
  await page.locator('[data-testid="load-scenario"]').click()
  await page.waitForFunction(() => (document.querySelector('[data-testid="time-travel-slider"]')?.max ?? '0') !== '0')
  const slider = page.locator('[data-testid="time-travel-slider"]')
  const lastStep = Number(await slider.getAttribute('max'))

  // Which step to stand in front of. The fact log holds every fact up to the
  // step being viewed, so a step's own facts are the tail it adds to the step
  // before it — which is also why the search reads the log rather than the
  // Scenario file: what is being looked for is what the session resolved, not
  // what the player asked for.
  const factLog = page.locator('[data-testid="fact-log"]')
  await slider.fill('0')
  let previousLog = await factLog.innerText()
  let target = -1
  let matched = ''
  for (let step = 1; step <= lastStep; step += 1) {
    await slider.fill(String(step))
    const log = await factLog.innerText()
    const added = log.slice(previousLog.length)
    previousLog = log
    if (added.includes(options.fact)) {
      target = step
      matched = added.split('\n').find((line) => line.includes(options.fact)) ?? ''
      break
    }
  }
  if (target === -1) {
    throw new Error(`No step of ${options.scenario} resolved a fact matching "${options.fact}"`)
  }
  console.log(`filming ${options.scenario} step ${target}/${lastStep} — ${matched.trim() || options.fact}`)

  // Stand one step back and let the board settle there, so the first frame is
  // the state the effect starts from rather than the tail of the last one.
  await slider.fill(String(target - 1))
  await page.waitForTimeout(600)

  // Frame the board and nothing else: a smaller clip is a faster screenshot,
  // which is the only lever this harness has on its frame rate. Measured
  // once — the canvas is fitted to the HUD and does not move during a shot.
  //
  // Tighter still if the moment names a hex. A Hazard's fact carries the
  // coordinates it landed on, and an effect that owns 60 pixels of a
  // 418-pixel board is worth filling the frame with — flames reach past their
  // own tile, so the crop is a hex and a hex's worth of room around it.
  const board = await page.locator('[data-testid="board"]').boundingBox()
  let clip = { x: Math.floor(board.x), y: Math.floor(board.y), width: Math.ceil(board.width), height: Math.ceil(board.height) }
  const named = options.hex ?? /\((-?\d+), (-?\d+)\)/.exec(matched)?.slice(1, 3).join(',') ?? null
  if (named !== null) {
    const rect = (await page.evaluate(() => window.__workbench.hexRects())).find((hex) => hex.key === named.replace(' ', ''))
    if (!rect) {
      throw new Error(`No hex ${named} on this board`)
    }
    const pad = (rect.bottom - rect.top) * 0.9
    const viewport = page.viewportSize()
    const left = Math.max(0, rect.left - pad)
    const top = Math.max(0, rect.top - pad)
    clip = {
      x: Math.floor(left),
      y: Math.floor(top),
      width: Math.ceil(Math.min(rect.right + pad, viewport.width) - left),
      height: Math.ceil(Math.min(rect.bottom + pad, viewport.height) - top),
    }
    console.log(`framed on hex ${named}`)
  }

  // Clear the last take, and only the last take: a shot is re-filmed until it
  // reads right, and frames of two different takes interleaved by timestamp
  // are worse than no film at all. Frames only — a script that took an --out
  // it was handed and deleted the tree under it would be one typo away from
  // deleting source.
  mkdirSync(options.out, { recursive: true })
  for (const name of readdirSync(options.out)) {
    if (name.endsWith('.png') || name.endsWith('.jpg')) {
      rmSync(`${options.out}/${name}`)
    }
  }

  const extension = options.png ? 'png' : 'jpeg'
  const startedAt = Date.now()
  // The clock starts with the step, not with the first screenshot: a frame is
  // named for when it was taken, and the first one is already late.
  await page.locator('[data-testid="tt-next"]').click()
  let index = 0
  while (Date.now() - startedAt < options.ms) {
    const elapsed = Math.round(Date.now() - startedAt)
    index += 1
    await page.screenshot({
      path: `${options.out}/${String(index).padStart(3, '0')}-${elapsed}ms.${options.png ? 'png' : 'jpg'}`,
      clip,
      type: extension,
      quality: options.png ? undefined : 92,
    })
    // A Boss Row waits behind a Continue prompt between beats, so a shot that
    // did not press would film the pause and never the beat. Pressed between
    // frames rather than up front: which beat carries the effect is the
    // playout's business, and the film covers the whole Row either way.
    //
    // Clicked through the DOM rather than through the locator, which would
    // scroll the prompt into view and wait for it to hold still — hundreds of
    // milliseconds of the effect, missed, every time a prompt came up.
    await page.evaluate(() => document.querySelector('[data-testid="playout-continue"]')?.click())
    if (options.every > 0) {
      await page.waitForTimeout(options.every)
    }
  }
  const spent = Math.round(Date.now() - startedAt)
  console.log(`${index} frames over ${spent}ms (${((index / spent) * 1000).toFixed(1)}fps) in ${options.out}/`)

  if (options.sheet) {
    // One image of the whole motion. Reviewing a folder of PNGs means holding
    // each frame in memory against the last; a contact sheet puts the shape of
    // the curve on one screen, which is how every timing problem so far has
    // been spotted. Composited in the browser that is already open rather than
    // by adding an image library to the app's dependencies.
    const files = readdirSync(options.out)
      .filter((name) => name.endsWith('.png') || name.endsWith('.jpg'))
      .sort()
    const sources = files.map((name) => ({
      label: /-(\d+)ms/.exec(name)?.[1] ?? '',
      data: `data:image/${name.endsWith('.png') ? 'png' : 'jpeg'};base64,${readFileSync(`${options.out}/${name}`).toString('base64')}`,
    }))
    const sheet = await page.evaluate(
      async ({ sources, columns, cellWidth, cellHeight }) => {
        const images = await Promise.all(
          sources.map(async ({ label, data }) => {
            const image = document.createElement('img')
            image.src = data
            await image.decode()
            return { label, image }
          }),
        )
        // A frame gets a strip of its own to be stamped on: a timestamp
        // painted over the picture lands on the part of the effect being read.
        const strip = 20
        const gutter = 4
        const rows = Math.ceil(images.length / columns)
        const canvas = document.createElement('canvas')
        canvas.width = columns * (cellWidth + gutter) + gutter
        canvas.height = rows * (cellHeight + strip + gutter) + gutter
        const context = canvas.getContext('2d')
        // The board is transparent over the app's own backdrop, so a sheet on
        // white would read nothing like the game.
        context.fillStyle = '#09090b'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.font = '13px monospace'
        images.forEach(({ label, image }, at) => {
          const x = gutter + (at % columns) * (cellWidth + gutter)
          const y = gutter + Math.floor(at / columns) * (cellHeight + strip + gutter)
          context.fillStyle = '#fbbf24'
          context.fillText(`${label}ms`, x + 2, y + 14)
          context.drawImage(image, x, y + strip, cellWidth, cellHeight)
        })
        return canvas.toDataURL('image/png').split(',')[1]
      },
      { sources, columns: options.columns, cellWidth: Math.round(clip.width * options.zoom), cellHeight: Math.round(clip.height * options.zoom) },
    )
    writeFileSync(`${options.out}/sheet.png`, sheet, 'base64')
    console.log(`contact sheet: ${options.out}/sheet.png`)
  }

  await browser.close()
} finally {
  server.kill()
}
