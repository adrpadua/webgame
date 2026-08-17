import { axialAdd, axialDeltaFor, axialEquals, cardChargeCap, cardWindowSpeed, facingName, VALID_FACINGS } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { Modal } from './Modal'
import { CARD_EFFECT_TONE, cardEffect } from './icons'
import { FOCUS_RING_CLASS, windowToneClass } from './theme'

// Dragging the Hero to a legal hex agrees where to go and says nothing about
// what it costs — but a move is paid for with a discarded hand card (ADR
// 0011), and which card is a real tactical choice. So the gesture stops here
// and the Hand comes to the player: one plate per card, and the card that is
// pressed is the card that burns.
//
// The other two movement gestures name the card first (drag it to the hex,
// or select it and tap), so neither needs this. Cancelling costs nothing:
// no card leaves the Hand and no step reaches the Scenario.
export function MoveCostModal() {
  const pendingMove = useWorkbench((store) => store.pendingMove)
  const payForMove = useWorkbench((store) => store.payForMove)
  const cancelMove = useWorkbench((store) => store.cancelMove)
  const catalog = useWorkbench((store) => store.catalog)
  const state = useWorkbench(selectState)

  if (pendingMove === null) {
    return null
  }
  const hero = state.heroes[state.primaryHeroId]
  const heroCoords = state.board.entities[state.primaryHeroId]?.coords
  // The destination as a hex edge — the same vocabulary the MovePad and the
  // facing labels use, so the prompt names the direction the player dragged
  // rather than a pair of coordinates they never see anywhere else.
  const direction =
    heroCoords === undefined
      ? undefined
      : VALID_FACINGS.find((facing) => axialEquals(axialAdd(heroCoords, axialDeltaFor(facing)), pendingMove.destination))

  return (
    <Modal onDismiss={cancelMove} labelledBy="move-cost-title" accentBorderClass="wb-acc-glass" testId="move-cost">
      <h2 id="move-cost-title" className="text-sm font-bold text-glass-300">
        Discard a card to move {direction === undefined ? '' : facingName(direction)}
      </h2>
      <p className="mt-1 text-xs text-steel-400">The card is spent as 1 Stamina. Its text does not resolve.</p>
      <div className="mt-3 flex flex-col gap-1">
        {hero.hand.map((instance, index) => {
          const card = catalog.cards[instance.cardId]
          const windowSpeed = cardWindowSpeed(card)
          const effectTone = CARD_EFFECT_TONE[cardEffect(card)]
          const EffectIcon = effectTone.icon
          return (
            <button
              key={instance.instanceId}
              type="button"
              autoFocus={index === 0}
              data-testid="move-cost-card"
              data-card-instance={instance.instanceId}
              onClick={() => payForMove(instance.instanceId)}
              // A dim face against the panel's steel: the cards have to read
              // as plates sitting in the prompt rather than as rows of text,
              // and the panel is steel itself. The accent stays off — it is
              // the status channel, and none of these is the live one.
              className={`wb-plate wb-plate-sm wb-face-dim wb-acc-none flex min-h-12 items-center gap-2 px-2 text-left transition hover:brightness-125 ${FOCUS_RING_CLASS}`}
            >
              <EffectIcon className={`h-4 w-4 shrink-0 ${effectTone.text}`} />
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-ceramic-100">{card.title}</span>
              <span className="flex shrink-0 gap-0.5" role="img" aria-label={`Charge value ${cardChargeCap(card)}`}>
                {Array.from({ length: cardChargeCap(card) }, (_, pip) => (
                  <span key={pip} className="h-1.5 w-3 rounded-full bg-steel-600" />
                ))}
              </span>
              <span className={`shrink-0 text-[9px] font-semibold uppercase ${windowToneClass(windowSpeed)}`}>{windowSpeed}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        data-testid="cancel-move"
        onClick={cancelMove}
        className={`wb-plate wb-plate-sm wb-face-steel wb-acc-none mt-4 min-h-12 w-full text-sm font-bold text-ceramic-200 transition hover:brightness-125 ${FOCUS_RING_CLASS}`}
      >
        Stay put
      </button>
    </Modal>
  )
}
