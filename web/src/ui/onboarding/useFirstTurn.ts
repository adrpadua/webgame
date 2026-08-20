import { useCatalog } from '@/content/CatalogContext'
import { catalog } from '@/store/catalog'
import { useOnboarding } from '@/store/onboarding'
import { selectState, useWorkbench } from '@/store/workbench'
import { firstTurnStep, type FirstTurnStep } from './firstTurnScript'

// One reading of the scripted first turn for the whole play surface: the
// components that dim, highlight, and gate all ask the same question, so
// they can never disagree about which step is live.

// The imperative reading, for the board — Phaser draws outside React, so it
// has no context to read and takes the loaded catalog directly.
export function currentFirstTurnStep(): FirstTurnStep | null {
  if (!useOnboarding.getState().firstTurnActive) {
    return null
  }
  return firstTurnStep(catalog, selectState(useWorkbench.getState()))
}

export function useFirstTurnStep(): FirstTurnStep | null {
  const active = useOnboarding((store) => store.firstTurnActive)
  const state = useWorkbench(selectState)
  const catalog = useCatalog()
  return active ? firstTurnStep(catalog, state) : null
}
