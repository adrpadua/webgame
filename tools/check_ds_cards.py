#!/usr/bin/env python3
"""Read every design-system preview card in a real browser before it ships.

The design system published to Claude Design is generated, and a generated
card that renders wrong renders wrong in every design the design agent ever
builds with it. `build_ds.py` cannot see any of that: it emits strings. This
is the gate that actually looks.

Four failures, each of which has happened here or in the app this is generated
from:

  1. **An unstyled card.** A card whose stylesheet did not resolve still looks
     like a page of text, and reads as "sparse" rather than as broken. Checked
     by asserting the card actually took the system's own surface colour.
  2. **An empty card.** A renderer that returned "" leaves a card that is
     valid HTML, uploads cleanly, and shows a blank tile in the pane.
  3. **A plate padding inside its own cut.** The interface direction's one
     padding rule (`--inset + --gutter`). The app enforces this on every
     visible plate; the previews draw the same plates from the same CSS and
     were never checked.
  4. **A row overrunning its own box.** The half the padding check cannot see:
     padding clearing the cut is worth nothing if the CONTENT overflows, since
     the spill lands in exactly the same place — inside the plate's own rake.
     A three-Charge Slot row shipped at 106px inside 97px this way.

Checks 3 and 4 are the app's own two checks from `web/scripts/smoke.mjs`,
re-pointed at the canvas builder's class names (`.plate`, `--off`,
`.p-centered`) rather than the app's (`.wb-plate`, `--wb-off`).

Run from the repo root:  python3 tools/check_ds_cards.py
Exits 0 with a count, or 1 with every problem named.
"""

import glob
import json
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW = os.path.join(ROOT, "design", "design-system", "preview")
WEB = os.path.join(ROOT, "web")

# The browser the repo's own Playwright drives, unless this machine points at
# its own build — the same override `web/scripts/check-browser.mjs` honours, so
# a sandbox sharing one Chromium between checkouts is a supported setup rather
# than a failure.
CHROMIUM_CANDIDATES = [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/opt/pw-browsers/chromium/chrome-linux64/chrome",
]

DRIVER = r"""
const { chromium } = require('playwright')
const files = JSON.parse(process.argv[2])
const executablePath = process.argv[3] || undefined

const probe = () => {
  const problems = []
  const card = document.querySelector('.ds-card')

  // 1 — the stylesheet resolved. `.ds-card` declares the system's own surface;
  // an unresolved <link> leaves it at the UA default, which is transparent.
  if (card === null) {
    problems.push('no .ds-card element')
  } else {
    const bg = getComputedStyle(card).backgroundColor
    if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
      problems.push(`unstyled: .ds-card background is ${bg} — the stylesheet did not resolve`)
    }
    // 2 — the card has content. A renderer that returned "" is valid HTML.
    const box = card.getBoundingClientRect()
    if (box.width < 40 || box.height < 40) {
      problems.push(`empty: .ds-card is ${Math.round(box.width)}x${Math.round(box.height)}`)
    }
  }

  // 3 — the one padding rule, on every visible plate.
  const seenPad = new Set()
  for (const el of document.querySelectorAll('.plate')) {
    const box = el.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) continue
    const style = getComputedStyle(el)
    const off = Number.parseFloat(style.getPropertyValue('--off')) || 0
    // Content held to the plate's vertical middle meets each cut at half depth.
    const inset = el.classList.contains('p-centered') ? off / 2 : off
    const left = Number.parseFloat(style.paddingLeft)
    const right = Number.parseFloat(style.paddingRight)
    if (left < inset - 0.01 || right < inset - 0.01) {
      const size = [...el.classList].find((n) => n.startsWith('p-')) ?? 'plate'
      const key = `${size}:${[...el.classList].join('.')}`
      if (seenPad.has(key)) continue
      seenPad.add(key)
      problems.push(`${key} pads ${left}/${right} inside a ${inset}px cut`)
    }
  }

  // 4 — content overrun, scoped to single-line flex rows: a wrapping element is
  // supposed to overflow its line box, and an overflowing flex item is the case
  // that moves scrollWidth past clientWidth.
  const seenRun = new Set()
  for (const plate of document.querySelectorAll('.plate')) {
    const pb = plate.getBoundingClientRect()
    if (pb.width === 0 || pb.height === 0) continue
    for (const el of [plate, ...plate.querySelectorAll('*')]) {
      const style = getComputedStyle(el)
      if (style.display !== 'flex' || style.flexWrap !== 'nowrap') continue
      const overrun = el.scrollWidth - el.clientWidth
      if (overrun <= 1 || el.clientWidth === 0) continue
      const size = [...plate.classList].find((n) => n.startsWith('p-')) ?? 'plate'
      const key = `${size}:${String(el.className).split(' ')[0]}`
      if (seenRun.has(key)) continue
      seenRun.add(key)
      problems.push(`${key} overruns by ${overrun}px (${el.scrollWidth} in ${el.clientWidth})`)
    }
  }
  return problems
}

;(async () => {
  const browser = await chromium.launch({ executablePath })
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } })
  const results = []
  for (const file of files) {
    const consoleErrors = []
    page.removeAllListeners('pageerror')
    page.on('pageerror', (err) => consoleErrors.push(String(err)))
    await page.goto('file://' + file, { waitUntil: 'load' })
    const problems = await page.evaluate(probe)
    results.push({ file, problems: problems.concat(consoleErrors) })
  }
  await browser.close()
  console.log(JSON.stringify(results))
})().catch((err) => {
  console.error(String(err))
  process.exit(2)
})
"""


def chromium_path():
    override = os.environ.get("PLAYWRIGHT_CHROMIUM_PATH", "")
    if override:
        return override
    for candidate in CHROMIUM_CANDIDATES:
        if os.path.exists(candidate):
            return candidate
    return ""


def main():
    files = sorted(glob.glob(os.path.join(PREVIEW, "*.html")))
    if not files:
        print("no preview cards found — run build_ds.py first", file=sys.stderr)
        return 1
    if not os.path.isdir(os.path.join(WEB, "node_modules", "playwright")):
        print("playwright missing — run `npm ci` in web/ first", file=sys.stderr)
        return 1

    handle, driver = tempfile.mkstemp(suffix=".cjs", dir=WEB)
    os.close(handle)
    try:
        with open(driver, "w") as out:
            out.write(DRIVER)
        proc = subprocess.run(
            ["node", driver, json.dumps(files), chromium_path()],
            cwd=WEB, capture_output=True, text=True,
        )
    finally:
        os.remove(driver)

    if proc.returncode != 0:
        print(proc.stderr.strip() or "the browser check could not run", file=sys.stderr)
        return 1

    results = json.loads(proc.stdout.strip().splitlines()[-1])
    bad = [r for r in results if r["problems"]]
    for entry in bad:
        print(f"FAIL {os.path.basename(entry['file'])}", file=sys.stderr)
        for problem in entry["problems"]:
            print(f"       {problem}", file=sys.stderr)
    if bad:
        print(f"\n{len(bad)} of {len(results)} cards failed", file=sys.stderr)
        return 1
    print(f"{len(results)} cards render clean: styled, non-empty, "
          f"every plate clears its cut, no row overruns its box")
    return 0


if __name__ == "__main__":
    sys.exit(main())
