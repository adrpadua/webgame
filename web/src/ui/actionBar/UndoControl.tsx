import { selectCanUndo, useWorkbench } from '@/store/workbench'
import { blocksTarget } from '../onboarding/firstTurnScript'
import { UndoIcon } from '../common/icons'
import { useHold } from '../common/HoldPopover'
import { useFirstTurnStep } from '../onboarding/useFirstTurn'
import { FOCUS_RING_CLASS, GATED_CLASS } from '../common/theme'

// The Action Bar's left rail: take back the action you just took.
//
// It reaches exactly as far as the open window, and no further. A Boss Row's
// beats and the advance that closed a window are not the player's to rewind —
// the Round is the Boss's clock, and a beat that can be taken back makes the
// Escalation it drives negotiable — so the rail greys the moment the walk
// reaches the window's floor. The rule lives in selectUndoTarget; this only
// draws it.
//
// Steel rather than gold, unlike the rail on the other side. Both are always
// present, and the eye has to be able to tell the move that advances the
// fight from the one that walks it back without reading either.
export function UndoControl() {
  const canUndo = useWorkbench(selectCanUndo)
  const undo = useWorkbench((store) => store.undo)
  const step = useFirstTurnStep()
  // The scripted turn keeps one live control at a time, and it never names
  // this one: a script that can be walked backwards is not a script.
  const gated = blocksTarget(step, 'undo')
  const hold = useHold({
    id: 'undo',
    title: 'Undo',
    tone: 'neutral',
    text: 'Takes back your last action in this window — a Slot loaded or fired, a Charge tucked, a step paid for.',
    hint: canUndo ? undefined : 'Nothing left to take back: the Boss’s beats and a closed window stay closed.',
  })

  return (
    <button
      type="button"
      data-testid="undo"
      data-can-undo={canUndo}
      disabled={!canUndo || gated}
      aria-label="Undo your last action this window"
      {...hold.holdProps}
      onClick={() => {
        if (hold.consumeHold()) {
          return
        }
        undo()
      }}
      // A rail with nothing to take back is inert, not absent. At steel-600
      // on the dim face the mark scored about 2.2:1 and read as an empty
      // plate — which makes the bar look like it lost a control rather than
      // like this one is waiting. steel-500 clears 4.5:1 on that face and
      // still reads quieter than the armed rail, which keeps three channels
      // between the two states: the face, the leading-edge accent, and
      // runeglass against steel.
      className={`wb-plate wb-plate-lg wb-plate-centered col-span-2 flex min-h-20 items-center justify-center transition ${FOCUS_RING_CLASS} ${
        canUndo ? 'wb-face-steel wb-acc-glass text-glass-200 hover:brightness-125 active:translate-y-px' : 'wb-face-dim wb-acc-none text-steel-500'
      } ${gated ? GATED_CLASS : ''}`}
    >
      <UndoIcon className="h-7 w-7" />
    </button>
  )
}
