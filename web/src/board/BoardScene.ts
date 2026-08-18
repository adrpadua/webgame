import Phaser from 'phaser'
import { facingName, hexKey, parseHexKey, type Axial, type EncounterState } from '@/engine'
import { axialToPixel, hexCorners, pixelToAxial, BOARD_CENTER_X, BOARD_CENTER_Y, BOARD_HEIGHT, BOARD_WIDTH, HEX_SIZE } from './layout'
import { BACKDROP_DEPTH, BACKDROPS, backdropFor } from './backdrop'
import { freeFloaterLane, type BoardEffect, type EffectTone } from './effects'
import { idleBobOffset } from './ambience'
import { boardPalette, toneColors } from './palette'
import { idleStep, spriteFrame, SHEETS, type SheetSpec } from './sheets'

// The board is three layers: tiles and their tints, then the pieces, then the
// text that has to be read over both. Phaser falls back to creation order
// within a depth, and the graphics layer is built once while labels are
// rebuilt per frame, so the pieces need saying explicitly.
const SPRITE_DEPTH = 1
const LABEL_DEPTH = 2

// The board snapshot the scene renders. Phaser owns no game state: it draws
// what it is handed and reports hex-level intents upward (ADR 0019).
export interface BoardSnapshot {
  state: EncounterState
  // Rules-derived target centers and the burst footprint for the center
  // currently under the pointer. The scene paints these but never decides
  // which hexes an action may name (ADR 0019).
  targetableHexKeys: string[]
  targetPreviewHexKeys: string[]
  targetPreviewCenterKey: string | null
  legalMoveKeys: string[]
  // Hexes the scripted first turn is pointing the player at.
  guidedMoveKeys: string[]
  // The hex a dragged move is waiting to be paid for, if any. The player is
  // looking at their Hand to choose the card; the board holds the hex they
  // chose so the two halves of the gesture stay one sentence.
  pendingMoveKey: string | null
  showCoordinates: boolean
  // What the playout's unplayed moments will show. The snapshot state is
  // the batch's final one, so until those moments fire the board holds
  // back: these hazards stay undrawn, these pieces stay unseen, and these
  // pieces keep their old facing.
  pendingScorchKeys: string[]
  pendingSpawnIds: string[]
  pendingFacings: Record<string, number>
}

export interface BoardSceneCallbacks {
  onHexClicked: (coords: Axial) => void
  // Pressing and holding the Hero previews legal routes; release ends it.
  onHeroPressChange: (pressed: boolean) => void
  // A press that began on the Hero and released on another hex: the third
  // way to ask for a move, beside dragging a hand card and the tap path.
  // The scene reports the destination only — what a move costs is a rules
  // question, and the board asks none of them (ADR 0019).
  onHeroDraggedTo: (destination: Axial) => void
}

// The board's colour language runs on two axes.
//
// Temperature carries meaning: warm is threat, cool is the player and the
// ground they stand on. Nothing safe is warm and nothing dangerous is cool,
// so a glance at the board's temperature is a read on where the danger is.
//
// Saturation carries urgency, ranked by imminence within each temperature:
// the beat resolving now outranks a telegraphed beat, which outranks the Boss,
// then a Minion, then ground already scorched. Cool runs legal destinations,
// then the Hero, then the ground. Newest and most dangerous conflict all the
// time; imminence subsumes both.
//
// Objects take their MATERIAL. Hex tints take their TEMPERATURE. A tint is
// information about a hex, not a thing made of runeglass, so it says whose it
// is: warm is their beat, cool is your move. Every value here names one or
// the other, per docs/content/oathcraft-board-direction.md.
//
// Every value the board paints comes from the palette module, which reads the
// same tokens the chrome wears. Boss and Minion are one material, ember coral:
// a Whelp is a piece of the furnace, and a hue of its own would say otherwise.
// They part by saturation and size, and scorched ground is that material with
// the heat gone. See palette.ts for why each step is the step it is.
const {
  tileFill: TILE_FILL,
  tileStroke: TILE_STROKE,
  heroFill: HERO_FILL,
  moveOverlay: MOVE_OVERLAY,
  coneOverlay: CONE_OVERLAY,
  spawnOverlay: SPAWN_OVERLAY,
  bossFill: BOSS_FILL,
  minionFill: MINION_FILL,
  scorchedFill: SCORCHED_FILL,
  guidedStroke: GUIDED_STROKE,
  targetStroke: TARGET_STROKE,
} = boardPalette()

