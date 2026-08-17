import { useEffect, useRef } from 'react'
import { create } from 'zustand'

// Tap-and-hold detail popups (the mobile-game affordance): the HUD shows a
// name, a number, and a colour; the words that explain it live one press
// away. Any control can register a HoldDetail, and pressing it for a beat
// pops that detail next to the control until the finger lifts.
//
// A mouse gets the same detail by hovering, which is what a mouse is for —
// so press-and-hold is reserved for touch and pen, and a mouse click never
// has to be swallowed to protect a hold.
//
// The gesture also works from the keyboard: holding Enter or Space on a
// focused control repeats keydown, which opens the popup; releasing closes
// it. A quick press stays a plain tap, so nothing is hidden behind a hold.

export type HoldTone = 'neutral' | 'attack' | 'guard' | 'heal' | 'boss' | 'quick' | 'slow'

export interface HoldDetail {
  // Stable identity for the popup, used as the animation key and in tests.
  id: string
  title: string
  // A short right-aligned qualifier: window speed, track, "Boss beat".
  badge?: string
  tone?: HoldTone
  // The numbers that matter, one row each — never a sentence.
  stats?: { label: string; value: string }[]
  // Authored rules text, quoted as-is when there is any.
  text?: string
  tags?: string[]
  // One line on what to do with this, shown dimmed under everything else.
  hint?: string
}

interface Anchor {
  left: number
  top?: number
  bottom?: number
}

interface HoldPopoverStore {
  detail: HoldDetail | null
  anchor: Anchor | null
  show: (detail: HoldDetail, rect: DOMRect) => void
  hide: (detailId?: string) => void
}

const POPOVER_WIDTH = 260
const EDGE_GAP = 8
const ANCHOR_GAP = 10

// Anchors the popup to the pressed control: above it when there is room,
// below it otherwise, always clamped inside the viewport. Anchoring by the
// far edge means the popup never needs to be measured first.
function anchorFor(rect: DOMRect): Anchor {
  const left = Math.min(Math.max(rect.left + rect.width / 2 - POPOVER_WIDTH / 2, EDGE_GAP), window.innerWidth - POPOVER_WIDTH - EDGE_GAP)
  if (rect.top > window.innerHeight * 0.4) {
    return { left, bottom: window.innerHeight - rect.top + ANCHOR_GAP }
  }
  return { left, top: rect.bottom + ANCHOR_GAP }
}

const useHoldPopoverStore = create<HoldPopoverStore>((set, get) => ({
  detail: null,
  anchor: null,
  show: (detail, rect) => set({ detail, anchor: anchorFor(rect) }),
  // A hold that already lost its popup to another control must not close it.
  hide: (detailId) => {
    if (detailId === undefined || get().detail?.id === detailId) {
      set({ detail: null, anchor: null })
    }
  },
}))

const HOLD_DELAY_MS = 280
// A hover is a cheaper, more reversible gesture than a press, so it opens
// sooner.
const HOVER_DELAY_MS = 220

const TONE_CLASS: Record<HoldTone, string> = {
  neutral: 'border-zinc-500',
  attack: 'border-rose-500',
  guard: 'border-sky-500',
  heal: 'border-emerald-500',
  boss: 'border-amber-500',
  quick: 'border-emerald-500',
  slow: 'border-sky-500',
}

const BADGE_CLASS: Record<HoldTone, string> = {
  neutral: 'text-zinc-400',
  attack: 'text-rose-300',
  guard: 'text-sky-300',
  heal: 'text-emerald-300',
  boss: 'text-amber-300',
  quick: 'text-emerald-300',
  slow: 'text-sky-300',
}

