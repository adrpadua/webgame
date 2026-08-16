import { create } from 'zustand'

// UI-only onboarding state: whether the How to Play guide is open, whether
// the scripted first turn is still running, and which coach tips the player
// has dismissed. Deliberately separate from the workbench session store —
// none of this belongs on the Encounter timeline.

const GUIDE_SEEN_KEY = 'workbench.guideSeen'
const FIRST_TURN_KEY = 'workbench.firstTurnDone'

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === 'true'
  } catch {
    // Storage blocked (private browsing): treat every visit as a first
    // visit — showing the onboarding again beats never showing it.
    return false
  }
}

function writeFlag(key: string): void {
  try {
    window.localStorage.setItem(key, 'true')
  } catch {
    // Private browsing: onboarding simply runs again next visit.
  }
}

// Read by the workbench store at module load to pick the opening Encounter,
// so a returning player never lands back in the training Round.
export function hasFinishedFirstTurn(): boolean {
  return typeof window === 'undefined' || readFlag(FIRST_TURN_KEY)
}

interface OnboardingStore {
  guideOpen: boolean
  guideStep: number
  // The scripted first turn walks a new player through one whole Round:
  // prepare, charge, fire Quick, step out of the telegraph, fire Slow. It
  // runs once, and finishing or skipping it retires it for good.
  firstTurnActive: boolean
  // Tips already dismissed or completed this session; a dismissed tip never
  // returns, so coaching stays helpful instead of nagging.
  dismissedTips: string[]
  openGuide: () => void
  closeGuide: () => void
  setGuideStep: (step: number) => void
  finishFirstTurn: () => void
  dismissTip: (tipId: string) => void
}

export const useOnboarding = create<OnboardingStore>((set) => ({
  guideOpen: typeof window !== 'undefined' ? !readFlag(GUIDE_SEEN_KEY) : false,
  guideStep: 0,
  firstTurnActive: !hasFinishedFirstTurn(),
  dismissedTips: [],
  openGuide: () => set({ guideOpen: true, guideStep: 0 }),
  closeGuide: () => {
    writeFlag(GUIDE_SEEN_KEY)
    set({ guideOpen: false })
  },
  setGuideStep: (step) => set({ guideStep: step }),
  finishFirstTurn: () => {
    writeFlag(FIRST_TURN_KEY)
    set({ firstTurnActive: false })
  },
  dismissTip: (tipId) => set((store) => (store.dismissedTips.includes(tipId) ? store : { dismissedTips: [...store.dismissedTips, tipId] })),
}))
