import Phaser from 'phaser'
import { facingName, hexKey, parseHexKey, type Axial, type EncounterState, type EntityKind } from '@/engine'
import { axialToPixel, hexCorners, pixelToAxial, HEX_SIZE } from './layout'
import { healthBarScale } from '@/ui/theme'
import type { BoardEffect, EffectTone, HealthPlayoutValue } from './effects'

// The board snapshot the scene renders. Phaser owns no game state: it draws
// what it is handed and reports hex-level intents upward (ADR 0019).
export interface BoardSnapshot {
  state: EncounterState
  targeting: boolean
  legalMoveKeys: string[]
  // Hexes the scripted first turn is pointing the player at.
  guidedMoveKeys: string[]
  showCoordinates: boolean
  // Staggered gauge values while a boss track replays: a piece listed here
  // draws this health/armor instead of the state's (already final) numbers.
  healthOverrides: Record<string, HealthPlayoutValue>
}

export interface BoardSceneCallbacks {
  onHexClicked: (coords: Axial) => void
  // Pressing and holding the Hero previews legal routes; release ends it.
  onHeroPressChange: (pressed: boolean) => void
}

const TILE_FILL = 0x272138
const TILE_STROKE = 0x4c4368
const SCORCHED_FILL = 0x7f1d1d
const BREATH_OVERLAY = 0xf97316
const BROOD_OVERLAY = 0xa855f7
const MOVE_OVERLAY = 0x22c55e
const GUIDED_STROKE = 0xfafafa
const TARGET_STROKE = 0xfacc15
const BOSS_FILL = 0xdc2626
const HERO_FILL = 0x3b82f6
const MINION_FILL = 0x16a34a

const TONE_COLOR: Record<EffectTone, number> = {
  hero: 0x60a5fa,
  boss: 0xf87171,
  guard: 0x38bdf8,
  heal: 0x34d399,
  hazard: 0xfb923c,
}

const TONE_TEXT: Record<EffectTone, string> = {
  hero: '#fca5a5',
  boss: '#fca5a5',
  guard: '#7dd3fc',
  heal: '#6ee7b7',
  hazard: '#fdba74',
}

// How long each beat of feedback stays on the board. Short enough that a
// player tapping quickly is never waiting on the animation, long enough to
// be read: nothing here gates input.
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

export class BoardScene extends Phaser.Scene {
  private snapshot: BoardSnapshot | null = null
  private graphicsLayer: Phaser.GameObjects.Graphics | null = null
  private labels: Phaser.GameObjects.Text[] = []
  private active: ActiveEffect[] = []
  private readonly callbacks: BoardSceneCallbacks
  private readonly reducedMotion: boolean

  constructor(callbacks: BoardSceneCallbacks) {
    super({ key: 'board' })
    this.callbacks = callbacks
    this.reducedMotion = typeof window !== 'undefined' && window.matchMedia !== undefined && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  create(): void {
    this.graphicsLayer = this.add.graphics()
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const coords = pixelToAxial(pointer.x, pointer.y)
      this.callbacks.onHexClicked(coords)
      const heroCoords = this.snapshot ? this.snapshot.state.board.entities[this.snapshot.state.primaryHeroId]?.coords : undefined
      if (heroCoords && heroCoords.q === coords.q && heroCoords.r === coords.r) {
        this.callbacks.onHeroPressChange(true)
      }
    })
    this.input.on('pointerup', () => this.callbacks.onHeroPressChange(false))
    this.input.on('pointerupoutside', () => this.callbacks.onHeroPressChange(false))
    this.input.on('gameout', () => this.callbacks.onHeroPressChange(false))
    this.renderSnapshot()
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
      this.active.push({ ...effect, elapsed: -(effect.delay ?? 0), duration: EFFECT_DURATION[effect.kind], started: false })
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
    // The scripted turn's destination pulse is the only other live pixel.
    if (!this.reducedMotion && (this.snapshot?.guidedMoveKeys.length ?? 0) > 0) {
      this.renderSnapshot()
    }
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
          .text(x, y - 26 - (this.reducedMotion ? 0 : easeOutCubic(t) * 26), effect.label, {
            fontFamily: 'monospace',
            fontSize: '15px',
            fontStyle: 'bold',
            color: TONE_TEXT[effect.tone],
            stroke: '#09090b',
            strokeThickness: 4,
          })
          .setOrigin(0.5, 0.5)
          .setAlpha(1 - t ** 2),
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
    for (const label of this.labels) {
      label.destroy()
    }
    this.labels = []
    const { state } = snapshot
    const legalMoves = new Set(snapshot.legalMoveKeys)
    const guidedMoves = new Set(snapshot.guidedMoveKeys)
    // The snapshot is the batch's final state, but a staggered playout means
    // some of it has not "happened" on screen yet: ground scorched by a
    // later beat stays clean and a Whelp a later beat spawns stays unseen
    // until that beat's own effect fires.
    const pendingScorch = new Set<string>()
    const pendingSpawns = new Set<string>()
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
    const minionKeys = new Set(
      Object.values(state.board.entities)
        .filter((entity) => entity.kind === 'minion')
        .map((entity) => hexKey(entity.coords)),
    )

