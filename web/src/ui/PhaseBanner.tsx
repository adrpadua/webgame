import { useCatalog } from '@/content/CatalogContext'
import { useEffect, useRef, useState } from 'react'
import type { Phase } from '@/engine'
import { selectActive, selectBossPhase, selectCurrentProgramId, selectPhase, selectPhaseBreakText, useWorkbench } from '@/store/workbench'
import { Notify } from './NotificationLayer'
import { phaseMark } from './phaseTrack'

// A short, non-blocking banner that names each phase as it begins: the word
// and its colour, nothing else. What the phase means lives behind a hold on
// the Round track. The words are the track table's full titles, so the
// banner and the row's lit chip can never disagree about a window's name;
// only the banner's plate tones live here.
const PHASE_TONE: Record<Phase, string> = {
  loadout: 'wb-face-steel wb-acc-none text-ceramic-200',
  instant: 'wb-face-steel wb-acc-ember text-ember-100',
  quick: 'wb-face-steel wb-acc-glass text-glass-100',
  incoming: 'wb-face-steel wb-acc-ember text-ember-100',
  slow: 'wb-face-steel wb-acc-gold text-gold-100',
}

// Five primitives rather than the Encounter: the banner announces phase
// changes and the Phase Reveal, and neither is news it can learn from a Charge
// or a shot. Subscribed to the root it re-rendered on every action and had to
// re-run both timers' effects to conclude nothing had happened.
export function PhaseBanner() {
  const catalog = useCatalog()
  const phase = useWorkbench(selectPhase)
  const active = useWorkbench(selectActive)
  const bossPhase = useWorkbench(selectBossPhase)
  const currentProgramId = useWorkbench(selectCurrentProgramId)
  const phaseBreakText = useWorkbench(selectPhaseBreakText)
  const [shownPhase, setShownPhase] = useState<Phase | null>(null)
  const previousPhase = useRef<Phase | null>(phase)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The Phase Reveal (ADR 0023) is another moment in this banner rather than
  // a component of its own: the Boss turning is the same kind of event as a
  // window opening, and a modal would stop the fight to announce it. It runs
  // at the Round boundary, so it lands before the first Instant Row and wins
  // the banner while it is up — the phase word underneath it is the smaller
  // news. It dwells longer because it carries a sentence, not a word.
  const [shownBreak, setShownBreak] = useState<string | null>(null)
  const previousBossPhase = useRef<number>(bossPhase)
  const breakTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Only an increase is a reveal. Time travel moves this number in both
    // directions, and rewinding past the break must not announce it again —
    // nor announce it backwards, which is what a plain inequality did.
    const rose = bossPhase > previousBossPhase.current
    previousBossPhase.current = bossPhase
    if (!rose || !active) {
      return
    }
    setShownBreak(currentProgramId)
    if (breakTimer.current !== null) {
      clearTimeout(breakTimer.current)
    }
    // Matches .wb-banner-long's 2.6s; change them together.
    breakTimer.current = setTimeout(() => setShownBreak(null), 2600)
    return () => {
      if (breakTimer.current !== null) {
        clearTimeout(breakTimer.current)
      }
    }
  }, [bossPhase, active, currentProgramId])

  useEffect(() => {
    if (previousPhase.current === phase) {
      return
    }
    previousPhase.current = phase
    if (!active) {
      return
    }
    setShownPhase(phase)
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current)
    }
    hideTimer.current = setTimeout(() => setShownPhase(null), 1700)
    return () => {
      if (hideTimer.current !== null) {
        clearTimeout(hideTimer.current)
      }
    }
  }, [phase, active])

  // Never linger over the outcome banner: an Encounter that ends mid-banner
  // (or with the hide timer already cleared) drops the banner immediately.
  // The stage zone, centred in whatever the guidance and dock zones leave.
  // It used to sit at a hard `top-[34%]` of the play surface, which is how it
  // came to print across the guidance stack once that stack had two bars in
  // it. It carries no control and stays inert: the hexes under it are live.
  if (shownBreak !== null && active) {
    const program = catalog.programs[shownBreak]
    return (
      <Notify id="phase-banner">
        <div className="pointer-events-none flex justify-center" data-testid="phase-banner">
          <div
            key={`break-${shownBreak}`}
            className="wb-banner-long wb-plate wb-plate-lg wb-face-steel wb-acc-ember py-2.5 text-center text-coral-100"
            data-testid="phase-break-banner"
            data-program={shownBreak}
          >
            <div className="text-lg font-black tracking-widest uppercase">{program?.title ?? 'Phase II'}</div>
            {phaseBreakText !== '' && <p className="mt-1 text-[11px] leading-snug font-semibold text-coral-200">{phaseBreakText}</p>}
          </div>
        </div>
      </Notify>
    )
  }
  if (shownPhase === null || !active) {
    return null
  }
  return (
    <Notify id="phase-banner">
      <div className="pointer-events-none flex justify-center" data-testid="phase-banner">
        <div key={shownPhase} className={`wb-banner wb-plate wb-plate-lg py-2.5 text-center ${PHASE_TONE[shownPhase]}`}>
          <div className="text-lg font-black tracking-widest uppercase">{phaseMark(shownPhase).title}</div>
        </div>
      </div>
    </Notify>
  )
}
