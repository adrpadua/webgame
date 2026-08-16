import { useEffect, useRef, useState } from 'react'
import type { Phase } from '@/engine'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench } from '@/store/workbench'

// A short, non-blocking banner that names each phase as it begins: the word
// and its colour, nothing else. What the phase means lives behind a hold on
// the Round track.
const PHASE_COPY: Record<Phase, { title: string; tone: string }> = {
  loadout: { title: 'Loadout', tone: 'border-zinc-500 bg-zinc-900/95 text-zinc-100' },
  instant: { title: 'Boss Instant', tone: 'border-amber-500 bg-amber-950/95 text-amber-100' },
  quick: { title: 'Quick Window', tone: 'border-emerald-500 bg-emerald-950/95 text-emerald-100' },
  incoming: { title: 'Boss Incoming', tone: 'border-amber-500 bg-amber-950/95 text-amber-100' },
  slow: { title: 'Slow Window', tone: 'border-sky-500 bg-sky-950/95 text-sky-100' },
}

export function PhaseBanner() {
  const state = useWorkbench(selectState)
  // The banner announces what the player sees, not what the rules have
  // already reached: while a boss track replays beat by beat, the presented
  // phase holds on the Boss window, and the player window is announced when
  // the playout settles into it.
  const playoutPhase = usePlayout((store) => store.phase)
  const phase = playoutPhase ?? state.phase
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
      <div key={shownPhase} className={`wb-banner rounded-2xl border-2 px-5 py-2.5 text-center shadow-2xl ${copy.tone}`}>
        <div className="text-lg font-black tracking-widest uppercase">{copy.title}</div>
      </div>
    </div>
  )
}
