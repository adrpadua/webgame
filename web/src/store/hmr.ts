import { OPENING_ENCOUNTER_ID } from './sessionSlice'
import type { useWorkbench, WorkbenchStore } from './workbench'

// Keep the running Encounter alive across hot updates: rules and UI edits
// re-execute the store module, then re-adopt the previous session's timeline.
// Gesture state is deliberately not carried over — a half-finished drag across
// a reload is not a gesture, and the fresh slice already starts it cleared.

export function keepSessionAcrossHotUpdates(store: typeof useWorkbench): void {
  if (!import.meta.hot) {
    return
  }
  const saved = import.meta.hot.data.workbench as Partial<WorkbenchStore> | undefined
  if (saved?.entries && saved.entries.length > 0) {
    store.setState({
      entries: saved.entries,
      index: saved.index ?? saved.entries.length - 1,
      seed: saved.seed,
      encounterId: saved.encounterId ?? OPENING_ENCOUNTER_ID,
      activeScenarioId: saved.activeScenarioId ?? null,
    })
  }
  import.meta.hot.dispose((data) => {
    const { entries, index, seed, encounterId, activeScenarioId } = store.getState()
    data.workbench = { entries, index, seed, encounterId, activeScenarioId }
  })
  import.meta.hot.accept()
}
