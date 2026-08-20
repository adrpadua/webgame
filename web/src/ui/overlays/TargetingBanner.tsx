import { useCatalog } from '@/content/CatalogContext'
import { fireTargeting } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { Notify } from './NotificationLayer'
import { FOCUS_RING_CLASS } from '../common/theme'

// A Top Card waiting for its target. What kind of target it wants is an
// engine query (ADR 0013), never a guess from the payload shape.
export function TargetingBanner() {
  const targetingSlotIndex = useWorkbench((store) => store.targetingSlotIndex)
  const cancelTargeting = useWorkbench((store) => store.cancelTargeting)
  const catalog = useCatalog()
  const state = useWorkbench(selectState)
  if (targetingSlotIndex === null) {
    return null
  }
  const targetMode = fireTargeting(catalog, state, state.primaryHeroId, targetingSlotIndex).mode
  // Docked. At its old fixed `top-40` this prompt printed across the advance
  // control, which then sat in the phase strip — the one control the player
  // must not lose while a Top Card waits for its target.
  return (
    <Notify id="targeting">
      <div
        className="wb-slide-up wb-plate wb-plate-sm wb-face-steel wb-acc-gold flex items-center justify-between py-2 text-xs font-semibold text-gold-100 shadow-lg"
        data-testid="targeting-banner"
      >
        <span>{targetMode === 'hex' ? 'Pick a hex' : targetMode === 'ally' ? 'Pick an ally' : 'Pick a piece'}</span>
        <button
          type="button"
          onClick={cancelTargeting}
          className={`wb-plate wb-plate-sm wb-face-gold wb-acc-gold pointer-events-auto min-h-11 font-bold text-gold-950 ${FOCUS_RING_CLASS}`}
        >
          Cancel
        </button>
      </div>
    </Notify>
  )
}
