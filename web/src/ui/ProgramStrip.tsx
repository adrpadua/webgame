import { currentProgram } from '@/engine'
import { useWorkbench } from '@/store/workbench'

export function ProgramStrip() {
  const state = useWorkbench((store) => store.state)
  const catalog = useWorkbench((store) => store.catalog)
  const program = currentProgram(catalog, state)
  if (!program) {
    return null
  }
  const rows: { track: 'instant' | 'incoming'; label: string; active: boolean }[] = [
    { track: 'instant', label: 'Instant', active: state.phase === 'instant' },
    { track: 'incoming', label: 'Incoming', active: state.phase === 'incoming' },
  ]
  return (
    <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 py-2 text-[11px]" data-testid="program-strip">
      <div className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">{program.title}</div>
      {rows.map((row) => (
        <div key={row.track} className="flex items-center gap-2 py-0.5">
          <span className={`w-16 shrink-0 font-semibold ${row.active ? 'text-amber-400' : 'text-zinc-500'}`}>{row.label}</span>
          <div className="flex flex-wrap gap-1">
            {(row.track === 'instant' ? program.instant_beats : program.incoming_beats).map((beat, index) => (
              <span
                key={`${beat.id}-${index}`}
                className={`rounded px-1.5 py-0.5 ${row.active ? 'bg-amber-950 text-amber-200' : 'bg-zinc-800 text-zinc-400'}`}
                title={beat.rules_text}
              >
                {beat.title}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
