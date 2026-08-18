import { create } from 'zustand'
import { hexKey } from '@/engine'
import { BEAT_STAGGER_MS, EFFECT_SETTLE_MS, OUTCOME_REVEAL_MS, type BoardEffect, type HealthPlayoutValue, type PlayoutScript } from '@/board/effects'

// The staggered-playout director for one resolved batch. While a boss track
// replays beat by beat, the authoritative state already holds the batch's
// final numbers; this store carries what the HUD should *show* right now —
// gauge values, the beat currently playing (the Boss Beat chip it
// lights), the moment's board effects, and what has not happened on screen
// yet (ground scorched or Whelps spawned by unplayed moments).
//
// Pacing: every Boss Beat waits behind a press, the first one included. The
// batch lands on a Continue prompt naming the beat that press will play, and
// pauses on another between moments, so the player reads each Boss Beat
// before it resolves rather than catching up to one already swung. Two
// exceptions: auto mode (the scripted first turn, which gates its own
// controls) advances on a timer, and a beatless batch — the player's own
// killing blow — plays the moment it lands.
//
// Presentation only: nothing reads these values back into the rules, and
// clearing the store (a new batch, time travel, unmount) always lands
// every gauge on the authoritative state.

interface PlayoutStore {
  overrides: Record<string, HealthPlayoutValue>
  // True while a batch that ended the Encounter is still replaying: the
  // outcome presentation (banner, Restart control) waits for it.
  outcomeHeld: boolean
  // The beat playing right now, for the Boss Beat chip.
  activeBeatId: string | null
  // The beat the next Continue will play, for the prompt. A prompt names
  // what it is about to show, never what it has already shown: the player
  // reads "Raking Claw" and presses to watch the claw land.
  nextBeatTitle: string | null
  // True while the playout is paused between moments, waiting for a tap.
  awaitingContinue: boolean
  // True while a prompt-paced (non-auto) playout is running: Next defers to
  // it instead of resolving another batch over unplayed moments.
  paced: boolean
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

// Whether this batch shows the Boss going out. The reveal waits on that one
// effect rather than on the fact that something ended, because it is the only
// ending the board draws at length.
function showsBossDefeat(): boolean {
  return moments.some((moment) => moment.effects.some((effect) => effect.kind === 'boss_defeat'))
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
  nextBeatTitle: null,
  awaitingContinue: false,
  paced: false,
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
      nextBeatTitle: moments[index + 1]?.beatTitle ?? null,
      awaitingContinue: false,
      momentSeq: store.momentSeq + 1,
      momentEffects: moment.effects,
      ...pendingAfter(index),
    }))
    if (index === moments.length - 1) {
      // The last moment settles on its own; there is nothing left to prompt
      // for, and any held outcome reveals when the feedback has played.
      //
      // The longer wait belongs to the Boss going out, not to every ending. A
      // party that loses has no body to watch cool — the Hero falls, nothing
      // on the board is still resolving, and holding the Defeat plate back
      // for it would be sitting on a finished screen.
      timers.push(setTimeout(finish, showsBossDefeat() ? OUTCOME_REVEAL_MS : EFFECT_SETTLE_MS))
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
      // Nothing has played yet, so the batch starts one moment before its
      // first: -1 is what continuePlayout counts from and what pendingAfter
      // reads to hold every moment's hazards, spawns and turns back.
      momentIndex = -1
      // The hold-back goes in with the opening state, not after it. Every set
      // here notifies subscribers, and the board is one of them: leaving it
      // out of this one published a frame in which nothing was pending, which
      // is a frame with every Whelp of an unplayed Brood Call standing on the
      // board. That frame is also where their sprites got made, so they then
      // stood there for the rest of the Row.
      set({
        ...IDLE,
        ...pendingAfter(-1),
        overrides: { ...script.initial },
        outcomeHeld: script.endsEncounter,
        paced: !autoAdvance,
      })
      const opening = moments[0]
      if (opening === undefined) {
        // derivePlayoutScript never scripts an empty batch, and firing a
        // moment that does not exist would throw. Settle instead of holding:
        // an outcome reveal must never wait on a moment that cannot come.
        finish()
        return
      }
      // Auto mode presses nothing at all, and a beatless batch is the
      // player's own blow landing — immediate feedback, never something to
      // ask for (a real beat always has an id, so a null one is exactly
      // that case). Everything else is a Boss Row, and a Boss Row lands
      // announced rather than already swinging.
      if (autoAdvance || opening.beatId === null) {
        fireMoment(0)
        return
      }
      set({ awaitingContinue: true, nextBeatTitle: opening.beatTitle })
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
