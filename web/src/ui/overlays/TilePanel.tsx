import { useCatalog } from '@/content/CatalogContext'
import { getEntityIdAt, parseHexKey } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { HexIcon } from '../common/icons'
import { GroundStatusIcons } from '../common/StatusIcons'
import { groundEntries } from '../common/statusIconEntries'
import { Notify } from './NotificationLayer'
import { FOCUS_RING_CLASS } from '../common/theme'

// The Tile Panel: the readout a tapped tile opens for the ground itself,
// beside the Stat Panel that reads the piece standing on it. Ground outlives
// whoever is on it (D-048) and answers its own questions — what it costs to
// enter, whether anything may, how long it lasts — so it is its own subject
// and its own panel rather than a row on somebody's frame.
//
// It carries the party-frame direction's tile cluster: the hex's Hazards and
// its own Counters as Status Icons, in the same tray the Hero Frame wears, so
// one mark means one thing wherever it is standing. The words are one hold
// away, which is where every HUD object's sentences live.
//
// Presentation only. Nothing here decides what ground does — the tray reads
// what the rules already put on the hex, and a Hazard that expires under an
// open panel takes its own row away.
export function TilePanel() {
  const state = useWorkbench(selectState)
  const catalog = useCatalog()
  const inspectedHexKey = useWorkbench((store) => store.inspectedHexKey)
  const dismissTile = useWorkbench((store) => store.dismissTile)
  if (inspectedHexKey === null) {
    return null
  }
  // The board is the authority on what the ground is carrying, so a hex whose
  // last Hazard burnt out while its panel stood open simply goes quiet — the
  // panel never outlives its own subject.
  const entries = groundEntries(catalog, state, inspectedHexKey)
  if (entries.length === 0) {
    return null
  }
  const occupant = state.board.entities[getEntityIdAt(state.board, parseHexKey(inspectedHexKey))]
  return (
    <Notify id="tile-panel">
      <div
        data-testid="tile-panel"
        data-hex={inspectedHexKey}
        // Oathsteel housing like the Stat Panel, on the steel accent ground
        // takes in the material language: a Hazard's own colour is already
        // burning on the icon beside it, and a second ember channel around
        // the whole plate would say the ground is the danger rather than
        // what is written on it.
        className="wb-slide-up wb-plate wb-plate-lg wb-face-steel wb-acc-none pointer-events-auto flex items-center gap-1 py-1 text-ceramic-200"
      >
        {/* Which ground: the piece standing on it, when there is one. The
            Stat Panel ties itself to its subject by naming it and the board
            rings nothing, so this does the same rather than inventing a hex
            marker — and it never prints coordinates, which are a debug
            affordance (`showCoordinates`) rather than the player's language
            for a tile. */}
        <span className="flex min-w-0 shrink items-center gap-1.5 text-xs font-semibold">
          <HexIcon className="h-4 w-4 shrink-0 text-steel-400" />
          <span className="truncate">{occupant === undefined ? 'Ground' : `Under ${occupant.title}`}</span>
        </span>
        <GroundStatusIcons hexKey={inspectedHexKey} />
        <button
          type="button"
          data-testid="tile-dismiss"
          aria-label="Close the tile panel"
          onClick={dismissTile}
          className={`ml-auto min-h-11 min-w-11 shrink-0 text-xs font-bold transition hover:scale-110 ${FOCUS_RING_CLASS}`}
        >
          ✕
        </button>
      </div>
    </Notify>
  )
}
