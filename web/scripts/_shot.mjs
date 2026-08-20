import { chromium } from 'playwright'
const D = '/tmp/claude-0/-home-user-webgame/33fe0064-7b98-55b6-bb40-259980621de0/scratchpad/party'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 1330, height: 250 }, deviceScaleFactor: 3 })
await p.goto(`file://${D}/party-static.html`)
await p.waitForTimeout(300)
const a = await p.evaluate(() => {
  const RAMP = new Set(['9px', '10px', '11px', '12px', '14px', '18px', '24px'])
  const off = [...new Set([...document.querySelectorAll('.plate, .plate *')].map((e) => getComputedStyle(e).fontSize))].filter((f) => !RAMP.has(f))
  const over = [...document.querySelectorAll('.plate, .plate *')].filter((e) => {
    const s = getComputedStyle(e)
    return s.display === 'flex' && s.flexWrap === 'nowrap' && e.scrollWidth - e.clientWidth > 1 && e.clientWidth > 0
  }).length
  // The ruling: the accent resolves to exactly one of the four, and never coral.
  const accents = [...document.querySelectorAll('.plate')].map((e) => getComputedStyle(e).getPropertyValue('--acc').trim())
  return { off, over, accents }
})
console.log('off-ramp sizes:', a.off.length ? a.off : 'none', '| row overruns:', a.over)
console.log('frame accents:', a.accents.join('  '))
await p.screenshot({ path: `${D}/party-threat.png`, fullPage: true })
await b.close()
