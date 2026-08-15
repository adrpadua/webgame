import { useEffect, useMemo, useRef, useState } from 'react'
import { selectState, useWorkbench, type FactEntry } from '@/store/workbench'

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
  const statusEvent = resolution.status_event as { status_id?: string; event?: string } | undefined
  if (statusEvent?.status_id) {
    parts.push(`${statusEvent.status_id}: ${statusEvent.event}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Seed control</h2>
      <div className="mt-2 flex gap-2">
        <input
          type="number"
          value={seedDraft}
          data-testid="seed-input"
          onChange={(event) => setSeedDraft(event.target.value)}
          className="min-h-11 w-32 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="button"
          data-testid="restart-with-seed"
          onClick={() => restart(Number(seedDraft) || 1)}
          className="min-h-11 rounded-lg bg-zinc-700 px-4 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-600"
        >
          Restart with seed
        </button>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">
        Seed {state.rng.seed} · {state.rng.choices.length} audited RNG calls
      </p>
    </div>
  )
}

// Scenario: a named, versioned action-prefix replayed from a seeded initial
// state. Loading one lands mid-Encounter with the whole line walkable below.
function ScenarioPicker() {
  const catalog = useWorkbench((store) => store.catalog)
  const activeScenarioId = useWorkbench((store) => store.activeScenarioId)
  const loadScenario = useWorkbench((store) => store.loadScenario)
  const exportScenario = useWorkbench((store) => store.exportScenario)
  const scenarios = Object.values(catalog.scenarios)
  const [selected, setSelected] = useState('')
  const [copied, setCopied] = useState(false)
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Scenarios</h2>
      <div className="mt-2 flex gap-2">
        <select
          value={selected}
          data-testid="scenario-select"
          onChange={(event) => setSelected(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
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
          className="min-h-11 rounded-lg bg-zinc-700 px-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-600 disabled:opacity-40"
        >
          Load
        </button>
      </div>
      {activeScenarioId !== null && (
        <p className="mt-2 text-[11px] text-emerald-400">Loaded: {catalog.scenarios[activeScenarioId]?.title ?? activeScenarioId}</p>
      )}
      {scenarios.length === 0 && <p className="mt-2 text-[11px] text-zinc-500">No Scenarios in data/scenarios yet.</p>}
      <button
        type="button"
        data-testid="copy-scenario"
        onClick={() => {
          void navigator.clipboard.writeText(exportScenario()).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          })
        }}
        className="mt-2 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
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
      className="mt-2 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4" data-testid="time-travel">
      <h2 className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Time travel</h2>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          data-testid="tt-prev"
          disabled={index === 0}
          onClick={() => timeTravelTo(index - 1)}
          className="min-h-11 w-11 rounded-lg bg-zinc-700 text-lg font-bold text-zinc-100 transition hover:bg-zinc-600 disabled:opacity-40"
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
          className="min-w-0 flex-1 accent-emerald-500"
        />
        <button
          type="button"
          data-testid="tt-next"
          disabled={index === entries.length - 1}
          onClick={() => timeTravelTo(index + 1)}
          className="min-h-11 w-11 rounded-lg bg-zinc-700 text-lg font-bold text-zinc-100 transition hover:bg-zinc-600 disabled:opacity-40"
        >
          ›
        </button>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500" data-testid="time-travel-position">
        Step {index} / {entries.length - 1} · r{current.state.round} {current.state.phase} · {current.label}
      </p>
      {index < entries.length - 1 && (
        <p className="mt-1 text-[11px] text-amber-400">Viewing the past — the next action branches from here.</p>
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
    <aside className="flex h-[840px] w-95 flex-col gap-3" data-testid="debug-rail">
      <ScenarioPicker />
      <TimeTravel />
      <SeedControl />
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Fact log</h2>
        <div ref={logRef} className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 font-mono text-[11px]" data-testid="fact-log">
          {facts.length === 0 && <p className="text-zinc-600">Actions resolve into facts here.</p>}
          {facts.map((fact) => (
            <div key={fact.id} className="flex items-start gap-1.5" style={{ paddingLeft: fact.depth * 12 }}>
              <span className={fact.succeeded ? 'text-emerald-500' : 'text-red-500'}>{fact.succeeded ? '✓' : '✗'}</span>
              <div className="min-w-0">
                <span className="text-zinc-500">
                  r{fact.round} {fact.phase}
                </span>{' '}
                <span className="text-zinc-200">{fact.title}</span>
                {fact.reason !== '' && <span className="text-red-400"> — {fact.reason}</span>}
                {factSummary(fact) && <div className="text-amber-300/80">{factSummary(fact)}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
