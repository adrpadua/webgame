import Phaser from 'phaser'
import { facingName, hexKey, parseHexKey, type Axial, type EncounterState } from '@/engine'
import { axialToPixel, hexCorners, pixelToAxial, HEX_SIZE } from './layout'

// The board snapshot the scene renders. Phaser owns no game state: it draws
// what it is handed and reports hex-level intents upward (ADR 0019).
export interface BoardSnapshot {
  state: EncounterState
  targeting: boolean
  legalMoveKeys: string[]
  showCoordinates: boolean
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
const TARGET_STROKE = 0xfacc15
const BOSS_FILL = 0xdc2626
const HERO_FILL = 0x3b82f6
const MINION_FILL = 0x16a34a

export class BoardScene extends Phaser.Scene {
  private snapshot: BoardSnapshot | null = null
  private graphicsLayer: Phaser.GameObjects.Graphics | null = null
  private labels: Phaser.GameObjects.Text[] = []
  private readonly callbacks: BoardSceneCallbacks

  constructor(callbacks: BoardSceneCallbacks) {
    super({ key: 'board' })
    this.callbacks = callbacks
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
    const minionKeys = new Set(
      Object.values(state.board.entities)
        .filter((entity) => entity.kind === 'minion')
        .map((entity) => hexKey(entity.coords)),
    )

    for (const key of Object.keys(state.board.hexes)) {
      const coords = parseHexKey(key)
      const { x, y } = axialToPixel(coords)
      const corners = hexCorners(x, y, HEX_SIZE - 2)
      const scorched = (state.board.hazards[key] ?? []).length > 0
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
      const { x, y } = axialToPixel(entity.coords)
      const radius = entity.kind === 'boss' ? 22 : entity.kind === 'hero' ? 16 : 12
      const fill = entity.kind === 'boss' ? BOSS_FILL : entity.kind === 'hero' ? HERO_FILL : MINION_FILL
      graphics.fillStyle(0x000000, 0.35)
      graphics.fillCircle(x + 2, y + 3, radius)
      graphics.fillStyle(fill, 1)
      graphics.fillCircle(x, y, radius)
      graphics.lineStyle(2, 0xf4f4f5, 0.9)
      graphics.strokeCircle(x, y, radius)
      this.drawFacing(graphics, x, y, radius, entity.facing)
      this.labels.push(
        this.add
          .text(x, y - radius - 12, `${entity.health}`, {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#fafafa',
            stroke: '#18181b',
            strokeThickness: 3,
          })
          .setOrigin(0.5, 0.5),
      )
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
  }

  private fillHex(graphics: Phaser.GameObjects.Graphics, corners: { x: number; y: number }[], color: number, alpha: number, strokeColor?: number): void {
    graphics.fillStyle(color, alpha)
    graphics.beginPath()
    graphics.moveTo(corners[0].x, corners[0].y)
    for (const corner of corners.slice(1)) {
      graphics.lineTo(corner.x, corner.y)
    }
    graphics.closePath()
    graphics.fillPath()
    if (strokeColor !== undefined) {
      graphics.lineStyle(1.5, strokeColor, 1)
      graphics.strokePath()
    }
  }

  private strokeHex(graphics: Phaser.GameObjects.Graphics, corners: { x: number; y: number }[]): void {
    graphics.beginPath()
    graphics.moveTo(corners[0].x, corners[0].y)
    for (const corner of corners.slice(1)) {
      graphics.lineTo(corner.x, corner.y)
    }
    graphics.closePath()
    graphics.strokePath()
  }

  private drawFacing(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, facing: number): void {
    // Facing angles for pointy-top axial with E toward +x and NE up-right.
    const angles = [0, -60, -120, 180, 120, 60]
    const angle = (angles[((facing % 6) + 6) % 6] * Math.PI) / 180
    const tipX = x + Math.cos(angle) * (radius + 7)
    const tipY = y + Math.sin(angle) * (radius + 7)
    graphics.lineStyle(3, 0xfafafa, 1)
    graphics.lineBetween(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, tipX, tipY)
  }
}
