import { useEffect, useState, type CSSProperties } from 'react'
import { facingName } from '@/engine'
import { FACING_ROWS, IDLE_FRAMES, IDLE_MS, SHEETS, spriteFrame, type SheetSpec } from '@/board/sheets'
import { FOCUS_RING_CLASS } from '../common/theme'

// The Sprite Inspector: every frame of every idle sheet, laid out the way the
// engine indexes them.
//
// It exists because the failures these sheets actually have are invisible on
// the board. A row drawn facing the wrong way looks fine until the piece turns
// that way, which may take a specific line of play to reach — Embermaw's W
// facing never occurs at all in the committed Scenario. An idle cycle that
// does not loop, or a pose that drifts off its baseline, shows up as a twitch
// once every four frames. Both are obvious the moment the frames are seen side
// by side, and neither is obvious any other way.
//
// It draws from board/sheets.ts rather than its own numbers, so what is shown
// here is what the board draws. A debug view with a private copy of the frame
// size could show a sheet as correct while the game sliced it wrong.

// What each facing is supposed to look like, as an arrow and a sentence. The
// arrow points where the piece faces on screen; a row whose art disagrees with
// its arrow is the defect this view is for.
const FACING_HINT: Record<string, { arrow: string; reads: string }> = {
  E: { arrow: '→', reads: 'profile, faces right' },
  NE: { arrow: '↗', reads: 'back turned, up-right' },
  NW: { arrow: '↖', reads: 'back turned, up-left' },
  W: { arrow: '←', reads: 'profile, faces left' },
  SW: { arrow: '↙', reads: 'front, down-left' },
  SE: { arrow: '↘', reads: 'front, down-right' },
}

type Zoom = 'board' | 'actual' | 'double'
type Ground = 'tile' | 'checker' | 'pale'

// What the frames sit on. The board's own tile colour is the honest default,
// but a dark sprite on a dark ground hides exactly the defects the keying
// step can leave behind — a halo where the glow was cut, a fringe of the old
// background, a fragment of the neighbouring pose. Those only show against
// something they do not match, so the ground is switchable.
const GROUNDS: Record<Ground, { label: string; style: CSSProperties }> = {
  tile: { label: 'tile', style: { background: 'var(--color-steel-900)' } },
  checker: {
    label: 'checker',
    style: {
      backgroundImage:
        'linear-gradient(45deg, #7a8fb2 25%, transparent 25%), linear-gradient(-45deg, #7a8fb2 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #7a8fb2 75%), linear-gradient(-45deg, transparent 75%, #7a8fb2 75%)',
      backgroundSize: '16px 16px',
      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
      backgroundColor: 'var(--color-ceramic-300)',
    },
  },
  pale: { label: 'pale', style: { background: 'var(--color-ceramic-200)' } },
}

// One frame, drawn by windowing the sheet down to a single cell.
function Frame({
  sheet,
  facing,
  step,
  zoom,
  ground,
  dim,
}: {
  sheet: SheetSpec
  facing: number
  step: number
  zoom: Zoom
  ground: Ground
  dim: boolean
}) {
  const index = spriteFrame(facing, step)
  const column = index % IDLE_FRAMES
  const row = Math.floor(index / IDLE_FRAMES)
  const scale = zoom === 'board' ? sheet.targetHeight / sheet.frameHeight : zoom === 'double' ? 2 : 1
  return (
    <div
      className={`shrink-0 ${dim ? 'opacity-55' : ''}`}
      style={{ width: sheet.frameWidth * scale, height: sheet.frameHeight * scale, ...GROUNDS[ground].style }}
      data-testid="sprite-frame"
      data-frame={index}
    >
      <div
        style={{
          width: sheet.frameWidth,
          height: sheet.frameHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          backgroundImage: `url(${sheet.url})`,
          backgroundPosition: `${-column * sheet.frameWidth}px ${-row * sheet.frameHeight}px`,
        }}
      />
    </div>
  )
}

