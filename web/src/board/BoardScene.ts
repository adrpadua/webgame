import Phaser from 'phaser'
import { facingName, guardedFrontHex, hexKey, parseHexKey, type Axial, type EncounterState } from '@/engine'
import { axialToPixel, boundaryEdges, hexCorners, pixelToAxial, BOARD_CENTER_X, BOARD_CENTER_Y, BOARD_HEIGHT, BOARD_WIDTH, HEX_SIZE } from './layout'
import { BACKDROP_DEPTH, BACKDROPS, backdropFor } from './backdrop'
import { freeFloaterLane, type BoardEffect, type EffectTone } from './effects'
import { idleBobOffset } from './ambience'
import { BURN_MS, COOL_MS, charProgress, coolProgress, dyingEmbers, emberAlpha, flameTongues, flareRing } from './burn'
import { easeOutCubic, hexNoiseFor } from './math'
import { SPAWN_MS, arrivalScale, breakRing, groundHeat, spawnShards } from './spawn'
import { BOSS_DEFEAT_MS, buckleOffset, groundFlare, heatLoss, slumpScale, ventsOpening } from './defeat'
import { boardPalette, composite, shade, BLAST_EDGE, HOT_SHADE, TELEGRAPH_ALPHA, toneColors } from './palette'
import {
  guardedFrontOutline,
  GUARDED_FRONT_ARC_WIDTH,
  GUARDED_FRONT_FAR_ALPHA,
  GUARDED_FRONT_FILL_ALPHA,
  GUARDED_FRONT_NEAR_ALPHA,
  GUARDED_FRONT_RADIUS,
} from './guardedFront'
import { bossSheetKey, heroSheetKey, idleStep, spriteFrame, SHEETS, type SheetSpec } from './sheets'