// One light direction for the whole board, from the upper left. Every piece
// shades and rims against it, and the drop shadow falls the opposite way, so
// the board reads as one lit scene rather than a set of flat tokens.
const LIGHT_ANGLE = (-3 * Math.PI) / 4
const LIGHT_DX = Math.cos(LIGHT_ANGLE)
const LIGHT_DY = Math.sin(LIGHT_ANGLE)
// The lit tone covers most of the piece and touches its rim on the lit side:
// offset plus radius comes to exactly 1, leaving the shadow tone showing as a
// crescent on the far side.
const PIECE_LIT_OFFSET = 0.15
const PIECE_LIT_RADIUS = 0.85
const PIECE_SHADOW_SHADE = 0.55
// Two arcs with two jobs. The highlight sits on the lit side and says where
// the light is; the rim sits opposite, on the lower right, and lifts a dark
// piece off a dark tile. A faint full ring would separate equally in every
// direction and flatten the light it sits inside, so it is deliberately not
// used for that.
const HIGHLIGHT_SPAN = (Math.PI * 2) / 3
const RIM_ANGLE = LIGHT_ANGLE + Math.PI
const RIM_SPAN = Math.PI / 2

// The backdrop is square art covering a board that is not, so it is sized by
// the board's longer side and overhangs the shorter one.
const BACKDROP_COVER = Math.max(BOARD_WIDTH, BOARD_HEIGHT)

// How far a tile's darker skirt drops below its face.
const TILE_DEPTH = 6
const TILE_SKIRT_SHADE = 0.45
// Range of the per-hex value jitter, centred on 1.
const TILE_JITTER = 0.12

const TONE_COLOR: Record<EffectTone, number> = toneColors()

const TONE_TEXT: Record<EffectTone, string> = {
  hero: '#f6c9be',
  boss: '#f6c9be',
  guard: '#a6e6f0',
  heal: '#f2f5f9',
  hazard: '#f3c8ad',
}

// Vertical spacing between stacked floaters at one hex. A label is 15px
// bold; 18 clears the line below at any point in both labels' rise.
const FLOATER_LANE_PX = 18

// How long each beat of feedback stays on the board. Short enough that a
// player tapping quickly is never waiting on the animation, long enough to
// be read: nothing here gates input. The longest entry (blast) is mirrored
// by EFFECT_SETTLE_MS in effects.ts — change them together.
const EFFECT_DURATION: Record<BoardEffect['kind'], number> = {
  strike: 320,
  hit: 420,
  block: 420,
  cast: 520,
  move: 280,
  spawn: 460,
  defeat: 460,
  blast: 560,
  scorch: 320,
  turn: 480,
}

// An effect whose `delay` has not elapsed yet holds negative `elapsed` and
// stays invisible; `started` flips once, the moment it crosses zero.
interface ActiveEffect extends BoardEffect {
  // Which vertical lane this effect's floater rises in, 0 being the lowest.
  // Assigned at ingest so two labels at the same hex never share a lane —
  // however fast the playout is advanced — and never recomputed.
  lane: number
  elapsed: number
  duration: number
  started: boolean
}

interface Motion {
  dx: number
  dy: number
  scale: number
  flash: number
  flashColor: number
}

const NO_MOTION: Motion = { dx: 0, dy: 0, scale: 1, flash: 0, flashColor: 0 }

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

// Scales a 0xRRGGBB colour's channels toward black (factor < 1) or white
// (factor > 1), so one authored colour yields its own shadow and highlight
// instead of needing a second constant per tone.
function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor))
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor))
  const b = Math.min(255, Math.round((color & 0xff) * factor))
  return (r << 16) | (g << 8) | b
}

// A stable pseudo-random value in [0, 1) for a hex. The same hex always lands
// on the same shade, so the floor holds still between frames.
function tileJitter(coords: Axial): number {
  const h = Math.sin(coords.q * 127.1 + coords.r * 311.7) * 43758.5453
  return h - Math.floor(h)
}

export class BoardScene extends Phaser.Scene {
  private snapshot: BoardSnapshot | null = null
  private graphicsLayer: Phaser.GameObjects.Graphics | null = null
  private backdrop: Phaser.GameObjects.Image | null = null
  private labels: Phaser.GameObjects.Text[] = []
  // What the live labels were built from. Board Ambience redraws the board
  // every frame, and every Phaser Text rasterises its own texture, so
  // rebuilding labels at that rate would churn textures for nothing: ambience
  // moves piece bodies and sheet frames, never their labels. These two let an
  // idle frame keep the labels it already has, while a snapshot change or a
  // live effect still rebuilds them.
  private labelsSnapshot: BoardSnapshot | null = null
  private labelsHaveEffects = false
  private active: ActiveEffect[] = []
  private readonly sprites = new Map<string, Phaser.GameObjects.Sprite>()
  // Where a live press on the Hero began, or null when no press is in flight.
  private heroPressOrigin: Axial | null = null
  private readonly callbacks: BoardSceneCallbacks
  private readonly reducedMotion: boolean

