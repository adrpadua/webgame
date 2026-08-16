import { create } from 'zustand'
import { hexKey } from '@/engine'
import { BEAT_STAGGER_MS, EFFECT_SETTLE_MS, type BoardEffect, type HealthPlayoutValue, type PlayoutScript } from '@/board/effects'

// The staggered-playout director for one resolved batch. While a boss track
// replays beat by beat, the authoritative state already holds the batch's
// final numbers; this store carries what the HUD should *show* right now —
// gauge values, the beat currently playing (the Hunt Pattern chip it
// lights), the moment's board effects, and what has not happened on screen
// yet (ground scorched or Whelps spawned by unplayed moments).
//
// Pacing: the first moment plays when the batch lands. Between moments the
// playout pauses on a Continue prompt so the player can read each part of
// the boss's turn — except in auto mode (the scripted first turn, which
// gates its own controls), where moments advance on a timer as before.
//
// Presentation only: nothing reads these values back into the rules, and
// clearing the store (a new batch, time travel, unmount) always lands
// every gauge on the authoritative state.

interface PlayoutStore {
  overrides: Record<string, HealthPlayoutValue>
  // True while a batch that ended the Encounter is still replaying: the
  // outcome presentation (banner, Restart control) waits for it.
  outcomeHeld: boolean
  // The beat playing right now, for the Hunt Pattern chip and the prompt.
  activeBeatId: string | null
  activeBeatTitle: string | null
  // True while the playout is paused between moments, waiting for a tap.
  awaitingContinue: boolean
  // The channel the board reads: momentSeq bumps once per fired moment and
  // momentEffects carries that moment's feedback (delays already stripped).
  momentSeq: number
  momentEffects: BoardEffect[]
  // What unplayed moments will do, so the board can hold it back: hazards
  // stay undrawn, spawns stay unseen, a turning piece keeps its old facing.
  pendingScorchKeys: string[]
  pendingSpawnIds: string[]
  pendingFacings: Record<string, number>
  begin: (script: PlayoutScript, autoAdvance: boolean) => void
  continuePlayout: () => void
  clear: () => void
}

let timers: ReturnType<typeof setTimeout>[] = []
let moments: PlayoutScript['moments'] = []
let momentIndex = 0
let autoMode = false

function cancelTimers(): void {
  for (const timer of timers) {
    clearTimeout(timer)
  }
  timers = []
}

// Everything the moments after `index` will show, summarized for the board.
function pendingAfter(index: number): Pick<PlayoutStore, 'pendingScorchKeys' | 'pendingSpawnIds' | 'pendingFacings'> {
  const pendingScorchKeys: string[] = []
  const pendingSpawnIds: string[] = []
  const pendingFacings: Record<string, number> = {}
  for (const moment of moments.slice(index + 1)) {
    for (const effect of moment.effects) {
      if (effect.kind === 'scorch') {
        pendingScorchKeys.push(hexKey(effect.at))
      } else if (effect.kind === 'spawn') {
        pendingSpawnIds.push(effect.entityId)
      } else if (effect.kind === 'turn' && effect.fromFacing !== undefined && !(effect.entityId in pendingFacings)) {
        pendingFacings[effect.entityId] = effect.fromFacing
      }
    }
  }
  return { pendingScorchKeys, pendingSpawnIds, pendingFacings }
}

const IDLE = {
  overrides: {},
  outcomeHeld: false,
  activeBeatId: null,
  activeBeatTitle: null,
  awaitingContinue: false,
  pendingScorchKeys: [],
  pendingSpawnIds: [],
  pendingFacings: {},
}

export const usePlayout = create<PlayoutStore>((set, get) => {
  const finish = () => set((store) => ({ ...store, ...IDLE }))

  const fireMoment = (index: number): void => {
    momentIndex = index
    const moment = moments[index]
    set((store) => ({
      overrides: { ...store.overrides, ...moment.gauges },
      activeBeatId: moment.beatId,
      activeBeatTitle: moment.beatTitle,
      awaitingContinue: false,
      momentSeq: store.momentSeq + 1,
      momentEffects: moment.effects,
      ...pendingAfter(index),
    }))
    if (index === moments.length - 1) {
      // The last moment settles on its own; there is nothing left to prompt
      // for, and any held outcome reveals when the feedback has played.
      timers.push(setTimeout(finish, EFFECT_SETTLE_MS))
    } else if (autoMode) {
      timers.push(setTimeout(() => fireMoment(index + 1), BEAT_STAGGER_MS))
    } else {
      // Arm the prompt once this moment's feedback has had its beat.
      timers.push(setTimeout(() => set({ awaitingContinue: true }), EFFECT_SETTLE_MS))
    }
  }

  return {
    ...IDLE,
    momentSeq: 0,
    momentEffects: [],
    begin: (script, autoAdvance) => {
      cancelTimers()
      moments = script.moments
      autoMode = autoAdvance
      set({ ...IDLE, overrides: { ...script.initial }, outcomeHeld: script.endsEncounter })
      fireMoment(0)
    },
    continuePlayout: () => {
      if (!get().awaitingContinue || momentIndex + 1 >= moments.length) {
        return
      }
      fireMoment(momentIndex + 1)
    },
    clear: () => {
      cancelTimers()
      moments = []
      set((store) =>
        store.activeBeatId === null &&
        !store.awaitingContinue &&
        !store.outcomeHeld &&
        Object.keys(store.overrides).length === 0 &&
        store.pendingScorchKeys.length === 0 &&
        store.pendingSpawnIds.length === 0
          ? store
          : { ...store, ...IDLE },
      )
    },
  }
})