export function SpriteInspector({ onDismiss }: { onDismiss: () => void }) {
  const kinds = Object.keys(SHEETS)
  const [kind, setKind] = useState(kinds[0])
  const [zoom, setZoom] = useState<Zoom>('board')
  const [ground, setGround] = useState<Ground>('tile')
  const [playing, setPlaying] = useState(true)
  const [step, setStep] = useState(0)
  const sheet = SHEETS[kind]

  // Runs at the board's own frame rate, so a loop that reads badly here reads
  // badly in the game.
  useEffect(() => {
    if (!playing) {
      return
    }
    const timer = setInterval(() => setStep((current) => (current + 1) % IDLE_FRAMES), IDLE_MS)
    return () => clearInterval(timer)
  }, [playing])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onDismiss])

  const control = `min-h-9 px-2.5 text-[11px] font-bold tracking-wide uppercase transition ${FOCUS_RING_CLASS}`
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-navy-950 p-4" data-testid="sprite-inspector">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-sm font-black tracking-widest text-ceramic-200 uppercase">Sprite Inspector</h2>
          {kinds.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setKind(entry)}
              data-testid={`sprite-kind-${entry}`}
              className={`${control} ${entry === kind ? 'bg-gold-500 text-gold-950' : 'bg-steel-900 text-steel-400 hover:text-ceramic-200'}`}
            >
              {entry}
            </button>
          ))}
          <span className="w-3" />
          {(['board', 'actual', 'double'] as Zoom[]).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setZoom(entry)}
              className={`${control} ${entry === zoom ? 'bg-glass-400 text-glass-950' : 'bg-steel-900 text-steel-400 hover:text-ceramic-200'}`}
            >
              {entry === 'board' ? 'board size' : entry === 'actual' ? '1:1' : '2x'}
            </button>
          ))}
          <span className="w-3" />
          {(Object.keys(GROUNDS) as Ground[]).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setGround(entry)}
              data-testid={`sprite-ground-${entry}`}
              className={`${control} ${entry === ground ? 'bg-cloth-400 text-ceramic-100' : 'bg-steel-900 text-steel-400 hover:text-ceramic-200'}`}
            >
              {GROUNDS[entry].label}
            </button>
          ))}
          <span className="w-3" />
          <button
            type="button"
            onClick={() => setPlaying((current) => !current)}
            data-testid="sprite-play"
            className={`${control} bg-steel-900 text-ceramic-200 hover:brightness-125`}
          >
            {playing ? 'pause' : 'play'}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false)
              setStep((current) => (current + 1) % IDLE_FRAMES)
            }}
            data-testid="sprite-step"
            className={`${control} bg-steel-900 text-ceramic-200 hover:brightness-125`}
          >
            step
          </button>
          <button type="button" onClick={onDismiss} data-testid="sprite-close" className={`${control} bg-ember-950 text-ember-100 hover:brightness-125`}>
            close
          </button>
        </div>

        <p className="font-mono text-[11px] text-steel-400">
          {sheet.key} · frame {sheet.frameWidth}×{sheet.frameHeight} · sheet {sheet.frameWidth * IDLE_FRAMES}×{sheet.frameHeight * FACING_ROWS.length} ·
          drawn {sheet.targetHeight}px tall · base {sheet.footOffset}px below the hex centre · frame {step + 1}/{IDLE_FRAMES}
        </p>

        {/* Rows in the engine's facing order, each labelled with the index the
            rules produce and the direction that index means. Reading down the
            arrows is the facing check: the pose has to agree with its arrow. */}
        <div className="flex flex-col gap-2">
          {FACING_ROWS.map((name, facing) => (
            <div key={name} className="flex items-center gap-3 border-t border-steel-800 pt-2" data-testid="sprite-row" data-facing={facing}>
              <div className="w-40 shrink-0">
                <div className="font-mono text-xs text-ceramic-200">
                  <span className="text-gold-300">{facing}</span> {facingName(facing)} <span className="text-lg">{FACING_HINT[name].arrow}</span>
                </div>
                <div className="text-[10px] text-steel-500">{FACING_HINT[name].reads}</div>
              </div>
              <div className="flex items-end gap-3">
                {Array.from({ length: IDLE_FRAMES }, (_, column) => (
                  // The frame the cycle is on is the lit one; the rest stay
                  // visible so a broken loop or a drifting baseline can be
                  // compared against its neighbours rather than remembered.
                  <Frame key={column} sheet={sheet} facing={facing} step={column} zoom={zoom} ground={ground} dim={column !== step} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