  constructor(callbacks: BoardSceneCallbacks) {
    super({ key: 'board' })
    this.callbacks = callbacks
    this.reducedMotion = typeof window !== 'undefined' && window.matchMedia !== undefined && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  preload(): void {
    for (const sheet of Object.values(SHEETS)) {
      this.load.spritesheet(sheet.key, sheet.url, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight })
    }
    for (const backdrop of BACKDROPS) {
      this.load.image(backdrop.key, backdrop.url)
    }
  }

  create(): void {
    this.placeBackdrop()
    this.graphicsLayer = this.add.graphics()
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const coords = pixelToAxial(pointer.x, pointer.y)
      const heroCoords = this.snapshot ? this.snapshot.state.board.entities[this.snapshot.state.primaryHeroId]?.coords : undefined
      if (heroCoords && heroCoords.q === coords.q && heroCoords.r === coords.r) {
        // A press on the Hero is not yet a tap: it becomes one on release at
        // the same hex, and a move on release anywhere else. Reporting the
        // tap here instead would open the Hero's Stat Panel under the
        // player's own finger the moment a drag started.
        this.heroPressOrigin = coords
        this.callbacks.onHeroPressChange(true)
        return
      }
      this.callbacks.onHexClicked(coords)
    })
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.endHeroPress(pixelToAxial(pointer.x, pointer.y)))
    // Released off the canvas — over the HUD, or off the page entirely. The
    // gesture is abandoned, never resolved against whatever hex the pointer
    // was last over.
    this.input.on('pointerupoutside', () => this.endHeroPress(null))
    this.input.on('gameout', () => {
      this.endHeroPress(null)
    })
    this.renderSnapshot()
  }

  // The arena, drawn once and then only ever re-textured. It is square art
  // scaled to cover the board rather than to fit it, so the ring of
  // containment rigs it is composed around stays concentric with the hex grid
  // at any board size; the overhang is clipped by the canvas.
  private placeBackdrop(): void {
    const first = BACKDROPS[0]
    if (!this.textures.exists(first.key)) {
      return
    }
    this.backdrop = this.add
      .image(BOARD_CENTER_X, BOARD_CENTER_Y, first.key)
      .setDisplaySize(BACKDROP_COVER, BACKDROP_COVER)
      .setDepth(BACKDROP_DEPTH)
  }

  // Ends a press that began on the Hero. A release on the Hero's own hex is
  // the tap it always was; a release on another hex asks to move there.
  private endHeroPress(released: Axial | null): void {
    const origin = this.heroPressOrigin
    this.heroPressOrigin = null
    this.callbacks.onHeroPressChange(false)
    if (origin === null || released === null) {
      return
    }
    if (released.q === origin.q && released.r === origin.r) {
      this.callbacks.onHexClicked(released)
      return
    }
    this.callbacks.onHeroDraggedTo(released)
  }

  updateSnapshot(snapshot: BoardSnapshot): void {
    this.snapshot = snapshot
    this.renderSnapshot()
  }

  // Queues one resolved batch of feedback. Effects within one moment overlap
  // freely — a strike and the hit it caused are meant to read as one blow —
  // while a `delay` holds an effect back so a batch of Boss Beats replays
  // one beat at a time.
  playEffects(effects: BoardEffect[]): void {
    // A new batch fast-forwards any stagger still pending from the last one:
    // two batches never interleave their playout.
    for (const effect of this.active) {
      if (effect.elapsed < 0) {
        effect.elapsed = 0
      }
    }
    for (const effect of effects) {
      // A labelled effect takes the lowest lane not held by another live
      // label at its hex. Beats that resolve at the Boss in quick succession
      // — Turn to the Tank, Raking Claw, Ash Trail — each spawn a title at
      // the same point, and left to a single lane they overprint into one
      // unreadable word. Stacking them keeps each readable and keeps the
      // order legible: the older beat is lower, the newer above it.
      const lane = effect.label === undefined ? 0 : freeFloaterLane(this.active, effect.at)
      this.active.push({ ...effect, lane, elapsed: -(effect.delay ?? 0), duration: EFFECT_DURATION[effect.kind], started: false })
    }
    this.startDueEffects()
    this.renderSnapshot()
  }

  // One-shot feedback (the hit's camera shake) fires when the effect's
  // moment arrives, not when its batch was queued.
  private startDueEffects(): void {
    for (const effect of this.active) {
      if (effect.started || effect.elapsed < 0) {
        continue
      }
      effect.started = true
      if (effect.kind === 'hit' && !this.reducedMotion) {
        this.cameras.main.shake(140, effect.tone === 'boss' ? 0.007 : 0.004)
      }
    }
  }

  // Effects advance on the scene clock; every frame with live feedback
  // redraws the board from the same snapshot plus the effect timeline.
  update(_time: number, delta: number): void {
    if (this.active.length > 0) {
      for (const effect of this.active) {
        effect.elapsed += delta
      }
      this.startDueEffects()
      this.active = this.active.filter((effect) => effect.elapsed < effect.duration)
      this.renderSnapshot()
      return
    }
    // A board with no feedback playing is still not a still image: pieces
    // breathe and the scripted turn's destination pulses. Under reduced
    // motion neither runs, and the board genuinely rests.
    if (!this.reducedMotion && this.snapshot !== null) {
      this.renderSnapshot()
    }
  }

  // The piece's offset in its idle cycle right now, which only a piece that
  // flies has: see ambience.ts. Zero as well under reduced motion, and zero
  // while any effect owns the piece — a bob layered onto a strike or a move
  // slide reads as a wobble, not a breath.
  private idleBob(entity: { id: string; kind: string }): number {
    if (this.reducedMotion || this.active.some((effect) => effect.entityId === entity.id && effect.elapsed >= 0)) {
      return 0
    }
    return idleBobOffset(entity.kind, entity.id, this.time.now)
  }

  // --- Effect readouts -------------------------------------------------
  // Motion is accumulated per piece so overlapping effects add up instead
  // of fighting over one slot.
  private motionFor(entityId: string): Motion {
    if (this.active.length === 0) {
      return NO_MOTION
    }
    const motion: Motion = { ...NO_MOTION }
    for (const effect of this.active) {
      if (effect.entityId !== entityId || effect.elapsed < 0) {
        continue
      }
      const t = Math.min(effect.elapsed / effect.duration, 1)
      switch (effect.kind) {
        case 'strike': {
          if (this.reducedMotion || !effect.toward) {
            break
          }
          // Out fast, back slow: the shape of a committed swing.
          const lean = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65
          const from = axialToPixel(effect.at)
          const to = axialToPixel(effect.toward)
          const length = Math.hypot(to.x - from.x, to.y - from.y) || 1
          motion.dx += ((to.x - from.x) / length) * 18 * lean
          motion.dy += ((to.y - from.y) / length) * 18 * lean
          break
        }
        case 'hit': {
          motion.flash = Math.max(motion.flash, 1 - t)
          motion.flashColor = TONE_COLOR[effect.tone]
          if (!this.reducedMotion) {
            motion.dx += Math.sin(t * 48) * 6 * (1 - t)
          }
          break
        }
        case 'block': {
          motion.flash = Math.max(motion.flash, (1 - t) * 0.8)
          motion.flashColor = TONE_COLOR.guard
          break
        }
        case 'cast': {
          if (!this.reducedMotion) {
            motion.scale *= 1 + 0.2 * Math.sin(Math.PI * t)
          }
          break
        }
        case 'move': {
          if (this.reducedMotion || !effect.from) {
            break
          }
          // The piece is already at its destination in the rules; it slides
          // in from where it stood.
          const remaining = 1 - easeOutCubic(t)
          const from = axialToPixel(effect.from)
          const to = axialToPixel(effect.at)
          motion.dx += (from.x - to.x) * remaining
          motion.dy += (from.y - to.y) * remaining
          break
        }
        case 'spawn': {
          motion.scale *= this.reducedMotion ? 1 : Math.min(easeOutCubic(t) * 1.15, 1)
          break
        }
        default:
          break
      }
    }
    return motion
  }

  private drawEffectOverlays(graphics: Phaser.GameObjects.Graphics): void {
    for (const effect of this.active) {
      if (effect.elapsed < 0) {
        continue
      }
      const t = Math.min(effect.elapsed / effect.duration, 1)
      const color = TONE_COLOR[effect.tone]
      switch (effect.kind) {
        case 'blast':
          for (const coords of effect.hexes ?? []) {
            const { x, y } = axialToPixel(coords)
            graphics.fillStyle(color, 0.55 * (1 - t))
            this.fillPath(graphics, hexCorners(x, y, HEX_SIZE - 3))
            graphics.lineStyle(3, color, 1 - t)
            this.strokePath(graphics, hexCorners(x, y, HEX_SIZE - 3))
          }
          break
        case 'scorch': {
          const { x, y } = axialToPixel(effect.at)
          graphics.fillStyle(color, 0.4 * (1 - t))
          this.fillPath(graphics, hexCorners(x, y, HEX_SIZE - 5))
          break
        }
        case 'cast':
        case 'hit':
        case 'block':
        case 'defeat':
        case 'spawn': {
          const { x, y } = axialToPixel(effect.at)
          const grow = this.reducedMotion ? 0.6 : easeOutCubic(t)
          const radius = 16 + grow * 26
          graphics.lineStyle(3, color, 1 - t)
          graphics.strokeCircle(x, y, radius)
          break
        }
        default:
          break
      }
    }
  }

  private drawFloaters(): void {
    for (const effect of this.active) {
      if (effect.label === undefined || effect.elapsed < 0) {
        continue
      }
      const t = Math.min(effect.elapsed / effect.duration, 1)
      const { x, y } = axialToPixel(effect.at)
      this.labels.push(
        this.add
          .text(x, y - 26 - effect.lane * FLOATER_LANE_PX - (this.reducedMotion ? 0 : easeOutCubic(t) * 26), effect.label, {
            fontFamily: 'monospace',
            fontSize: '15px',
            fontStyle: 'bold',
            color: TONE_TEXT[effect.tone],
            stroke: '#09090b',
            strokeThickness: 4,
          })
          .setOrigin(0.5, 0.5)
          .setAlpha(1 - t ** 2)
          // Above the sprites: a damage number the piece stands in front of
          // is a damage number nobody reads.
          .setDepth(LABEL_DEPTH),
      )
    }
  }

  private renderSnapshot(): void {
    const graphics = this.graphicsLayer
    const snapshot = this.snapshot
    if (!graphics || !snapshot) {
      return
    }
    graphics.clear()
    // Labels survive an idle frame untouched. They are rebuilt when the
    // snapshot behind them changes, while an effect is live and moving them,
    // and once more on the frame the last effect clears, so floaters from that
    // effect are taken down with it.
    const hasEffects = this.active.length > 0
    const rebuildLabels = hasEffects || this.labelsHaveEffects || this.labelsSnapshot !== snapshot
    if (rebuildLabels) {
      for (const label of this.labels) {
        label.destroy()
      }
      this.labels = []
      this.labelsSnapshot = snapshot
      this.labelsHaveEffects = hasEffects
    }
    const { state } = snapshot
    // The arena answers the phase on every snapshot rather than swapping once
    // at the Phase Reveal. A one-time swap would be right going forward and
    // wrong going back: stepping through time travel across the Phase Trigger
    // has to restore the first arena, and re-reading the phase does that for
    // free. setTexture resets the display size, so the cover is re-applied.
    const arena = backdropFor(state.bossPhase)
    if (this.backdrop !== null && this.backdrop.texture.key !== arena.key && this.textures.exists(arena.key)) {
      this.backdrop.setTexture(arena.key).setDisplaySize(BACKDROP_COVER, BACKDROP_COVER)
    }
    const legalMoves = new Set(snapshot.legalMoveKeys)
    const guidedMoves = new Set(snapshot.guidedMoveKeys)
    const targetableHexes = new Set(snapshot.targetableHexKeys)
    const targetPreviewHexes = new Set(snapshot.targetPreviewHexKeys)
    // The snapshot is the batch's final state, but a staggered playout means
    // some of it has not "happened" on screen yet: ground scorched by a
    // later moment stays clean and a Whelp a later moment spawns stays
    // unseen until that moment's own effect fires. The playout director
    // reports unplayed moments through the snapshot; still-delayed effects
    // already queued here count too.
    const pendingScorch = new Set<string>(snapshot.pendingScorchKeys)
    const pendingSpawns = new Set<string>(snapshot.pendingSpawnIds)
    for (const effect of this.active) {
      if (effect.elapsed >= 0) {
        continue
      }
      if (effect.kind === 'scorch') {
        pendingScorch.add(hexKey(effect.at))
      } else if (effect.kind === 'spawn') {
        pendingSpawns.add(effect.entityId)
      }
    }
    const tiles = Object.keys(state.board.hexes).map((key) => {
      const coords = parseHexKey(key)
      const { x, y } = axialToPixel(coords)
      const scorched = (state.board.hazards[key] ?? []).length > 0 && !pendingScorch.has(key)
      // A flat fill repeated across every hex reads as vector art. Nudging
      // each hex's value a little breaks that up without introducing a
      // second authored colour.
      const fill = shade(scorched ? SCORCHED_FILL : TILE_FILL, 1 - TILE_JITTER / 2 + tileJitter(coords) * TILE_JITTER)
      return { key, coords, x, y, fill, corners: hexCorners(x, y, HEX_SIZE - 2) }
    })

    // Every skirt before any face: a tile's skirt has to sit under the tiles
    // in front of it, and hex keys arrive in no meaningful order.
    for (const tile of tiles) {
      graphics.fillStyle(shade(tile.fill, TILE_SKIRT_SHADE), 1)
      this.fillPath(
        graphics,
        tile.corners.map((corner) => ({ x: corner.x, y: corner.y + TILE_DEPTH })),
      )
    }

    for (const tile of tiles) {
      const { key, coords, x, y, corners } = tile
      this.fillHex(graphics, corners, tile.fill, 1, TILE_STROKE)
      const telegraph = state.telegraphs[key]
      if (telegraph === 'cone') {
        this.fillHex(graphics, hexCorners(x, y, HEX_SIZE - 6), CONE_OVERLAY, 0.28)
      } else if (telegraph === 'spawn') {
        this.fillHex(graphics, hexCorners(x, y, HEX_SIZE - 6), SPAWN_OVERLAY, 0.32)
      }
      if (legalMoves.has(key)) {
        this.fillHex(graphics, hexCorners(x, y, HEX_SIZE - 6), MOVE_OVERLAY, 0.35)
      }
      // The chosen hex takes the same runeglass at full strength and wears
      // its own edge: while the Hand is being read, this is the one hex the
      // player has already committed to.
      if (snapshot.pendingMoveKey === key) {
        this.fillHex(graphics, hexCorners(x, y, HEX_SIZE - 6), MOVE_OVERLAY, 0.6)
        graphics.lineStyle(3, MOVE_OVERLAY, 1)
        this.strokeHex(graphics, hexCorners(x, y, HEX_SIZE - 5))
      }
      // The scripted turn marks the hexes that answer the telegraph, with a
      // slow pulse so the eye lands there without any words.
      if (guidedMoves.has(key)) {
        const pulse = this.reducedMotion ? 0.85 : 0.55 + 0.45 * Math.abs(Math.sin(this.time.now / 320))
        graphics.lineStyle(3, GUIDED_STROKE, pulse)
        this.strokeHex(graphics, hexCorners(x, y, HEX_SIZE - 7))
      }
      if (targetPreviewHexes.has(key)) {
        this.fillHex(graphics, hexCorners(x, y, HEX_SIZE - 6), TARGET_STROKE, 0.2)
      }
      if (targetableHexes.has(key)) {
        graphics.lineStyle(3, TARGET_STROKE, 1)
        this.strokeHex(graphics, hexCorners(x, y, HEX_SIZE - 4))
      }
      if (snapshot.targetPreviewCenterKey === key) {
        graphics.lineStyle(5, TARGET_STROKE, 1)
        this.strokeHex(graphics, hexCorners(x, y, HEX_SIZE - 7))
      }
      if (snapshot.showCoordinates && rebuildLabels) {
        this.labels.push(
          this.add
            .text(x, y + HEX_SIZE - 12, `${coords.q},${coords.r}`, {
              fontFamily: 'monospace',
              fontSize: '9px',
              color: '#71717a',
            })
            .setOrigin(0.5, 0.5),
        )
      }
    }

    for (const entity of Object.values(state.board.entities)) {
      if (pendingSpawns.has(entity.id)) {
        continue
      }
      const base = axialToPixel(entity.coords)
      const motion = this.motionFor(entity.id)
      const x = base.x + motion.dx
      const y = base.y + motion.dy
      // A flying piece rises off the shadow it casts, and that gap is what
      // reads as a lift rather than the whole piece sliding. A piece that
      // stands keeps its feet on the tile and breathes inside its own sheet.
      const bodyY = y + this.idleBob(entity)
      const baseRadius = entity.kind === 'boss' ? 22 : entity.kind === 'hero' ? 16 : 12
      const radius = Math.max(baseRadius * motion.scale, 1)
      const fill = entity.kind === 'boss' ? BOSS_FILL : entity.kind === 'hero' ? HERO_FILL : MINION_FILL
      graphics.fillStyle(0x000000, 0.35)
      graphics.fillCircle(x + 2, y + 3, radius)
      // A piece with an authored sheet is drawn as itself. The shadow above
      // stays either way: it is what plants the piece on the tile, and it is
      // cast from the resting position, so a flying piece rises off it while a
      // standing one sits on it.
      if (this.placeSprite(entity, x, bodyY, motion)) {
        // The sheet draws its own facing, its own light, and its own rim, so
        // the token's crescent, highlight and facing wedge would all be a
        // second opinion drawn over the top of it.
      } else {
        // Two values against one light: the piece fills with its shadow tone,
        // then its lit tone lands offset toward the light, leaving a crescent
        // of shadow on the far side.
        graphics.fillStyle(shade(fill, PIECE_SHADOW_SHADE), 1)
        graphics.fillCircle(x, bodyY, radius)
        graphics.fillStyle(fill, 1)
        graphics.fillCircle(x + LIGHT_DX * radius * PIECE_LIT_OFFSET, bodyY + LIGHT_DY * radius * PIECE_LIT_OFFSET, radius * PIECE_LIT_RADIUS)
        if (motion.flash > 0) {
          graphics.fillStyle(motion.flashColor, motion.flash * 0.85)
          graphics.fillCircle(x, bodyY, radius)
        }
        // Highlight on the lit side says which way the light comes from; the
        // rim on the far side is what lifts the piece off a dark tile.
        this.strokeArc(graphics, x, bodyY, radius, LIGHT_ANGLE, HIGHLIGHT_SPAN, 0xf4f4f5, 1, 2.5)
        this.strokeArc(graphics, x, bodyY, radius, RIM_ANGLE, RIM_SPAN, 0xf4f4f5, 0.55, 1.5)
        this.drawFacing(graphics, x, bodyY, radius, this.facingAngleFor(entity.id, entity.facing))
      }
      // No health on the piece itself: a tile stays clean until it is
      // tapped, and the tapped piece's Stat Panel is the health readout.
      // The label sits at the piece's resting height, not its bobbed one: a
      // rising and falling caption is noise, and holding it still is what
      // lets an idle frame reuse it.
      if (entity.kind !== 'boss' && rebuildLabels) {
        this.labels.push(
          this.add
            .text(x, y + radius + 10, facingName(entity.facing), {
              fontFamily: 'monospace',
              fontSize: '10px',
              color: '#a1a1aa',
            })
            .setOrigin(0.5, 0.5)
            .setDepth(LABEL_DEPTH),
        )
      }
    }

    // A defeated Minion or a Hero that left the board keeps no sprite: the
    // graphics layer is cleared every frame, but a retained object would
    // stand there after the piece it draws is gone.
    this.reapSprites(new Set(Object.keys(state.board.entities)))

    this.drawEffectOverlays(graphics)
    if (rebuildLabels) {
      this.drawFloaters()
    }
  }

  // Which pieces have authored art. Everything else stays a token, which is
  // not a placeholder: a token reads its facing and its state at a glance,
  // and only the pieces with a sheet have earned the right to be a body.
  private sheetFor(entity: { kind: string }): SheetSpec | null {
    const sheet = SHEETS[entity.kind]
    return sheet && this.textures.exists(sheet.key) ? sheet : null
  }

  // Draws a piece from its sheet. Returns false when the piece has no art, so
  // the caller falls back to the token. Sprites are retained objects in an
  // otherwise immediate-mode renderer, so they are created on first sight and
  // reaped in renderSnapshot when their piece leaves the board.
  private placeSprite(entity: { id: string; kind: string; facing: number }, x: number, y: number, motion: Motion): boolean {
    const sheet = this.sheetFor(entity)
    if (sheet === null) {
      return false
    }
    let sprite = this.sprites.get(entity.id)
    if (!sprite) {
      sprite = this.add.sprite(x, y, sheet.key, 0)
      // Feet at the origin: the sprite stands on the point it is given, and
      // its height never shifts where that point is.
      sprite.setOrigin(0.5, 1)
      this.sprites.set(entity.id, sprite)
    }
    const footY = y + sheet.footOffset
    sprite.setPosition(x, footY)
    // Above the tiles and below the labels, and within that, sorted by where
    // the piece stands: a piece further down the board is nearer the camera
    // and has to occlude the one behind it. Embermaw is drawn low and wide
    // and overlaps the hexes in front of it, so without this the two pieces
    // take turns being in front depending on the order they were created in.
    sprite.setDepth(SPRITE_DEPTH + footY / 10000)
    // Rows are facing indices and columns are the idle cycle, so the frame is
    // arithmetic. Reduced motion holds the cycle on its first frame — the
    // sheet is ambience, and ambience is what that setting turns off.
    sprite.setFrame(spriteFrame(entity.facing, idleStep(this.time.now, this.reducedMotion)))
    sprite.setScale((sheet.targetHeight / sheet.frameHeight) * motion.scale)
    // The token flashed by filling itself with the tone; a body takes the
    // same tone as a tint, which reads on the armour without flattening it.
    if (motion.flash > 0) {
      sprite.setTint(motion.flashColor)
      sprite.setAlpha(1)
    } else {
      sprite.clearTint()
    }
    return true
  }

  private reapSprites(liveIds: Set<string>): void {
    for (const [id, sprite] of this.sprites) {
      if (!liveIds.has(id)) {
        sprite.destroy()
        this.sprites.delete(id)
      }
    }
  }

  private fillPath(graphics: Phaser.GameObjects.Graphics, corners: { x: number; y: number }[]): void {
    graphics.beginPath()
    graphics.moveTo(corners[0].x, corners[0].y)
    for (const corner of corners.slice(1)) {
      graphics.lineTo(corner.x, corner.y)
    }
    graphics.closePath()
    graphics.fillPath()
  }

  private strokePath(graphics: Phaser.GameObjects.Graphics, corners: { x: number; y: number }[]): void {
    graphics.beginPath()
    graphics.moveTo(corners[0].x, corners[0].y)
    for (const corner of corners.slice(1)) {
      graphics.lineTo(corner.x, corner.y)
    }
    graphics.closePath()
    graphics.strokePath()
  }

  private fillHex(graphics: Phaser.GameObjects.Graphics, corners: { x: number; y: number }[], color: number, alpha: number, strokeColor?: number): void {
    graphics.fillStyle(color, alpha)
    this.fillPath(graphics, corners)
    if (strokeColor !== undefined) {
      graphics.lineStyle(1.5, strokeColor, 1)
      this.strokePath(graphics, corners)
    }
  }

  private strokeArc(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, centerAngle: number, span: number, color: number, alpha: number, width: number): void {
    graphics.lineStyle(width, color, alpha)
    graphics.beginPath()
    graphics.arc(x, y, radius, centerAngle - span / 2, centerAngle + span / 2, false)
    graphics.strokePath()
  }

  private strokeHex(graphics: Phaser.GameObjects.Graphics, corners: { x: number; y: number }[]): void {
    this.strokePath(graphics, corners)
  }

  // Facing angles for pointy-top axial with E toward +x and NE up-right.
  private static readonly FACING_ANGLES = [0, -60, -120, 180, 120, 60]

  private facingAngle(facing: number): number {
    return (BoardScene.FACING_ANGLES[((facing % 6) + 6) % 6] * Math.PI) / 180
  }

  // The angle a piece's facing indicator draws at right now. The snapshot's
  // facing is the batch's final one; a pending or playing 'turn' effect
  // overrides it so the swing happens when its beat plays, not the moment
  // the batch lands. A turn waiting in an unplayed playout moment holds the
  // old facing the same way.
  private facingAngleFor(entityId: string, finalFacing: number): number {
    const finalAngle = this.facingAngle(finalFacing)
    for (const effect of this.active) {
      if (effect.kind !== 'turn' || effect.entityId !== entityId || effect.fromFacing === undefined) {
        continue
      }
      const fromAngle = this.facingAngle(effect.fromFacing)
      if (effect.elapsed < 0) {
        return fromAngle
      }
      if (this.reducedMotion) {
        return finalAngle
      }
      // Swing along the shorter arc.
      let arc = finalAngle - fromAngle
      if (arc > Math.PI) {
        arc -= Math.PI * 2
      } else if (arc < -Math.PI) {
        arc += Math.PI * 2
      }
      return fromAngle + arc * easeOutCubic(Math.min(effect.elapsed / effect.duration, 1))
    }
    const pendingFacing = this.snapshot?.pendingFacings[entityId]
    if (pendingFacing !== undefined) {
      return this.facingAngle(pendingFacing)
    }
    return finalAngle
  }

  private drawFacing(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, angle: number): void {
    const tipX = x + Math.cos(angle) * (radius + 7)
    const tipY = y + Math.sin(angle) * (radius + 7)
    graphics.lineStyle(3, 0xfafafa, 1)
    graphics.lineBetween(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, tipX, tipY)
  }
}
