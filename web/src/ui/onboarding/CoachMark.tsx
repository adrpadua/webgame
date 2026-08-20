import { useCatalog } from '@/content/CatalogContext'
import { useEffect, useRef } from 'react'
import { cardChargeCap, type EncounterState } from '@/engine'
import { useOnboarding } from '@/store/onboarding'
import { selectState, useWorkbench, type WorkbenchCatalog } from '@/store/workbench'
import { BootIcon, HexIcon, ShieldIcon, SwordIcon } from '../common/icons'
import { useHold, type HoldDetail } from '../common/HoldPopover'
import { Notify } from '../overlays/NotificationLayer'
import { slotCanFire } from '../actionBar/slots'
import { FOCUS_RING_CLASS } from '../common/theme'

// Non-blocking coaching for a player past the scripted first turn: one
// four-word cue at a time, derived from the live Encounter state, with the
// explanation behind a hold. A tip disappears for good once the player does
// the thing or dismisses it — coaching, not nagging.

interface Tip {
  id: string
  icon: typeof SwordIcon
  tone: string
  cue: string
  detail: HoldDetail
}

function tip(id: string, icon: typeof SwordIcon, tone: string, cue: string, title: string, text: string): Tip {
  return { id, icon, tone, cue, detail: { id: `tip:${id}`, title, tone: 'neutral', text } }
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
  const fireable = hero.actionBar.some((slot) => slotCanFire(catalog, state, slot))
  const chargeable = hero.actionBar.some(
    (slot) => slot.topCard !== null && slot.activatedWindow === null && slot.charges.length < cardChargeCap(catalog.cards[slot.topCard.cardId]),
  )

  if (state.phase === 'loadout' && loadedSlots.length === 0 && hero.hand.length > 0) {
    return tip(
      'prepare',
      ShieldIcon,
      'border-gold-700 bg-gold-950/80 text-gold-100',
      'Fill a Slot',
      'Prepare a Slot',
      'Drag a card from your Hand onto an empty Slot, or tap the card and then the Slot.',
    )
  }
  if (state.phase === 'loadout' && loadedSlots.length > 0) {
    return tip(
      'loadout-next',
      BootIcon,
      'border-gold-700 bg-gold-950/80 text-gold-100',
      'Slots set — press Next',
      'Loadout done',
      'Embermaw acts first. Each of its beats is dealt as a card above the Action Bar — read it, then resolve it.',
    )
  }
  if (state.phase === 'instant' || state.phase === 'incoming') {
    return tip(
      'boss-beat',
      SwordIcon,
      'wb-face-steel wb-acc-ember text-coral-100',
      "Embermaw's beat",
      'The Boss acts',
      'The beats resolve one at a time. Each card names what it does and what answers it; Next moves on once they land.',
    )
  }
  if (fireable) {
    return tip(
      'fire',
      SwordIcon,
      'border-gold-700 bg-gold-950/80 text-gold-100',
      'Fire the glowing Slot',
      'A Slot matches this window',
      'Tap the Slot to resolve its Top Card together with everything charged under it.',
    )
  }
  if ((state.phase === 'quick' || state.phase === 'slow') && hero.hand.length > 0 && chargeable) {
    return tip(
      'charge',
      HexIcon,
      'border-gold-700 bg-gold-950/80 text-gold-100',
      'Charge a Slot, or move',
      'Your window',
      'Drop a hand card on a loaded Slot to add Charge, or on a nearby hex to step there for 1 Stamina.',
    )
  }
  return null
}

export function CoachMark() {
  const state = useWorkbench(selectState)
  const catalog = useCatalog()
  const dismissedTips = useOnboarding((store) => store.dismissedTips)
  const dismissTip = useOnboarding((store) => store.dismissTip)
  const guideOpen = useOnboarding((store) => store.guideOpen)
  // The scripted first turn owns this row while it runs.
  const firstTurnActive = useOnboarding((store) => store.firstTurnActive)

  const tipNow = currentTip(catalog, state)
  const visibleTip = tipNow !== null && !dismissedTips.includes(tipNow.id) ? tipNow : null
  const hold = useHold(visibleTip?.detail ?? null)

  // Once a shown tip's moment passes (the player did the thing, or the phase
  // moved on), retire it so it never repeats in later rounds. While the
  // guide occludes the bar nothing is truly shown, so retirement pauses —
  // a tip must never be spent without ever being displayed.
  const lastShownId = useRef<string | null>(null)
  useEffect(() => {
    if (guideOpen || firstTurnActive) {
      return
    }
    const shownId = visibleTip?.id ?? null
    if (lastShownId.current !== null && lastShownId.current !== shownId) {
      dismissTip(lastShownId.current)
    }
    lastShownId.current = shownId
  }, [visibleTip?.id, guideOpen, firstTurnActive, dismissTip])

  if (visibleTip === null || guideOpen || firstTurnActive) {
    return null
  }
  const Icon = visibleTip.icon
  // The guidance zone's second rank, and in practice its only occupant: the
  // scripted cue above it suppresses tips outright rather than stacking with
  // them, so the zone speaks once at a time.
  return (
    <Notify id="coach-tip">
      <div data-testid="coach-mark" data-tip={visibleTip.id}>
        <div {...hold.holdProps} className={`wb-slide-up wb-plate wb-plate-sm wb-face-steel wb-acc-gold pointer-events-auto flex items-center gap-2 py-1.5 ${visibleTip.tone}`}>
          <Icon className="h-4 w-4 shrink-0 opacity-80" />
          <p className="flex-1 text-xs font-semibold">{visibleTip.cue}</p>
          <button
            type="button"
            data-testid="coach-dismiss"
            aria-label="Dismiss tip"
            onClick={() => dismissTip(visibleTip.id)}
            className={`min-h-11 min-w-11 shrink-0 px-2 text-[10px] font-bold tracking-wide uppercase transition hover:scale-110 ${FOCUS_RING_CLASS}`}
          >
            Got it
          </button>
        </div>
      </div>
    </Notify>
  )
}
