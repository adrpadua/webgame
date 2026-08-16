import { create } from 'zustand'

// UI-only onboarding state: whether the How to Play guide is open and which
// coach tips the player has dismissed. Deliberately separate from the
// workbench session store — none of this belongs on the Encounter timeline.

const GUIDE_SEEN_KEY = 'workbench.guideSeen'

function hasSeenGuide(): boolean {
  try {
    return window.localStorage.getItem(GUIDE_SEEN_KEY) === 'true'
  } catch {
    // Storage blocked (private browsing): treat every visit as a first
    // visit — showing the guide again beats never showing it.
    return false
  }
}

function markGuideSeen(): void {
  try {
    window.localStorage.setItem(GUIDE_SEEN_KEY, 'true')
  } catch {
    // Private browsing: the guide simply reopens next visit.
  }
}

interface OnboardingStore {
  guideOpen: boolean
  guideStep: number
  // Tips already dismissed or completed this session; a dismissed tip never
  // returns, so coaching stays helpful instead of nagging.
  dismissedTips: string[]
  openGuide: () => void
  closeGuide: () => void
  setGuideStep: (step: number) => void
  dismissTip: (tipId: string) => void
}

export const useOnboarding = create<OnboardingStore>((set) => ({
  guideOpen: typeof window !== 'undefined' ? !hasSeenGuide() : false,
  guideStep: 0,
  dismissedTips: [],
  openGuide: () => set({ guideOpen: true, guideStep: 0 }),
  closeGuide: () => {
    markGuideSeen()
    set({ guideOpen: false })
  },
  setGuideStep: (step) => set({ guideStep: step }),
  dismissTip: (tipId) => set((store) => (store.dismissedTips.includes(tipId) ? store : { dismissedTips: [...store.dismissedTips, tipId] })),
}))
