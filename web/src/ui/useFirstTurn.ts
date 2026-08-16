import { useOnboarding } from '@/store/onboarding'
import { selectState, useWorkbench } from '@/store/workbench'
import { firstTurnStep, type FirstTurnStep } from './firstTurnScript'

// One reading of the scripted first turn for the whole play surface: the
// components that dim, highlight, and gate all ask the same question, so
// they can never disagree about which step is live.

export function currentFirstTurnStep(): FirstTurnStep | null {
  if (!useOnboarding.getState().firstTurnActive) {
    return null
  }
  const store = useWorkbench.getState()
  return firstTurnStep(store.catalog, selectState(store))
}

export function useFirstTurnStep(): FirstTurnStep | null {
  const active = useOnboarding((store) => store.firstTurnActive)
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  return active ? firstTurnStep(catalog, state) : null
}
