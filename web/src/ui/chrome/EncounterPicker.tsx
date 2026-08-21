import { useState } from 'react'
import { useCatalog } from '@/content/CatalogContext'
import { selectState, useWorkbench } from '@/store/workbench'
import { encounterChoices } from './encounterChoice'
import { Modal } from '../common/Modal'
import { HexIcon } from '../common/icons'
import { FOCUS_RING_CLASS } from '../common/theme'

// The Encounter Picker: the one shipped way to change fights. It lives in
// the chrome as a compact control beside the Round display and opens a modal
// of player-facing Encounters — title, party size, and the Encounter's own
// one-line promise. Picking one starts a fresh session on that Encounter's
// authored seed; picking the current one is an honest restart.
//
// This is deliberately a list, not a start screen: the Workbench boots into
// the teaching slice exactly as before, and the picker is how a player who
// has met the game reaches the rest of it — including the two-seat Brand
// trial, where the party frames and character switching first draw.

export function EncounterPicker() {
  const catalog = useCatalog()
  const currentId = useWorkbench((store) => selectState(store).encounterId)
  const startEncounter = useWorkbench((store) => store.startEncounter)
  const [open, setOpen] = useState(false)
  const choices = encounterChoices(catalog)
  return (
    <>
      <button
        type="button"
        data-testid="encounter-picker-button"
        aria-label="Choose an Encounter"
        onClick={() => setOpen(true)}
        className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center text-steel-400 transition-colors hover:text-ceramic-200 ${FOCUS_RING_CLASS}`}
      >
        <HexIcon className="h-4 w-4" />
      </button>
      {open && (
        <Modal onDismiss={() => setOpen(false)} labelledBy="encounter-picker-title" testId="encounter-picker">
          <h2 id="encounter-picker-title" className="text-xs font-bold tracking-widest text-steel-400 uppercase">
            Encounters
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                data-testid="encounter-choice"
                data-encounter-id={choice.id}
                data-current={choice.id === currentId || undefined}
                onClick={() => {
                  startEncounter(choice.id)
                  setOpen(false)
                }}
                className={`wb-plate wb-plate-md flex flex-col items-start gap-0.5 px-1 py-1.5 text-left ${FOCUS_RING_CLASS} ${
                  choice.id === currentId ? 'wb-face-ceramic text-ceramic-950' : 'text-ceramic-200'
                }`}
              >
                <span className="flex w-full items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{choice.title}</span>
                  <span className={`shrink-0 text-[10px] font-bold tracking-widest uppercase ${choice.id === currentId ? 'text-steel-700' : 'text-glass-400'}`}>
                    {choice.partySize > 1 ? `Party of ${choice.partySize}` : 'Solo'}
                  </span>
                </span>
                <span className={`line-clamp-2 text-[11px] leading-snug ${choice.id === currentId ? 'text-steel-800' : 'text-steel-400'}`}>
                  {choice.rulesText}
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
}
