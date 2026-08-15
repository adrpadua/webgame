import { useEffect, useRef, useState } from 'react'
import { useWorkbench, type FactEntry } from '@/store/workbench'

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

// The debug rail lives beside the portrait frame: Resolution Fact log and
// seed control in M1; scenario picker and time travel arrive with M2.
export function DebugRail() {
  const facts = useWorkbench((store) => store.facts)
  const seed = useWorkbench((store) => store.seed)
  const state = useWorkbench((store) => store.state)
  const restart = useWorkbench((store) => store.restart)
  const [seedDraft, setSeedDraft] = useState(String(seed))
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSeedDraft(String(seed))
  }, [seed])

  useEffect(() => {
    const log = logRef.current
    if (log) {
      log.scrollTop = log.scrollHeight
    }
  }, [facts.length])

  return (
    <aside className="flex h-[840px] w-95 flex-col gap-3" data-testid="debug-rail">
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
