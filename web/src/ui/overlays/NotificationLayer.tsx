import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { NOTIFICATION_RULES, resolveZone, stackOrder, type NotificationId, type NotificationZone } from './notifications'

// The geometry behind `notifications.ts`. One column over the board, split
// into four zones that are flex siblings — so "these two never overlap" is
// enforced by the layout engine rather than by a pair of offsets that happen
// to disagree. The board itself never resizes when a zone fills or empties:
// the whole column floats, which is the overlay contract the interface
// direction asks for (docs/content/oathcraft-interface-direction.md).
//
// The bottom padding is 4px rather than the 8px the other edges carry: the
// dock hugs the Action Bar, and a prompt about the controls one row down
// should sit against them rather than float above them.

// `empty:hidden` on the two top zones: the column gaps its children, and a
// zone with nothing in it still earns one, so a silent herald would push the
// guidance row 6px down the board for the whole Encounter. Display-none takes
// it out of the flex flow instead. Only the top pair carries it — `stage` is
// the flex-1 that holds the column open, and hiding it when no banner is up
// would leave `justify-between` a single child to align, which it puts at the
// top: the dock would jump off the Action Bar.
const ZONE_CLASS: Record<NotificationZone, string> = {
  // The board's top edge, above everything: the Boss's card is dealt here, and
  // nothing the player may ignore gets to push it down the screen.
  herald: 'flex shrink-0 flex-col gap-1.5 empty:hidden',
  // Top down, under the herald.
  guidance: 'flex shrink-0 flex-col gap-1.5 empty:hidden',
  // Whatever height the others leave, with the announcement centred in it.
  stage: 'flex min-h-0 flex-1 flex-col justify-center gap-1.5',
  // Bottom up from the Action Bar. `flex-col-reverse` is what makes rank 1
  // the member hugging the bar.
  dock: 'flex shrink-0 flex-col-reverse gap-1.5',
}

interface LayerValue {
  live: ReadonlySet<NotificationId>
  register: (id: NotificationId) => () => void
}

const LayerContext = createContext<LayerValue | null>(null)
const ZoneContext = createContext<NotificationZone | null>(null)

// `clearanceClass` is the bottom padding the column keeps clear. The default
// hugs the Action Bar; a play surface with a persistent Hero Frame (D-065)
// passes the frame's clearance instead, so the dock's rank 1 stacks from the
// frame's top edge — the frame is the dock's floor, not a dock member.
export function NotificationLayer({ children, clearanceClass = 'pb-1' }: { children: ReactNode; clearanceClass?: string }) {
  const [live, setLive] = useState<ReadonlySet<NotificationId>>(() => new Set())
  const register = useCallback((id: NotificationId) => {
    setLive((previous) => {
      if (previous.has(id)) {
        return previous
      }
      const next = new Set(previous)
      next.add(id)
      return next
    })
    return () =>
      setLive((previous) => {
        if (!previous.has(id)) {
          return previous
        }
        const next = new Set(previous)
        next.delete(id)
        return next
      })
  }, [])
  const value = useMemo(() => ({ live, register }), [live, register])
  return (
    <LayerContext.Provider value={value}>
      <div
        className={`pointer-events-none absolute inset-0 z-20 flex flex-col justify-between gap-1.5 px-2 pt-2 ${clearanceClass}`}
        data-testid="notification-layer"
      >
        {children}
      </div>
    </LayerContext.Provider>
  )
}

export function NotificationZone({ zone, children }: { zone: NotificationZone; children: ReactNode }) {
  return (
    <ZoneContext.Provider value={zone}>
      <div className={ZONE_CLASS[zone]} data-testid={`notification-zone-${zone}`} data-zone={zone}>
        {children}
      </div>
    </ZoneContext.Provider>
  )
}

// A notification's own wrapper. Mount it only when the notification has
// something to say — presence here *is* the claim on the zone, which is why
// each component still decides its own silence and returns `null` for it.
export function Notify({ id, children }: { id: NotificationId; children: ReactNode }) {
  const layer = useContext(LayerContext)
  const renderedZone = useContext(ZoneContext)
  const rule = NOTIFICATION_RULES[id]
  const register = layer?.register

  useEffect(() => register?.(id), [register, id])

  useEffect(() => {
    if (import.meta.env.DEV && renderedZone !== null && renderedZone !== rule.zone) {
      console.warn(`Notification "${id}" is a ${rule.zone} member but was rendered inside the ${renderedZone} zone.`)
    }
  }, [id, renderedZone, rule.zone])

  // Over capacity, the ranks farthest from the anchor yield. They are hidden
  // rather than unmounted on purpose: unmounting would drop them out of the
  // live set, which would free the capacity that suppressed them, which would
  // mount them again — a loop. Hidden, they hold their claim and stay quiet.
  // Before the registering effect has run the member is unknown to the layer,
  // and an unknown member shows: a one-frame blink is worse than a one-frame
  // overfull zone.
  const suppressed = layer !== null && layer.live.has(id) && !resolveZone(rule.zone, layer.live).includes(id)

  return (
    <div data-notification={id} data-zone={rule.zone} hidden={suppressed} style={{ order: stackOrder(id) }}>
      {children}
    </div>
  )
}
