import { useEffect } from 'react'
import { useWorkbench } from '@/store/workbench'
import { Notify } from './NotificationLayer'

// The refusal. Every rejected gesture — an illegal drop, a move out of its
// window, a Slot fired cold — lands here as one line, and clears itself.
export function RejectionToast() {
  const lastRejection = useWorkbench((store) => store.lastRejection)
  const clearRejection = useWorkbench((store) => store.clearRejection)
  useEffect(() => {
    if (lastRejection === null) {
      return
    }
    const timer = setTimeout(clearRejection, 3500)
    return () => clearTimeout(timer)
  }, [lastRejection, clearRejection])
  if (lastRejection === null) {
    return null
  }
  // Docked: the refusal answers a tap on the Action Bar or the Hand, so it
  // belongs above them rather than at a fixed offset off the bottom of the
  // frame — which is how it used to land on the Action Bar itself.
  return (
    <Notify id="rejection">
      <div
        className="wb-slide-up wb-plate wb-plate-sm wb-face-steel wb-acc-ember py-2 text-center text-xs font-semibold text-ember-100"
        data-testid="rejection-toast"
      >
        {lastRejection}
      </div>
    </Notify>
  )
}
