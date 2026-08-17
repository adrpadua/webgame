import { useEffect } from 'react'
import { useOnboarding } from '@/store/onboarding'
import { useHold } from './HoldPopover'
import { FIRST_TURN_STEP_COUNT } from './firstTurnScript'
import { useFirstTurnStep } from './useFirstTurn'
import { FOCUS_RING_CLASS } from './theme'

// The scripted turn's only words: one imperative cue, the control it points
// at, and how far through the Round the player is. Hold the bar for the
// paragraph that used to live on screen.
export function FirstTurnCue() {
  const step = useFirstTurnStep()
  const active = useOnboarding((store) => store.firstTurnActive)
  const finishFirstTurn = useOnboarding((store) => store.finishFirstTurn)
  const hold = useHold(step?.detail ?? null)

  // The script ends the moment the Round it teaches is over.
  useEffect(() => {
    if (active && step === null) {
      finishFirstTurn()
    }
  }, [active, step, finishFirstTurn])

  if (!active || step === null) {
    return null
  }
  // Rendered inside the board's overlay stack: it floats over the lower
  // hexes rather than shrinking the board when a step appears.
  return (
    <div data-testid="first-turn-cue" data-step={step.id}>
      <div
        {...hold.holdProps}
        role="status"
        className="wb-slide-up wb-plate wb-plate-sm wb-face-steel wb-acc-gold pointer-events-auto flex items-center gap-2 py-1.5 text-gold-100"
      >
        <div className="flex shrink-0 gap-1" role="img" aria-label={`Step ${step.ordinal} of ${FIRST_TURN_STEP_COUNT}`}>
          {Array.from({ length: FIRST_TURN_STEP_COUNT }, (_, index) => (
            <span key={index} className={`h-1.5 w-1.5 rounded-full ${index < step.ordinal ? 'bg-gold-400' : 'bg-gold-900'}`} />
          ))}
        </div>
        <span className="flex-1 text-xs font-bold">{step.cue}</span>
        <span className="shrink-0 bg-gold-700/80 px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase">{step.targetLabel}</span>
        <button
          type="button"
          data-testid="first-turn-skip"
          aria-label="Skip the guided first turn"
          onClick={finishFirstTurn}
          className={`min-h-11 min-w-11 shrink-0 px-2 text-[10px] font-bold tracking-wide uppercase transition hover:scale-110 ${FOCUS_RING_CLASS}`}
        >
          Skip
        </button>
      </div>
    </div>
  )
}