export interface HoldHandlers {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void
  onPointerUp: () => void
  onPointerEnter: (event: React.PointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
  onPointerCancel: () => void
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
  onKeyUp: () => void
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void
}

export interface HoldBinding {
  holdProps: HoldHandlers
  // True exactly once after a press that opened the popup, so the control
  // can drop the click that press would otherwise produce. A hover never
  // sets it: a mouse click stays a click.
  consumeHold: () => boolean
}

export interface HoldOptions {
  // Set false where hover would fight a more specific target inside this
  // one — a container whose children carry their own details.
  hover?: boolean
}

// Binds one control to one detail. Pass null to leave the control inert.
export function useHold(detail: HoldDetail | null, options: HoldOptions = {}): HoldBinding {
  const hoverEnabled = options.hover ?? true
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const opened = useRef(false)
  const shownId = useRef<string | null>(null)
  shownId.current = detail?.id ?? null

  // A control can leave the tree mid-gesture — a card played out of Hand, a
  // beat chip retired by the next Round. No pointerup or leave will ever
  // arrive for it, so its popup would hang on screen with nothing left to
  // dismiss it. Unmounting closes its own popup and drops its pending timer.
  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current)
        timer.current = null
      }
      if (shownId.current !== null) {
        useHoldPopoverStore.getState().hide(shownId.current)
      }
    },
    [],
  )

  const begin = (rect: DOMRect, delayMs: number, consumesClick: boolean) => {
    if (detail === null) {
      return
    }
    if (timer.current !== null) {
      clearTimeout(timer.current)
    }
    timer.current = setTimeout(() => {
      if (consumesClick) {
        opened.current = true
      }
      useHoldPopoverStore.getState().show(detail, rect)
    }, delayMs)
  }

  const end = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (detail !== null) {
      useHoldPopoverStore.getState().hide(detail.id)
    }
  }

  return {
    holdProps: {
      // The rect is read synchronously: currentTarget is gone by the time
      // the timer fires.
      onPointerDown: (event) => {
        // A mouse already has hover; pressing must not swallow its click.
        if (event.pointerType !== 'mouse') {
          opened.current = false
          begin(event.currentTarget.getBoundingClientRect(), HOLD_DELAY_MS, true)
        }
      },
      onPointerUp: end,
      onPointerEnter: (event) => {
        if (hoverEnabled && event.pointerType === 'mouse') {
          begin(event.currentTarget.getBoundingClientRect(), HOVER_DELAY_MS, false)
        }
      },
      onPointerLeave: end,
      onPointerCancel: end,
      onKeyDown: (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && event.repeat && !opened.current) {
          begin(event.currentTarget.getBoundingClientRect(), HOLD_DELAY_MS, true)
        }
      },
      onKeyUp: end,
      // iOS/Android would otherwise raise the system menu over the popup.
      onContextMenu: (event) => event.preventDefault(),
    },
    consumeHold: () => {
      const held = opened.current
      opened.current = false
      return held
    },
  }
}

// The single popup surface. Rendered once on the play surface; it never
// takes pointer events, so the hold that opened it keeps its gesture.
export function HoldPopoverLayer() {
  const detail = useHoldPopoverStore((store) => store.detail)
  const anchor = useHoldPopoverStore((store) => store.anchor)
  if (detail === null || anchor === null) {
    return null
  }
  const tone = detail.tone ?? 'neutral'
  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{ left: anchor.left, top: anchor.top, bottom: anchor.bottom, width: POPOVER_WIDTH }}
      data-testid="hold-popover"
      data-hold-id={detail.id}
    >
      <div className={`wb-pop-in rounded-2xl border-2 bg-zinc-950/97 p-3 shadow-2xl ${TONE_CLASS[tone]}`}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-bold text-zinc-50">{detail.title}</span>
          {detail.badge !== undefined && (
            <span className={`shrink-0 text-[10px] font-semibold tracking-wide uppercase ${BADGE_CLASS[tone]}`}>{detail.badge}</span>
          )}
        </div>
        {detail.stats !== undefined && detail.stats.length > 0 && (
          <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {/* Rows are keyed by position: a label can legitimately repeat,
                since a Boss Program may run the same beat twice. */}
            {detail.stats.map((stat, index) => (
              <div key={index} className="contents">
                <span className="text-[11px] text-zinc-500">{stat.label}</span>
                <span className="text-right text-[11px] font-semibold text-zinc-100">{stat.value}</span>
              </div>
            ))}
          </div>
        )}
        {detail.text !== undefined && detail.text !== '' && <p className="mt-2 text-xs leading-relaxed text-zinc-200">{detail.text}</p>}
        {detail.tags !== undefined && detail.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {detail.tags.map((tag) => (
              <span key={tag} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400 uppercase">
                {tag}
              </span>
            ))}
          </div>
        )}
        {detail.hint !== undefined && <p className="mt-2 text-[10px] text-zinc-500">{detail.hint}</p>}
      </div>
    </div>
  )
}
