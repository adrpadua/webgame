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
  // True while a batch that ended the Encounter is still replaying: the
  // outcome presentation (banner, Restart control) waits for it.
  outcomeHeld: boolean
  // Starts a batch's staggered presentation: gauge steps (null when nothing
  // staggers a gauge) and, for a batch that ended the Encounter, how long
  // to hold the outcome reveal while the feedback plays.
  begin: (playout: HealthPlayout | null, outcomeHoldMs?: number) => void
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
  outcomeHeld: false,
  begin: (playout, outcomeHoldMs = 0) => {
    cancelTimers()
    set({ overrides: playout ? { ...playout.initial } : {}, outcomeHeld: outcomeHoldMs > 0 })
    for (const step of playout?.steps ?? []) {
      timers.push(
        setTimeout(() => {
          set((store) => ({ overrides: { ...store.overrides, [step.entityId]: step.value } }))
        }, step.delay),
      )
    }
    if (playout) {
      // Hand the gauges back to the authoritative state once the last
      // beat's feedback has finished playing.
      const end = Math.max(...playout.steps.map((step) => step.delay)) + EFFECT_SETTLE_MS
      timers.push(setTimeout(() => set((store) => ({ ...store, overrides: {} })), end))
    }
    if (outcomeHoldMs > 0) {
      timers.push(setTimeout(() => set((store) => ({ ...store, outcomeHeld: false })), outcomeHoldMs))
    }
  },
  clear: () => {
    cancelTimers()
    set((store) => (Object.keys(store.overrides).length === 0 && !store.outcomeHeld ? store : { overrides: {}, outcomeHeld: false }))
  },
}))