    for (const key of Object.keys(state.board.hexes)) {
      const coords = parseHexKey(key)
      const { x, y } = axialToPixel(coords)
      const corners = hexCorners(x, y, HEX_SIZE - 2)
      const scorched = (state.board.hazards[key] ?? []).length > 0 && !pendingScorch.has(key)
      this.fillHex(graphics, corners, scorched ? SCORCHED_FILL : TILE_FILL, 1, TILE_STROKE)
      const telegraph = state.telegraphs[key]
      if (telegraph === 'breath') {
        this.fillHex(graphics, hexCorners(x, y, HEX_SIZE - 6), BREATH_OVERLAY, 0.28)
      } else if (telegraph === 'brood') {
        this.fillHex(graphics, hexCorners(x, y, HEX_SIZE - 6), BROOD_OVERLAY, 0.32)
      }
      if (legalMoves.has(key)) {
        this.fillHex(graphics, hexCorners(x, y, HEX_SIZE - 6), MOVE_OVERLAY, 0.35)
      }
      // The scripted turn marks the hexes that answer the telegraph, with a
      // slow pulse so the eye lands there without any words.
      if (guidedMoves.has(key)) {
        const pulse = this.reducedMotion ? 0.85 : 0.55 + 0.45 * Math.abs(Math.sin(this.time.now / 320))
        graphics.lineStyle(3, GUIDED_STROKE, pulse)
        this.strokeHex(graphics, hexCorners(x, y, HEX_SIZE - 7))
      }
      if (snapshot.targeting && minionKeys.has(key)) {
        graphics.lineStyle(3, TARGET_STROKE, 1)
        this.strokeHex(graphics, hexCorners(x, y, HEX_SIZE - 4))
      }
      if (snapshot.showCoordinates) {
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
      const baseRadius = entity.kind === 'boss' ? 22 : entity.kind === 'hero' ? 16 : 12
      const radius = Math.max(baseRadius * motion.scale, 1)
      const fill = entity.kind === 'boss' ? BOSS_FILL : entity.kind === 'hero' ? HERO_FILL : MINION_FILL
      graphics.fillStyle(0x000000, 0.35)
      graphics.fillCircle(x + 2, y + 3, radius)
      graphics.fillStyle(fill, 1)
      graphics.fillCircle(x, y, radius)
      if (motion.flash > 0) {
        graphics.fillStyle(motion.flashColor, motion.flash * 0.85)
        graphics.fillCircle(x, y, radius)
      }
      graphics.lineStyle(2, 0xf4f4f5, 0.9)
      graphics.strokeCircle(x, y, radius)
      this.drawFacing(graphics, x, y, radius, this.facingAngleFor(entity.id, entity.facing))
      const override = snapshot.healthOverrides[entity.id]
      const shownHealth = override?.health ?? entity.health
      const shownArmor = entity.kind === 'hero' ? (override?.armor ?? state.heroes[entity.id]?.armor ?? 0) : 0
      this.drawHealthBar(graphics, x, y - radius - 13, entity.kind, shownHealth, entity.maxHealth, shownArmor)
      if (entity.kind !== 'boss') {
        this.labels.push(
          this.add
            .text(x, y + radius + 10, facingName(entity.facing), {
              fontFamily: 'monospace',
              fontSize: '10px',
              color: '#a1a1aa',
            })
            .setOrigin(0.5, 0.5),
        )
      }
    }

    this.drawEffectOverlays(graphics)
    this.drawFloaters()
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

  private strokeHex(graphics: Phaser.GameObjects.Graphics, corners: { x: number; y: number }[]): void {
    this.strokePath(graphics, corners)
  }

  // A piece's health as a mini gauge in the HUD's language: red fill on a
  // dark track, the hero's armor riding it as a sky segment. Small pools get
  // segment ticks so an exact count stays readable without a number. The hex
  // colors mirror the HUD gauges' Tailwind palette (red-500, sky-500,
  // zinc-800) — change them together.
  private drawHealthBar(graphics: Phaser.GameObjects.Graphics, x: number, top: number, kind: EntityKind, health: number, maxHealth: number, armor: number): void {
    const width = kind === 'boss' ? 44 : kind === 'hero' ? 34 : 24
    const height = 5
    const left = x - width / 2
    const scale = healthBarScale(health, maxHealth, armor)
    graphics.fillStyle(0x09090b, 0.85)
    graphics.fillRect(left - 1, top - 1, width + 2, height + 2)
    graphics.fillStyle(0x27272a, 1)
    graphics.fillRect(left, top, width, height)
    const healthWidth = (Math.max(health, 0) / scale) * width
    if (healthWidth > 0) {
      graphics.fillStyle(0xef4444, 1)
      graphics.fillRect(left, top, healthWidth, height)
    }
    if (armor > 0) {
      graphics.fillStyle(0x0ea5e9, 1)
      graphics.fillRect(left + healthWidth, top, (armor / scale) * width, height)
    }
    if (scale <= 6) {
      graphics.lineStyle(1, 0x09090b, 0.9)
      for (let segment = 1; segment < scale; segment += 1) {
        const tickX = left + (segment / scale) * width
        graphics.lineBetween(tickX, top, tickX, top + height)
      }
    }
  }

  // Facing angles for pointy-top axial with E toward +x and NE up-right.
  private static readonly FACING_ANGLES = [0, -60, -120, 180, 120, 60]

  private facingAngle(facing: number): number {
    return (BoardScene.FACING_ANGLES[((facing % 6) + 6) % 6] * Math.PI) / 180
  }

  // The angle a piece's facing indicator draws at right now. The snapshot's
  // facing is the batch's final one; a pending or playing 'turn' effect
  // overrides it so the swing happens when its beat plays, not the moment
  // the batch lands.
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
    return finalAngle
  }

  private drawFacing(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, angle: number): void {
    const tipX = x + Math.cos(angle) * (radius + 7)
    const tipY = y + Math.sin(angle) * (radius + 7)
    graphics.lineStyle(3, 0xfafafa, 1)
    graphics.lineBetween(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, tipX, tipY)
  }
}
