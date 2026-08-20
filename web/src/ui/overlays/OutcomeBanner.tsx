import { selectActive, selectOutcome, selectOutcomeReason, useWorkbench } from '@/store/workbench'
import { usePlayout } from '@/store/playout'
import { BossEmblem, HeroEmblem } from '../common/icons'
import { Notify } from './NotificationLayer'

// How the Encounter ended. Three primitives and the playout's hold: the
// banner has nothing to say about anything else that happens on the board.
export function OutcomeBanner() {
  const active = useWorkbench(selectActive)
  const outcome = useWorkbench(selectOutcome)
  const outcomeReason = useWorkbench(selectOutcomeReason)
  // The batch that ended the Encounter may still be replaying beat by beat;
  // the reveal waits for the fatal blow to land on screen.
  const outcomeHeld = usePlayout((store) => store.outcomeHeld)
  if (active || outcomeHeld) {
    return null
  }
  const victory = outcome === 'victory'
  // The stage's top rank. The Encounter ending outranks any phase word, and
  // the two never coexist anyway: this needs `active` to be false and the
  // phase banner needs it to be true.
  return (
    <Notify id="outcome">
      <div
        className={`wb-pop-in wb-plate wb-plate-xl py-6 text-center ${
          victory ? 'wb-face-steel wb-acc-gold text-gold-100' : 'wb-face-steel wb-acc-ember text-ember-100'
        }`}
        data-testid="outcome-banner"
        data-outcome={outcome}
      >
        {victory ? (
          <HeroEmblem className="wb-float mx-auto h-12 w-12 text-gold-400" />
        ) : (
          <BossEmblem className="wb-float mx-auto h-12 w-12 text-coral-400" />
        )}
        <div className="mt-2 text-2xl font-black tracking-widest uppercase">{victory ? 'Victory' : 'Defeat'}</div>
        <div className="mt-2 text-sm">{outcomeReason}</div>
      </div>
    </Notify>
  )
}
