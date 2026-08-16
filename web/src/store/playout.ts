import { create } from 'zustand'
import { EFFECT_SETTLE_MS, type HealthPlayout, type HealthPlayoutValue } from '@/board/effects'

// The staggered-playout overlay for the HUD's gauges. While a boss track
// replays beat by beat, the authoritative state already holds the batch's
// final numbers; this store carries what each gauge should *show* right
// now, stepping through the same beat slots the board plays. An entity
// with no entry here shows its true state value.
//
// Presentation only: nothing reads these values back into the rules, and
// clearing the store (a new batch, time travel, unmount) always lands
// every gauge on the authoritative state.

interface PlayoutStore {
  overrides: Record<string, HealthPlayoutValue>
  begin: (playout: HealthPlayout) => void
  clear: () => void
}

let timers: ReturnType<typeof setTimeout>[] = []

function cancelTimers(): void {
  for (const timer of timers) {
    clearTimeout(timer)
  }
  timers = []
}

export const usePlayout = create<PlayoutStore>((set) => ({
  overrides: {},
  begin: (playout) => {
    cancelTimers()
    set({ overrides: { ...playout.initial } })
    for (const step of playout.steps) {
      timers.push(
        setTimeout(() => {
          set((store) => ({ overrides: { ...store.overrides, [step.entityId]: step.value } }))
        }, step.delay),
      )
    }
    // Hand the gauges back to the authoritative state once the last beat's
    // feedback has finished playing.
    const end = Math.max(...playout.steps.map((step) => step.delay)) + EFFECT_SETTLE_MS
    timers.push(setTimeout(() => set({ overrides: {} }), end))
  },
  clear: () => {
    cancelTimers()
    set((store) => (Object.keys(store.overrides).length === 0 ? store : { overrides: {} }))
  },
}))
