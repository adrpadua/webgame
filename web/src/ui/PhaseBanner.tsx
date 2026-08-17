import { useEffect, useRef, useState } from 'react'
import type { Phase } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'

// A short, non-blocking banner that names each phase as it begins: the word
// and its colour, nothing else. What the phase means lives behind a hold on
// the Round track.
const PHASE_COPY: Record<Phase, { title: string; tone: string }> = {
  loadout: { title: 'Loadout', tone: 'wb-face-steel wb-acc-none text-zinc-100' },
  instant: { title: 'Boss Instant', tone: 'wb-face-steel wb-acc-ember text-ember-100' },
  quick: { title: 'Quick Window', tone: 'wb-face-steel wb-acc-glass text-glass-100' },
  incoming: { title: 'Boss Incoming', tone: 'wb-face-steel wb-acc-ember text-ember-100' },
  slow: { title: 'Slow Window', tone: 'wb-face-steel wb-acc-gold text-gold-100' },
}

export function PhaseBanner() {
  const state = useWorkbench(selectState)
  const phase = state.phase
  const [shownPhase, setShownPhase] = useState<Phase | null>(null)
  const previousPhase = useRef<Phase | null>(phase)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (previousPhase.current === phase) {
      return
    }
    previousPhase.current = phase
    if (!state.active) {
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
  }, [phase, state.active])

  // Never linger over the outcome banner: an Encounter that ends mid-banner
  // (or with the hide timer already cleared) drops the banner immediately.
  if (shownPhase === null || !state.active) {
    return null
  }
  const copy = PHASE_COPY[shownPhase]
  return (
    <div className="pointer-events-none absolute inset-x-6 top-[34%] z-20 flex justify-center" data-testid="phase-banner">
      <div key={shownPhase} className={`wb-banner wb-plate wb-plate-lg py-2.5 text-center ${copy.tone}`}>
        <div className="text-lg font-black tracking-widest uppercase">{copy.title}</div>
      </div>
    </div>
  )
}
