import { useLayoutEffect, useRef } from 'react'

// The console changing hands, as motion (D-097).
//
// Switching control rewrites two frames at once: the ally the player tapped
// becomes the 208pt primary frame at the bottom edge, and the Hero who was
// there drops into the 138pt column. Both changes are correct the instant the
// store writes them, and that is the problem — the plates trade contents in
// one video frame, so the two readouts the player was reading are simply
// different readouts now, and nothing on screen says the object they were
// looking at moved.
//
// So the frames travel. Each one starts over the box it occupied a moment ago
// and arrives at the box it now owns, which makes the promoted frame grow from
// ally size into full size and the demoted one shrink into the column. It is
// the same claim the layout direction already makes in still pixels — 138 vs
// 208, the ragged right edge *is* the hierarchy — said in the one channel a
// still frame cannot use.
//
// This is FLIP, and the F is why the capture lives in the press handler rather
// than here: React batches the store write, so the DOM still holds the old
// layout until the handler returns. Measure there, invert here, play from the
// layout effect that runs once the new layout is committed.
//
// Every frame claims its own box by Hero id, not by seat. That is what makes
// one hook serve the promoted frame, the demoted frame, and — in a party
// bigger than two — the untouched ally whose slot index shifted underneath it
// because the column dropped a different name. The question each frame asks is
// the same one: where was I standing before this press?

export interface FrameBox {
  left: number
  top: number
  // Width alone, and no height: the two frame sizes are near enough to one
  // aspect ratio (208x58 against 138x40) that a single scale factor lands the
  // plate on its old box, and a non-uniform scale would stretch the name and
  // the health number away from the type they are set in.
  width: number
}

// Long enough for the eye to follow one plate from the column to the bottom
// edge, short enough that a player cycling seats with the rail is never
// waiting on it.
//
// Not `wb-beat-deal`'s curve, which is the only other one on the surface that
// moves a whole plate: it spends 45% of its travel in the first 11% of its
// duration, because a dealt card is an arrival and what matters is that it has
// landed. Here the travel *is* the message — the plate that grew is the plate
// the player tapped — so the curve is the standard position-and-size one,
// which eases out of the old box and into the new one and reads as the same
// object moving rather than as two plates blinking.
export const SWAP_DURATION_MS = 300
export const SWAP_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)'

// Under half a pixel of travel and a scale inside a thousandth of 1 is a frame
// that did not move. Playing an animation for it would cost a compositor layer
// and show nothing.
const NEGLIGIBLE_PX = 0.5
const NEGLIGIBLE_SCALE = 0.001

export function frameScale(from: FrameBox, to: FrameBox): number {
  return to.width > 0 ? from.width / to.width : 1
}

// FLIP's Invert: the transform that puts an element already laid out at `to`
// back over `from`. Paired with `transform-origin: top left`, because both
// frames are flush against the play surface's left edge — the corner they
// share is the corner to pivot on.
export function invertTransform(from: FrameBox, to: FrameBox): string {
  const scale = frameScale(from, to)
  return `translate(${round(from.left - to.left)}px, ${round(from.top - to.top)}px) scale(${round(scale, 4)})`
}

export function standingStill(from: FrameBox, to: FrameBox): boolean {
  return (
    Math.abs(from.left - to.left) < NEGLIGIBLE_PX &&
    Math.abs(from.top - to.top) < NEGLIGIBLE_PX &&
    Math.abs(frameScale(from, to) - 1) < NEGLIGIBLE_SCALE
  )
}

function round(value: number, places = 2): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

// --- The handoff -----------------------------------------------------------
// One press writes this, one commit's worth of layout effects reads it empty
// again. It is deliberately not store state: it is a measurement of pixels
// that existed for one frame, it never survives a render, and nothing about
// the Encounter can be answered from it.

let pending: Map<string, FrameBox> = new Map()

export function recordFrameBoxes(boxes: Iterable<readonly [string, FrameBox]>): void {
  pending = new Map(boxes)
}

// Read once and take it: a box handed to the frame that claimed it must not be
// handed to anything else, and the last claim leaves the map empty rather than
// leaving pixels behind for a later render to animate from.
export function claimFrameBox(heroId: string): FrameBox | null {
  const box = pending.get(heroId)
  if (box === undefined) {
    return null
  }
  pending.delete(heroId)
  return box
}

export function forgetFrameBoxes(): void {
  pending = new Map()
}

// --- The browser half ------------------------------------------------------

export function readFrameBox(element: Element | null | undefined): FrameBox | null {
  if (!element) {
    return null
  }
  const rect = element.getBoundingClientRect()
  if (rect.width === 0) {
    return null
  }
  return { left: rect.left, top: rect.top, width: rect.width }
}

// Called from the press that is about to switch control, before the store is
// written. Both frame kinds carry `data-hero-id`, so who is standing where is
// read off the DOM rather than re-derived from the party list — the boxes and
// the names can never disagree about a layout this function did not compute.
export function captureFrameBoxes(): void {
  const boxes: [string, FrameBox][] = []
  for (const element of document.querySelectorAll('[data-testid="hero-frame"], [data-testid="ally-frame"]')) {
    const heroId = element.getAttribute('data-hero-id') ?? ''
    const box = readFrameBox(element)
    if (heroId !== '' && box !== null) {
      boxes.push([heroId, box])
    }
  }
  recordFrameBoxes(boxes)
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// The ref every frame binds to its own plate. `pilotId` is in the dependency
// list and `heroId` is not enough on its own: the frame that merely changed
// slot index is still showing the same Hero, and it has to travel too.
export function useSwapFlip<T extends HTMLElement>(heroId: string, pilotId: string) {
  const element = useRef<T | null>(null)
  // Ours, and only ours: cancelling by `getAnimations()` would take the
  // plate's own `wb-pop-in` with it. The cleanup is what cancels, which puts
  // it before the next effect body rather than inside it — a running transform
  // is inside `getBoundingClientRect`, so a second switch mid-flight would
  // otherwise invert onto a box that never existed. It also covers the plate
  // leaving the tree, where an animation on a detached element would keep its
  // hold on the compositor to the end of its duration.
  const flight = useRef<Animation | null>(null)
  useLayoutEffect(() => {
    const plate = element.current
    if (plate === null) {
      return
    }
    const from = claimFrameBox(heroId)
    if (from === null || typeof plate.animate !== 'function') {
      return
    }
    const to = readFrameBox(plate)
    // Reduced motion is checked after the claim, never instead of it: the box
    // still has to come off the map, or it waits there for a later render that
    // has no business animating from it.
    if (to === null || standingStill(from, to) || prefersReducedMotion()) {
      return
    }
    flight.current = plate.animate(
      [
        { transformOrigin: 'top left', transform: invertTransform(from, to) },
        { transformOrigin: 'top left', transform: 'translate(0px, 0px) scale(1)' },
      ],
      { duration: SWAP_DURATION_MS, easing: SWAP_EASING },
    )
    return () => {
      flight.current?.cancel()
      flight.current = null
    }
  }, [heroId, pilotId])
  return element
}
