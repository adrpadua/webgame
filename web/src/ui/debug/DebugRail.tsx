import { useCatalog } from '@/content/CatalogContext'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useOnboarding } from '@/store/onboarding'
import { selectState, useWorkbench, type FactEntry } from '@/store/workbench'
import { SpriteInspector } from './SpriteInspector'
import { FRAME_HEIGHT_CLASS } from '../common/theme'

// Whether the rail renders at all. It is a design tool rather than part of
// the game: on in the dev server, and on any build reached with ?debug=1 —
// so it can be opened on the deployed site when wanted, and a playtester
// handed the URL cold never sees it. Read once at import, because the answer
// cannot change without a navigation.
export const showDebugRail = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')

function factSummary(fact: FactEntry): string | null {
  const resolution = fact.resolutionFact
  if (!resolution) {
    return null
  }
  const parts: string[] = []
  if (typeof resolution.requested === 'number') {
    parts.push(`req ${resolution.requested}`)
    parts.push(`prev ${resolution.prevented}`)
    parts.push(`hp -${resolution.health_loss}`)
  }
  if (resolution.target_removed === true) {
    parts.push('target removed')
  }
  const counterEvent = resolution.counter_event as { counter_id?: string; event?: string; count?: number } | undefined
  if (counterEvent?.counter_id) {
    const count = typeof counterEvent.count === 'number' && counterEvent.count > 1 ? ` ×${counterEvent.count}` : ''
    parts.push(`${counterEvent.counter_id}: ${counterEvent.event}${count}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

// The sheets' own failures — a row facing the wrong way, a cycle that does
// not loop — are invisible on the board until a specific line of play reaches
// that facing, so they get a view that shows every frame at once.
function SpriteControl() {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex items-center justify-between rounded-2xl border border-steel-800 bg-steel-950 p-4">
      <h2 className="text-xs font-bold tracking-widest text-steel-400 uppercase">Sprites</h2>
      <button
        type="button"
        data-testid="open-sprite-inspector"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-lg bg-steel-700 px-4 text-sm font-semibold text-ceramic-200 transition hover:bg-steel-600"
      >
        Inspect sheets
      </button>
      {open && <SpriteInspector onDismiss={() => setOpen(false)} />}
    </div>
  )
}

// The How to Play guide still opens on a first visit; with the '?' gone
// from the play surface, reopening it on demand lives on the rail.
function GuideControl() {
  const openGuide = useOnboarding((store) => store.openGuide)
  return (
    <div className="flex items-center justify-between rounded-2xl border border-steel-800 bg-steel-950 p-4">
      <h2 className="text-xs font-bold tracking-widest text-steel-400 uppercase">How to play</h2>
      <button
        type="button"
        data-testid="open-guide"
        onClick={openGuide}
        className="min-h-11 rounded-lg bg-steel-700 px-4 text-sm font-semibold text-ceramic-200 transition hover:bg-steel-600"
      >
        Open guide
      </button>
    </div>
  )
}

function SeedControl() {
  const seed = useWorkbench((store) => store.seed)
  const state = useWorkbench(selectState)
  const restart = useWorkbench((store) => store.restart)
  const [seedDraft, setSeedDraft] = useState(String(seed))
  useEffect(() => {
    setSeedDraft(String(seed))
  }, [seed])
  return (
    <div className="rounded-2xl border border-steel-800 bg-steel-950 p-4">
      <h2 className="text-xs font-bold tracking-widest text-steel-400 uppercase">Seed control</h2>
      <div className="mt-2 flex gap-2">
        <input
          type="number"
          value={seedDraft}
          data-testid="seed-input"
          onChange={(event) => setSeedDraft(event.target.value)}
          className="min-h-11 w-32 rounded-lg border border-steel-700 bg-navy-950 px-3 text-sm text-ceramic-200 focus:border-glass-500 focus:outline-none"
        />
        <button
          type="button"
          data-testid="restart-with-seed"
          onClick={() => restart(Number(seedDraft) || 1)}
          className="min-h-11 rounded-lg bg-steel-700 px-4 text-sm font-semibold text-ceramic-200 transition hover:bg-steel-600"
        >
          Restart with seed
        </button>
      </div>
      <p className="mt-2 text-[11px] text-steel-500">
        Seed {state.rng.seed} · {state.rng.choices.length} audited RNG calls
      </p>
      <CoordinateToggle />
    </div>
  )
}

function CoordinateToggle() {
  const showCoordinates = useWorkbench((store) => store.showCoordinates)
  const toggleCoordinates = useWorkbench((store) => store.toggleCoordinates)
  return (
    <label className="mt-2 flex min-h-11 items-center gap-2 text-xs text-ceramic-400">
      <input type="checkbox" checked={showCoordinates} onChange={toggleCoordinates} data-testid="coords-toggle" className="accent-glass-400" />
      Show hex coordinates
    </label>
  )
}

// Scenario: a named, versioned action-prefix replayed from a seeded initial
// state. Loading one lands mid-Encounter with the whole line walkable below.
function ScenarioPicker() {
  const catalog = useCatalog()
  const activeScenarioId = useWorkbench((store) => store.activeScenarioId)
  const loadScenario = useWorkbench((store) => store.loadScenario)
  const exportScenario = useWorkbench((store) => store.exportScenario)
  const scenarios = Object.values(catalog.scenarios)
  const [selected, setSelected] = useState('')
  const [copied, setCopied] = useState(false)
  return (
    <div className="rounded-2xl border border-steel-800 bg-steel-950 p-4">
      <h2 className="text-xs font-bold tracking-widest text-steel-400 uppercase">Scenarios</h2>
      <div className="mt-2 flex gap-2">
        <select
          value={selected}
          data-testid="scenario-select"
          onChange={(event) => setSelected(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-steel-700 bg-navy-950 px-2 text-sm text-ceramic-200 focus:border-glass-500 focus:outline-none"
        >
          <option value="">Pick a Scenario…</option>
          {scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.title} (v{scenario.version})
            </option>
          ))}
        </select>
        <button
          type="button"
          data-testid="load-scenario"
          disabled={selected === ''}
          onClick={() => loadScenario(selected)}
          className="min-h-11 rounded-lg bg-steel-700 px-3 text-sm font-semibold text-ceramic-200 transition hover:bg-steel-600 disabled:opacity-40"
        >
          Load
        </button>
      </div>
      {activeScenarioId !== null && (
        <p className="mt-2 text-[11px] text-glass-400">Loaded: {catalog.scenarios[activeScenarioId]?.title ?? activeScenarioId}</p>
      )}
      {scenarios.length === 0 && <p className="mt-2 text-[11px] text-steel-500">No Scenarios in data/scenarios yet.</p>}
      <button
        type="button"
        data-testid="copy-scenario"
        onClick={() => {
          void navigator.clipboard.writeText(exportScenario()).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          })
        }}
        className="mt-2 min-h-11 w-full rounded-lg border border-steel-700 bg-navy-950 px-3 text-sm font-semibold text-ceramic-400 transition hover:bg-steel-900"
      >
        {copied ? 'Copied to clipboard' : 'Copy session as Scenario JSON'}
      </button>
      <RecordExportButton />
    </div>
  )
}

// Encounter Record schema_version 2: seals the viewed session line with
// content identity and final-state fingerprints for headless replay.
function RecordExportButton() {
  const exportRecord = useWorkbench((store) => store.exportRecord)
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      data-testid="copy-record"
      onClick={() => {
        void exportRecord()
          .then((json) => navigator.clipboard.writeText(json))
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          })
      }}
      className="mt-2 min-h-11 w-full rounded-lg border border-steel-700 bg-navy-950 px-3 text-sm font-semibold text-ceramic-400 transition hover:bg-steel-900"
    >
      {copied ? 'Copied to clipboard' : 'Copy Encounter Record (v2) JSON'}
    </button>
  )
}

function TimeTravel() {
  const entries = useWorkbench((store) => store.entries)
  const index = useWorkbench((store) => store.index)
  const timeTravelTo = useWorkbench((store) => store.timeTravelTo)
  const current = entries[index]
  return (
    <div className="rounded-2xl border border-steel-800 bg-steel-950 p-4" data-testid="time-travel">
      <h2 className="text-xs font-bold tracking-widest text-steel-400 uppercase">Time travel</h2>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          data-testid="tt-prev"
          disabled={index === 0}
          onClick={() => timeTravelTo(index - 1)}
          className="min-h-11 w-11 rounded-lg bg-steel-700 text-lg font-bold text-ceramic-200 transition hover:bg-steel-600 disabled:opacity-40"
        >
          ‹
        </button>
        <input
          type="range"
          min={0}
          max={entries.length - 1}
          value={index}
          data-testid="time-travel-slider"
          onChange={(event) => timeTravelTo(Number(event.target.value))}
          className="min-w-0 flex-1 accent-glass-400"
        />
        <button
          type="button"
          data-testid="tt-next"
          disabled={index === entries.length - 1}
          onClick={() => timeTravelTo(index + 1)}
          className="min-h-11 w-11 rounded-lg bg-steel-700 text-lg font-bold text-ceramic-200 transition hover:bg-steel-600 disabled:opacity-40"
        >
          ›
        </button>
      </div>
      <p className="mt-2 text-[11px] text-steel-500" data-testid="time-travel-position">
        Step {index} / {entries.length - 1} · r{current.state.round} {current.state.phase} · {current.label}
      </p>
      {index < entries.length - 1 && (
        <p className="mt-1 text-[11px] text-gold-400">Viewing the past — the next action branches from here.</p>
      )}
    </div>
  )
}

// The debug rail beside the portrait frame: Scenario picker, time travel,
// Resolution Fact log, and seed control.
export function DebugRail() {
  const entries = useWorkbench((store) => store.entries)
  const index = useWorkbench((store) => store.index)
  const facts = useMemo(() => entries.slice(0, index + 1).flatMap((entry) => entry.facts), [entries, index])
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const log = logRef.current
    if (log) {
      log.scrollTop = log.scrollHeight
    }
  }, [facts.length])

  return (
    // On phones the page has no padding (the play surface is edge to edge),
    // so the rail carries its own and spans the full width instead of the
    // fixed 380px that overflowed narrower viewports.
    <aside className={`flex ${FRAME_HEIGHT_CLASS} w-full flex-col gap-3 p-3 sm:w-95 sm:p-0`} data-testid="debug-rail">
      <ScenarioPicker />
      <TimeTravel />
      <SeedControl />
      <SpriteControl />
      <GuideControl />
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-steel-800 bg-steel-950 p-4">
        <h2 className="text-xs font-bold tracking-widest text-steel-400 uppercase">Fact log</h2>
        <div ref={logRef} className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 font-mono text-[11px]" data-testid="fact-log">
          {facts.length === 0 && <p className="text-steel-600">Actions resolve into facts here.</p>}
          {facts.map((fact) => (
            <div key={fact.id} className="flex items-start gap-1.5" style={{ paddingLeft: fact.depth * 12 }}>
              <span className={fact.succeeded ? 'text-glass-400' : 'text-ember-400'}>{fact.succeeded ? '✓' : '✗'}</span>
              <div className="min-w-0">
                <span className="text-steel-500">
                  r{fact.round} {fact.phase}
                </span>{' '}
                <span className="text-ceramic-300">{fact.title}</span>
                {fact.reason !== '' && <span className="text-red-400"> — {fact.reason}</span>}
                {factSummary(fact) && <div className="text-gold-300/80">{factSummary(fact)}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