// The board is three layers: tiles and their tints, then the pieces, then the
// text that has to be read over both. Phaser falls back to creation order
// within a depth, and the graphics layer is built once while labels are
// rebuilt per frame, so the pieces need saying explicitly.
const SPRITE_DEPTH = 1
// Flames are the one thing the board draws over its pieces rather than under
// them; above that, only the labels. The ground a Hazard takes is usually
// ground somebody is standing on — Ash Trail burns the hex the claw struck,
// which is the hex the Tank is holding — and fire behind that piece is fire
// nobody sees. A piece standing in it is in it.
const FLAME_DEPTH = 1.5
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
  // Whether the Guarded Front is marked at all — an Encounter in play, held by
  // a Tank. Which hex that is stays the scene's to ask, because the answer
  // depends on the facing being drawn rather than the one the state holds:
  // see drawnFacing.
  guardedFront: boolean
  // The footprint every Minion whose fuse is up will burn when the Incoming
  // Row resolves (D-063). Rules-derived like the target keys above: the scene
  // paints the blast but never decides how far one reaches.
  blastHexKeys: string[]
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
  blastOverlay: BLAST_OVERLAY,
  spawnOverlay: SPAWN_OVERLAY,
  bossFill: BOSS_FILL,
  minionFill: MINION_FILL,
  scorchedFill: SCORCHED_FILL,
  guidedStroke: GUIDED_STROKE,
  targetStroke: TARGET_STROKE,
  guardedFrontOverlay: GUARDED_FRONT_OVERLAY,
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
// be read: nothing here gates input. The longest entry that changes what the
// HUD claims (blast) is mirrored by EFFECT_SETTLE_MS in effects.ts — change
// them together.
//
// The ground outlasts that settle at both ends — a burn at 900ms, an expiry
// at 640 — and does so deliberately: neither claims a gauge or holds a prompt,
// so their tails are ground still changing under a board that has already
// moved on. See burn.ts for what those milliseconds are spent on.
//
// A Boss going out outlasts it too, and that one *is* held for: the outcome
// reveal waits on the fall rather than on the settle, because a Victory plate
// over a body still venting light would announce an ending the board has not
// finished showing (OUTCOME_REVEAL_MS in effects.ts).
const EFFECT_DURATION: Record<BoardEffect['kind'], number> = {
  strike: 320,
  hit: 420,
  block: 420,
  cast: 520,
  move: 280,
  spawn: SPAWN_MS,
  defeat: 460,
  boss_defeat: BOSS_DEFEAT_MS,
  blast: 560,
  scorch: BURN_MS,
  cool: COOL_MS,
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

// The floor's own draw from the per-hex hash. The same hex always lands on the
// same shade, so the floor holds still between frames, and it asks for its
// value by name like every other consumer of a hex.
export class BoardScene extends Phaser.Scene {
  private snapshot: BoardSnapshot | null = null
  private graphicsLayer: Phaser.GameObjects.Graphics | null = null
  private flameLayer: Phaser.GameObjects.Graphics | null = null
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
    this.flameLayer = this.add.graphics().setDepth(FLAME_DEPTH)
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

  // Takes down everything in flight. The board jumped — time travel, a
  // restart, a replayed Scenario — and feedback is a report on a transition
  // this board is no longer the far side of.
  clearEffects(): void {
    if (this.active.length === 0) {
      return
    }
    this.active = []
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

  // How far a piece's heat has left it, 0 burning and 1 out. A Boss that has
  // been reduced to nothing is not removed from the board — the Encounter ends
  // and the body stays on its hex — so this reads two things: the fall while it
  // plays, and the piece's own health once it has. The second is what keeps a
  // dead Boss dark through every frame after, including the ones a rewound or
  // replayed board draws with no effect in flight at all.
  private heatLossFor(entity: { id: string; kind: string; health: number }): number {
    for (const effect of this.active) {
      if (effect.kind === 'boss_defeat' && effect.entityId === entity.id) {
        // Queued but not yet playing: the blow has landed in the rules and the
        // death has not happened on screen, so the body is still burning. The
        // health below would call it out early and the effect would then start
        // by putting the light back — the same hold every other effect gives
        // the state it is about to change.
        if (effect.elapsed < 0) {
          return 0
        }
        return heatLoss(Math.min(effect.elapsed / effect.duration, 1))
      }
    }
    return entity.kind === 'boss' && entity.health <= 0 ? 1 : 0
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
          motion.scale *= arrivalScale(t, this.reducedMotion)
          break
        }
        case 'boss_defeat': {
          motion.dx += buckleOffset(t, this.reducedMotion)
          motion.scale *= slumpScale(t)
          break
        }
        default:
          break
      }
    }
    return motion
  }

  // Everything an effect paints on the floor: the footprint of a blast, the
  // heat and flames of a burn, the embers of an expiry, the break a Minion
  // comes up through. Drawn between the tiles and the pieces, because all of
  // it is ground.
  //
  // The split is not decoration. Tiles, pieces without an authored sheet, and
  // effect marks all fill into the same Graphics, where order is the only
  // depth there is — so a mark drawn in one pass after the pieces sits on top
  // of every token on the board, and the comments claiming these marks stay
  // under the pieces were true only for the pieces that happen to have art.
  private drawGroundEffects(graphics: Phaser.GameObjects.Graphics, flames: Phaser.GameObjects.Graphics): void {
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
          // The hex catching fire. The tile's own charring is drawn with the
          // floor, back in renderSnapshot; everything above the floor is here.
          const { x, y } = axialToPixel(effect.at)
          const ember = emberAlpha(t)
          if (ember > 0) {
            graphics.fillStyle(color, ember)
            this.fillPath(graphics, hexCorners(x, y, HEX_SIZE - 5))
          }
          const flare = flareRing(t)
          if (flare.alpha > 0) {
            graphics.lineStyle(3, shade(color, HOT_SHADE.flameCore), flare.alpha)
            this.strokePath(graphics, hexCorners(x, y, flare.radius))
          }
          // The heat on the face is ground and stays under the pieces; the
          // flames rise onto their own layer above them.
          for (const tongue of flameTongues(effect.at, t, this.time.now, this.reducedMotion)) {
            flames.fillStyle(color, tongue.alpha)
            this.fillPath(
              flames,
              tongue.body.map((point) => ({ x: x + point.x, y: y + point.y })),
            )
            flames.fillStyle(shade(color, HOT_SHADE.flameCore), tongue.alpha)
            this.fillPath(
              flames,
              tongue.core.map((point) => ({ x: x + point.x, y: y + point.y })),
            )
          }
          break
        }
        case 'boss_defeat': {
          // The Boss going out. The body is drawn by the piece loop, which
          // reads how far its heat has gone; what is here is what leaves it —
          // the light breaking out in wedges, and the heat it dumps into the
          // hex it stood on.
          //
          // The wedges are drawn on the flame layer, over the pieces: light
          // coming out of a body has to be in front of that body, and this is
          // the one piece on the board big enough to swallow anything drawn
          // behind it.
          const { x, y } = axialToPixel(effect.at)
          const flare = groundFlare(t)
          if (flare > 0) {
            graphics.fillStyle(color, flare)
            this.fillPath(graphics, hexCorners(x, y, HEX_SIZE - 5))
          }
          for (const vent of ventsOpening(effect.at, t, this.reducedMotion)) {
            flames.fillStyle(composite(shade(color, HOT_SHADE.flameCore), vent.heat, SCORCHED_FILL), 1)
            this.fillPath(
              flames,
              vent.points.map((point) => ({ x: x + point.x, y: y + point.y })),
            )
          }
          break
        }
        case 'cool': {
          // A Hazard running out. The ash lifting off the tile is drawn with
          // the floor; what is left here is the heat that was in it, as a
          // handful of embers going dark one after another.
          //
          // They are the coolest warm thing the board draws, and they have to
          // be: the direction ranks warm by imminence and puts ground already
          // paid for at the bottom of it, below the Boss and below every
          // telegraph. So an ember takes the Minion's step of ember coral
          // rather than the fire's, and spends its own heat sinking from there
          // into the ash it lies on — the same two authored materials the
          // tile crossfades between, in the same source-over.
          //
          // They stay on the ground layer, under the pieces: a Hero standing
          // on a hex that has just been given back is standing on ordinary
          // ground, and embers over their feet would say the fire was still
          // something to be in.
          const { x, y } = axialToPixel(effect.at)
          for (const ember of dyingEmbers(effect.at, t, this.reducedMotion)) {
            graphics.fillStyle(composite(MINION_FILL, ember.heat, SCORCHED_FILL), 1)
            this.fillPath(
              graphics,
              ember.points.map((point) => ({ x: x + point.x, y: y + point.y })),
            )
          }
          break
        }
        case 'spawn': {
          // The hex breaking open and giving a Whelp up. The mark the spawn
          // telegraph has been holding on this hex for a Round closes onto the
          // point the piece comes through, shards of the tile go with it, and
          // the ground it came out of stays hot after both.
          //
          // All of it under the pieces: what arrives has to be the thing the
          // eye lands on, and debris drawn over a piece that is still swelling
          // into place would be covering the event with its own noise.
          const { x, y } = axialToPixel(effect.at)
          const heat = groundHeat(t)
          if (heat > 0) {
            graphics.fillStyle(color, heat)
            this.fillPath(graphics, hexCorners(x, y, HEX_SIZE - 5))
          }
          const opening = breakRing(t)
          if (opening.alpha > 0) {
            graphics.lineStyle(3, shade(color, HOT_SHADE.spawnBreak), opening.alpha)
            this.strokePath(graphics, hexCorners(x, y, opening.radius))
          }
          for (const shard of spawnShards(effect.at, t, this.reducedMotion)) {
            graphics.fillStyle(composite(shade(color, HOT_SHADE.spawnBreak), shard.heat, MINION_FILL), 1)
            this.fillPath(
              graphics,
              shard.points.map((point) => ({ x: x + point.x, y: y + point.y })),
            )
          }
          break
        }
        default:
          break
      }
    }
  }

  // The mark that belongs to a piece rather than to the floor it stands on: a
  // ring at what was cast, hit, guarded, or killed. Drawn after the pieces,
  // because it is about them.
  private drawPieceEffects(graphics: Phaser.GameObjects.Graphics): void {
    for (const effect of this.active) {
      if (effect.elapsed < 0) {
        continue
      }
      const t = Math.min(effect.elapsed / effect.duration, 1)
      switch (effect.kind) {
        case 'cast':
        case 'hit':
        case 'block':
        case 'defeat': {
          const { x, y } = axialToPixel(effect.at)
          const color = TONE_COLOR[effect.tone]
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
    const flames = this.flameLayer
    const snapshot = this.snapshot
    if (!graphics || !flames || !snapshot) {
      return
    }
    graphics.clear()
    flames.clear()
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
    const blastHexes = new Set(snapshot.blastHexKeys)
    // The Guarded Front, taken from the facing the board is currently drawing
    // rather than the one the state holds, so the post moves with the Boss
    // coming round instead of ahead of it. The arc is aimed from the Boss's
    // own hex, which is where the blow comes from even while its sprite is
    // still sliding into that hex.
    const boss = state.board.entities[state.bossId]
    const guardedFront = snapshot.guardedFront && boss ? guardedFrontHex(state.board, state.bossId, this.drawnFacing(boss.id, boss.facing)) : null
    const guardedFrontKey = guardedFront === null ? null : hexKey(guardedFront)
    const bossCenter = boss ? axialToPixel(boss.coords) : null
    // The snapshot is the batch's final state, but a staggered playout means
    // some of it has not "happened" on screen yet: ground scorched by a
    // later moment stays clean and a Whelp a later moment spawns stays
    // unseen until that moment's own effect fires. The playout director
    // reports unplayed moments through the snapshot; still-delayed effects
    // already queued here count too.
    // Hazards are counted rather than flagged, because they stack: a cone can
    // land on ground Ash Trail already took, and a hex that ends the batch
    // with two of them may still be showing its first.
    const unplayedHazards = new Map<string, number>()
    const holdBack = (key: string) => unplayedHazards.set(key, (unplayedHazards.get(key) ?? 0) + 1)
    for (const key of snapshot.pendingScorchKeys) {
      holdBack(key)
    }
    const pendingSpawns = new Set<string>(snapshot.pendingSpawnIds)
    // Ground an expiry is about to give back, while its own effect is still
    // waiting on its delay: it stays burnt until that moment comes, the way
    // scorched ground stays clean until its own. The playout director has no
    // hand in this one — the Round advance that expires a Hazard sits outside
    // every Boss Beat, so an expiry never waits on a moment the player has yet
    // to press through. Should a Beat ever expire a Hazard, this is the half
    // that already holds; the director's half would have to be built.
    const pendingCool = new Set<string>()
    // How far the fire currently on a hex has charred it, and how much ash a
    // hex whose Hazard just expired still shows. Filled in the same pass,
    // since every one of these is a question about the same live effects.
    const burning = new Map<string, number>()
    const cooling = new Map<string, number>()
    for (const effect of this.active) {
      if (effect.elapsed < 0) {
        if (effect.kind === 'scorch') {
          holdBack(hexKey(effect.at))
        } else if (effect.kind === 'cool') {
          pendingCool.add(hexKey(effect.at))
        } else if (effect.kind === 'spawn') {
          pendingSpawns.add(effect.entityId)
        }
      } else if (effect.kind === 'scorch') {
        burning.set(hexKey(effect.at), charProgress(Math.min(effect.elapsed / effect.duration, 1)))
      } else if (effect.kind === 'cool') {
        cooling.set(hexKey(effect.at), coolProgress(Math.min(effect.elapsed / effect.duration, 1)))
      }
    }
    const tiles = Object.keys(state.board.hexes).map((key) => {
      const coords = parseHexKey(key)
      const { x, y } = axialToPixel(coords)
      // How much ash the ground shows. The snapshot is the batch's final
      // state, so what has actually landed on screen is what the state holds
      // less what the playout has not played yet.
      const played = (state.board.hazards[key] ?? []).length - (unplayedHazards.get(key) ?? 0)
      const burn = burning.get(key)
      // A hex the fire is on right now does not snap to ash: its burn says how
      // far it has charred, and the scorched material takes the tile across
      // the whole length of the fire. Two things that would go wrong if the
      // burn simply owned the tile while it played:
      //
      // The rules decide what is burnt ground, never the animation (ADR 0019).
      // A burn still playing over a board rewound past its Hazard has no
      // hazard left to count, so it paints nothing.
      //
      // And ash does not un-burn. A second fire on ground already taken starts
      // at zero char, and following it would flick the tile back to clean
      // oathsteel before darkening it again. Ground that has paid for a Hazard
      // already stays black, and the new fire burns on top of it.
      //
      // With no Hazard left to hold the ground, the tile is either giving it
      // back right now, still owing that to an expiry whose own moment has not
      // come, or plain ground that was never burnt.
      //
      // A fire landing on ground that is still cooling takes the darker of the
      // two for the same reason a second Hazard does: the hex is part way back
      // to oathsteel and the new burn starts from clean, so following it alone
      // would brighten the tile on the frame it caught fire.
      const cool = cooling.get(key) ?? (pendingCool.has(key) ? 1 : 0)
      const char = played > 0 ? Math.max(played > 1 || burn === undefined ? 1 : burn, cool) : cool
      // A flat fill repeated across every hex reads as vector art. Nudging
      // each hex's value a little breaks that up without introducing a
      // second authored colour.
      const ground = composite(SCORCHED_FILL, char, TILE_FILL)
      const fill = shade(ground, 1 - TILE_JITTER / 2 + hexNoiseFor(coords, 'floor:jitter') * TILE_JITTER)
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
      // Laid straight onto the tile face, under every other mark: the post has
      // been there all fight, and anything else painted on this hex — a
      // telegraph landing next window, a destination being chosen — is the
      // more imminent read and has to sit on top of it.
      if (key === guardedFrontKey && bossCenter !== null) {
        const outline = guardedFrontOutline({ x, y }, bossCenter)
        this.fillHex(graphics, hexCorners(x, y, GUARDED_FRONT_RADIUS), GUARDED_FRONT_OVERLAY, GUARDED_FRONT_FILL_ALPHA)
        graphics.lineStyle(GUARDED_FRONT_ARC_WIDTH, GUARDED_FRONT_OVERLAY, GUARDED_FRONT_FAR_ALPHA)
        this.strokeOpenPath(graphics, outline.far)
        graphics.lineStyle(GUARDED_FRONT_ARC_WIDTH, GUARDED_FRONT_OVERLAY, GUARDED_FRONT_NEAR_ALPHA)
        this.strokeOpenPath(graphics, outline.near)
      }
      const telegraph = state.telegraphs[key]
      if (telegraph === 'cone' || telegraph === 'spawn') {
        const warm = telegraph === 'cone' ? CONE_OVERLAY : SPAWN_OVERLAY
        const alpha = telegraph === 'cone' ? TELEGRAPH_ALPHA.cone : TELEGRAPH_ALPHA.spawn
        this.fillHex(graphics, hexCorners(x, y, HEX_SIZE - 6), warm, alpha)
        // The edge carries the colour the fill cannot. A tint composited over
        // a dark tile loses most of its chroma; a stroke drawn at full alpha
        // keeps the token's own, and at a 60px hex an edge is what the eye
        // reads first anyway.
        graphics.lineStyle(2, warm, 0.9)
        this.strokeHex(graphics, hexCorners(x, y, HEX_SIZE - 6))
      }
      // A Minion's fuse, painted for the whole Round it burns through (D-063).
      // Same material as the cone, because a blast landing in the Incoming Row
      // is exactly as imminent as the breath landing in it; what separates the
      // two is shape. The cone edges every tile it covers and reads as a fan
      // of hexes. The blast is washed and then edged once, around the outside
      // of the whole footprint, so it reads as one area with a Whelp sitting
      // inside it — which is what it is, and which is also the shape of the
      // answer, since stepping over that line is one of the two ways to
      // survive it. The line is where the warning lives here; see palette.ts
      // for why the wash under it is deliberately quiet.
      //
      // Two overlapping fuses produce one outline around their union rather
      // than two rings, because the question the line answers is "am I in it",
      // and a player standing where both reach is not in it twice.
      if (blastHexes.has(key)) {
        const corners = hexCorners(x, y, HEX_SIZE - 6)
        this.fillHex(graphics, corners, BLAST_OVERLAY, TELEGRAPH_ALPHA.blast)
        graphics.lineStyle(BLAST_EDGE.width, BLAST_OVERLAY, BLAST_EDGE.alpha)
        for (const edge of boundaryEdges(blastHexes, coords)) {
          this.strokeOpenPath(graphics, [corners[edge], corners[(edge + 1) % corners.length]])
        }
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

    this.drawGroundEffects(graphics, flames)

    // What actually got drawn this frame, which is not the same as what the
    // state holds: a Minion whose spawn has not played yet is in the rules and
    // not yet on the board.
    const drawn = new Set<string>()
    for (const entity of Object.values(state.board.entities)) {
      if (pendingSpawns.has(entity.id)) {
        continue
      }
      drawn.add(entity.id)
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
      const gone = this.heatLossFor(entity)
      // A body that has gone out is the same material with the heat taken out
      // of it, which is exactly what scorched ground is. The board already
      // spends that step on the floor a Hazard leaves behind; a Boss that has
      // stopped is made of the same thing now.
      const fill = composite(SCORCHED_FILL, gone, entity.kind === 'boss' ? BOSS_FILL : entity.kind === 'hero' ? HERO_FILL : MINION_FILL)
      graphics.fillStyle(0x000000, 0.35)
      graphics.fillCircle(x + 2, y + 3, radius)
      // A piece with an authored sheet is drawn as itself. The shadow above
      // stays either way: it is what plants the piece on the tile, and it is
      // cast from the resting position, so a flying piece rises off it while a
      // standing one sits on it.
      if (this.placeSprite(entity, x, bodyY, motion, gone)) {
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
    // graphics layer is cleared every frame, but a retained object would stand
    // there after the piece it draws is gone.
    //
    // Reaped against what was drawn rather than against what the state holds,
    // because the same is true at the other end of a piece's life. Skipping a
    // pending spawn in the loop above stops it being *re*drawn, and a sprite
    // is a retained object: one created before its beat came kept standing on
    // its hex through every frame that skipped it, so a Whelp was on the board
    // for the whole Boss Row that was still working up to calling it — and its
    // arrival then played on a piece the player had been looking at for
    // seconds.
    this.reapSprites(drawn)

    this.drawPieceEffects(graphics)
    if (rebuildLabels) {
      this.drawFloaters()
    }
  }

  // Which pieces have authored art. Everything else stays a token, which is
  // not a placeholder: a token reads its facing and its state at a glance,
  // and only the pieces with a sheet have earned the right to be a body.
  private sheetFor(entity: { id: string; kind: string }): SheetSpec | null {
    // A Boss wears the form its phase is in, which is read from the snapshot
    // rather than remembered, so time travel across the Phase Trigger
    // restores the first form on the way back as well as the second on the
    // way out. A Hero wears their own body: the kind is shared across the
    // Party, so the sheet is chosen by id (heroSheetKey), with Elian's as
    // the shared fallback for a seat without authored art yet.
    const kind =
      entity.kind === 'boss'
        ? bossSheetKey(this.snapshot?.state.bossPhase ?? 1)
        : entity.kind === 'hero'
          ? heroSheetKey(entity.id)
          : entity.kind
    const sheet = SHEETS[kind]
    return sheet && this.textures.exists(sheet.key) ? sheet : null
  }

  // Draws a piece from its sheet. Returns false when the piece has no art, so
  // the caller falls back to the token. Sprites are retained objects in an
  // otherwise immediate-mode renderer, so they are created on first sight and
  // reaped in renderSnapshot when their piece leaves the board.
  private placeSprite(entity: { id: string; kind: string; facing: number }, x: number, y: number, motion: Motion, heatGone: number): boolean {
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
    // A sprite is created once and kept, so a Boss that changes phase would
    // otherwise keep the texture it was born with and the Phase Break would
    // show nothing at all. setTexture resets the frame, which the setFrame
    // below restores in the same pass.
    if (sprite.texture.key !== sheet.key) {
      sprite.setTexture(sheet.key)
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
    } else if (heatGone > 0) {
      // A Phaser tint MULTIPLIES the sheet, so white is the art as drawn and
      // this walks that multiplier from white toward the ash step: the light
      // goes out of the art itself rather than a dead colour being laid over
      // it, and every shape the sheet draws survives. The product is darker
      // than the ash step, which is right — a fire seen through cooling coals
      // is not the same value as the ground they fall on.
      //
      // This is the one runtime tint that governs a piece's place in the warm
      // ordering, which the board direction says belongs to the PNG and is
      // measured off the sheet. It is safe here because it only ever moves the
      // piece *down*, and because the piece it moves has left the ordering:
      // a defeated Boss is not a threat being ranked against the beats around
      // it, it is what is left over after the last one.
      sprite.setTint(composite(SCORCHED_FILL, heatGone, 0xffffff))
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

  // A line along part of an outline rather than a shape: no closing segment
  // back to the first point, which on a three-edge arc would draw the chord
  // across the hex.
  private strokeOpenPath(graphics: Phaser.GameObjects.Graphics, points: { x: number; y: number }[]): void {
    graphics.beginPath()
    graphics.moveTo(points[0].x, points[0].y)
    for (const point of points.slice(1)) {
      graphics.lineTo(point.x, point.y)
    }
    graphics.strokePath()
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

  // The facing a piece is drawn with right now, as one of the six rather than
  // as an angle: what a mark on the ground follows. A turn in flight keeps the
  // facing it swings from for the whole swing and lands on the new one with
  // it, because a hex either is the Guarded Front or is not — there is no
  // halfway hex to move the mark to, and snapping it at the start would put
  // the post in front of a Boss that has not turned yet. Reduced motion has no
  // swing to wait for, so it takes the new facing at once, exactly as the
  // wedge above does.
  private drawnFacing(entityId: string, finalFacing: number): number {
    for (const effect of this.active) {
      if (effect.kind !== 'turn' || effect.entityId !== entityId || effect.fromFacing === undefined) {
        continue
      }
      return this.reducedMotion && effect.elapsed >= 0 ? finalFacing : effect.fromFacing
    }
    return this.snapshot?.pendingFacings[entityId] ?? finalFacing
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
