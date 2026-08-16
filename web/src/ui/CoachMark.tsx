import { useEffect, useRef } from 'react'
import { cardChargeCap, cardWindowSpeed, type EncounterState } from '@/engine'
import { useOnboarding } from '@/store/onboarding'
import { selectState, useWorkbench, type WorkbenchCatalog } from '@/store/workbench'
import { BootIcon, HexIcon, ShieldIcon, SwordIcon } from './icons'
import { FOCUS_RING_CLASS } from './theme'

// Non-blocking coaching: one slim prompt at a time, derived entirely from
// the live Encounter state, suggesting the next useful action to a new
// player. A tip disappears for good once the player either does the thing
// (its condition stops matching) or dismisses it — coaching, not nagging.

interface Tip {
  id: string
  icon: typeof SwordIcon
  tone: string
  text: string
}

function currentTip(catalog: WorkbenchCatalog, state: EncounterState): Tip | null {
  if (!state.active) {
    return null
  }
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return null
  }
  const loadedSlots = hero.actionBar.filter((slot) => slot.topCard !== null)
  const fireable = hero.actionBar.some((slot) => {
    if (slot.topCard === null || slot.charges.length === 0 || slot.activatedWindow !== null) {
      return false
    }
    return cardWindowSpeed(catalog.cards[slot.topCard.cardId]) === state.phase
  })
  const chargeable = hero.actionBar.some(
    (slot) => slot.topCard !== null && slot.activatedWindow === null && slot.charges.length < cardChargeCap(catalog.cards[slot.topCard.cardId]),
  )

  if (state.phase === 'loadout' && loadedSlots.length === 0 && hero.hand.length > 0) {
    return {
      id: 'prepare',
      icon: ShieldIcon,
      tone: 'border-emerald-700 bg-emerald-950/80 text-emerald-100',
      text: 'Loadout: drag a card from your hand onto an empty Slot to prepare it — or tap the card, then tap the Slot.',
    }
  }
  if (state.phase === 'loadout' && loadedSlots.length > 0) {
    return {
      id: 'loadout-next',
      icon: BootIcon,
      tone: 'border-emerald-700 bg-emerald-950/80 text-emerald-100',
      text: 'Slots ready. Press Next to start the round — the boss acts first, so watch the strip up top.',
    }
  }
  if (state.phase === 'instant' || state.phase === 'incoming') {
    return {
      id: 'boss-beat',
      icon: SwordIcon,
      tone: 'border-amber-700 bg-amber-950/80 text-amber-100',
      text: "The boss's beat: the amber strip up top shows what it does. Press Next to resolve it and continue.",
    }
  }
  if (fireable) {
    return {
      id: 'fire',
      icon: SwordIcon,
      tone: 'border-emerald-700 bg-emerald-950/80 text-emerald-100',
      text: 'A Slot is glowing — its card matches this window. Tap the Slot to fire it.',
    }
  }
  if ((state.phase === 'quick' || state.phase === 'slow') && hero.hand.length > 0 && chargeable) {
    return {
      id: 'charge',
      icon: HexIcon,
      tone: 'border-sky-700 bg-sky-950/80 text-sky-100',
      text: 'Your window: drop a hand card onto a loaded Slot to add Charge, or drop it on a nearby hex to move there.',
    }
  }
  return null
}

export function CoachMark() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const dismissedTips = useOnboarding((store) => store.dismissedTips)
  const dismissTip = useOnboarding((store) => store.dismissTip)
  const guideOpen = useOnboarding((store) => store.guideOpen)

  const tip = currentTip(catalog, state)
  const visibleTip = tip !== null && !dismissedTips.includes(tip.id) ? tip : null

  // Once a shown tip's moment passes (the player did the thing, or the phase
  // moved on), retire it so it never repeats in later rounds.
  const lastShownId = useRef<string | null>(null)
  useEffect(() => {
    const shownId = visibleTip?.id ?? null
    if (lastShownId.current !== null && lastShownId.current !== shownId) {
      dismissTip(lastShownId.current)
    }
    lastShownId.current = shownId
  }, [visibleTip?.id, dismissTip])

  if (visibleTip === null || guideOpen) {
    return null
  }
  const Icon = visibleTip.icon
  return (
    <div className="border-t border-zinc-800 bg-zinc-950/80 px-3 py-1.5" data-testid="coach-mark" data-tip={visibleTip.id}>
      <div className={`wb-slide-up flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${visibleTip.tone}`}>
        <Icon className="h-4 w-4 shrink-0 opacity-80" />
        <p className="flex-1 text-[11px] leading-snug">{visibleTip.text}</p>
        <button
          type="button"
          data-testid="coach-dismiss"
          aria-label="Dismiss tip"
          onClick={() => dismissTip(visibleTip.id)}
          className={`min-h-11 shrink-0 rounded-md px-2 text-[10px] font-bold tracking-wide uppercase opacity-70 transition hover:opacity-100 ${FOCUS_RING_CLASS}`}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
