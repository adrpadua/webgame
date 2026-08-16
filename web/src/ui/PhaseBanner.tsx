import { useEffect, useRef, useState } from 'react'
import type { Phase } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'

const PHASE_COPY: Record<Phase, { title: string; hint: string; tone: string }> = {
  loadout: { title: 'Loadout', hint: 'Prepare cards into your Slots', tone: 'border-zinc-500 bg-zinc-900/95 text-zinc-100' },
  instant: { title: 'Boss Instant', hint: 'The boss strikes right now', tone: 'border-amber-500 bg-amber-950/95 text-amber-100' },
  quick: { title: 'Quick Window', hint: 'Fire quick Slots, charge, or move', tone: 'border-emerald-500 bg-emerald-950/95 text-emerald-100' },
  incoming: { title: 'Boss Incoming', hint: 'A telegraph — brace or get clear', tone: 'border-amber-500 bg-amber-950/95 text-amber-100' },
  slow: { title: 'Slow Window', hint: 'Fire slow Slots and set up', tone: 'border-sky-500 bg-sky-950/95 text-sky-100' },
}

// A short, non-blocking banner that names each phase as it begins. It
// teaches the round vocabulary in play — the same words the guide and the
// phase chips use — then gets out of the way.
export function PhaseBanner() {
  const state = useWorkbench(selectState)
  const [shownPhase, setShownPhase] = useState<Phase | null>(null)
  const previousPhase = useRef<Phase | null>(state.phase)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (previousPhase.current === state.phase) {
      return
    }
    previousPhase.current = state.phase
    if (!state.active) {
      return
    }
    setShownPhase(state.phase)
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current)
    }
    hideTimer.current = setTimeout(() => setShownPhase(null), 1700)
    return () => {
      if (hideTimer.current !== null) {
        clearTimeout(hideTimer.current)
      }
    }
  }, [state.phase, state.active])

  if (shownPhase === null) {
    return null
  }
  const copy = PHASE_COPY[shownPhase]
  return (
    <div className="pointer-events-none absolute inset-x-6 top-[34%] z-20 flex justify-center" data-testid="phase-banner">
      <div key={shownPhase} className={`wb-banner rounded-2xl border-2 px-5 py-3 text-center shadow-2xl ${copy.tone}`}>
        <div className="text-lg font-black tracking-widest uppercase">{copy.title}</div>
        <div className="mt-0.5 text-[11px] opacity-90">{copy.hint}</div>
      </div>
    </div>
  )
}
