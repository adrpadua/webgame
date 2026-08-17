import { cardChargeCap, cardWindowSpeed, type Card } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { blocksTarget } from './firstTurnScript'
import { useFirstTurnStep } from './useFirstTurn'
import { handCanAct } from './slots'
import { handFace, movePrepped, payingKeywords, shownKeywords, type HandFace } from './handFace'
import { CARD_EFFECT_TONE, cardEffect } from './icons'
import { keywordIcon, StaminaIcon } from './keywordIcons'
import { cardDetail } from './holdDetails'
import { useHold } from './HoldPopover'
import { FOCUS_RING_CLASS, GATED_CLASS, SPOTLIGHT_CLASS, windowToneClass } from './theme'

// The Hand: equal Compact Cards anchored to the bottom interaction zone. What
// each one shows is the face the current gesture calls for — see handFace.ts
// for why a card in the Quick Window stops leading with its own identity.
// Hold one to read the full card in either case; tap (or focus and press
// Enter) to select it for the tap path.

// The card as itself: a name, an effect colour, its window speed, and its
// Charge Value as pips — no rules text. What a Slot would get if this card
// were prepared into one.
function CardFace({ card }: { card: Card }) {
  const windowSpeed = cardWindowSpeed(card)
  const effectTone = CARD_EFFECT_TONE[cardEffect(card)]
  const EffectIcon = effectTone.icon
  return (
    <>
      {/* A five-card Hand leaves each card 56px of content. The title takes
          all of it: sharing the row with the effect icon left 38px, and the
          longest card name in the catalogue ("Unyielding", 60px at 11px)
          overran that — first into the neighbouring plate, then into the
          icon. At 10px every catalogue word fits its own line, and
          break-words contains anything longer that arrives later. */}
      <div className="text-[10px] leading-tight font-bold break-words text-ceramic-100">{card.title}</div>
      {/* The speed word carries its own colour, so the tone dot that used to
          lead this row said nothing the word did not — dropping it is what
          makes room for the effect icon here. */}
      <div className={`mt-1 flex items-center gap-1 text-[9px] font-semibold uppercase ${windowToneClass(windowSpeed)}`}>
        {windowSpeed}
        <EffectIcon className={`ml-auto h-3.5 w-3.5 shrink-0 ${effectTone.text}`} />
      </div>
      <div className="mt-1.5 flex gap-0.5" role="img" aria-label={`Charge value ${cardChargeCap(card)}`}>
        {Array.from({ length: cardChargeCap(card) }, (_, index) => (
          <span key={index} className="h-1.5 w-3 rounded-full bg-steel-600" />
        ))}
      </div>
    </>
  )
}

// The player-window face: the card's Keywords, in the Hero's own marks, above
// a demoted name. A Keyword a loaded Top Card would pay off for takes living
// gold — the material of every mechanism the player operates — and the rest
// stay steel. Gone from this face are the window speed and the Charge Value
// pips: both describe the card as a Top Card, and a card being tucked adds
// one Charge whatever its own speed or capacity says (CONTEXT.md, Charge
// Timing) — which is also why Slow wears this face as readily as Quick. The
// name stays, small, because a Slot that is still empty can be prepared in
// either window and that is the one choice the name is needed for.
function KeywordFace({ card, heroId, keywords, paying }: { card: Card; heroId: string; keywords: string[]; paying: Set<string> }) {
  return (
    <>
      <div className="flex min-h-9 flex-wrap items-center justify-center gap-1.5">
        {keywords.map((tag) => {
          const Icon = keywordIcon(heroId, tag)
          return <Icon key={tag} className={`h-5 w-5 shrink-0 ${paying.has(tag) ? 'text-gold-400' : 'text-steel-400'}`} />
        })}
      </div>
      <div className="mt-1 text-center text-[9px] leading-tight font-semibold break-words text-steel-500">{card.title}</div>
    </>
  )
}

// A move is being lined up, so this card is one Stamina and one hex — the
// whole Hand is a stack of interchangeable coins, and looking like anything
// else would suggest the choice of which one to spend matters more than it
// does. The card actually being spent keeps its name and reads in runeglass,
// the colour the board is painting the destination in; the rest are the pool
// behind it.
function StaminaFace({ card, paying }: { card: Card; paying: boolean }) {
  return (
    <>
      <div className="flex min-h-9 items-center justify-center">
        <StaminaIcon className={`h-7 w-7 ${paying ? 'text-glass-400' : 'text-steel-500'}`} />
      </div>
      <div className="mt-1 text-center text-[9px] leading-tight font-semibold break-words text-steel-500">{paying ? card.title : ''}</div>
    </>
  )
}

function faceLabel(face: HandFace, card: Card, keywordTitles: string[]): string {
  switch (face) {
    case 'keywords':
      return `${card.title}. Keywords: ${keywordTitles.join(', ') || 'none'}`
    case 'stamina':
      return `${card.title}. 1 Stamina: steps the Hero one hex`
    case 'card':
      return `${card.title}. ${cardWindowSpeed(card) === 'quick' ? 'Quick' : 'Slow'} window, Charge value ${cardChargeCap(card)}`
  }
}

function CompactCard({
  instanceId,
  cardId,
  face,
  paying,
  spotlit,
  gated,
  width,
}: {
  instanceId: string
  cardId: string
  face: HandFace
  paying: Set<string>
  spotlit: boolean
  gated: boolean
  width: string
}) {
  const catalog = useWorkbench((store) => store.catalog)
  const setDraggingCard = useWorkbench((store) => store.setDraggingCard)
  const selectCard = useWorkbench((store) => store.selectCard)
  const selected = useWorkbench((store) => store.selectedCardId === instanceId)
  const dragging = useWorkbench((store) => store.draggingCardId === instanceId)
  const heroId = useWorkbench((store) => selectState(store).primaryHeroId)
  const card = catalog.cards[cardId]
  const hold = useHold(cardDetail(card, 'hand', 'Drop it on a Slot to prepare or charge it.'))
  // With nothing dragged or selected — the Hero is being held instead — no
  // card is committed to the move, so none of them is the one being spent.
  const spending = dragging || selected
  const keywords = shownKeywords(catalog, card.tags)

  return (
    <button
      type="button"
      draggable
      data-testid="hand-card"
      data-card-id={cardId}
      data-card-instance={instanceId}
      data-selected={selected}
      data-scripted={spotlit}
      data-face={face}
      aria-label={faceLabel(
        face,
        card,
        keywords.map((tag) => catalog.keywords[tag]?.title ?? tag),
      )}
      {...hold.holdProps}
      onClick={() => {
        // A press that opened the detail popup is not a selection tap.
        if (!hold.consumeHold()) {
          selectCard(instanceId)
        }
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', instanceId)
        event.dataTransfer.effectAllowed = 'move'
        setDraggingCard(instanceId)
      }}
      onDragEnd={() => setDraggingCard(null)}
      style={{ width }}
      className={`wb-plate wb-plate-card wb-face-steel min-h-24 shrink-0 cursor-grab py-1.5 text-left transition hover:-translate-y-1 active:cursor-grabbing ${FOCUS_RING_CLASS} ${
        // A Compact Card is a raked oathsteel plate. Its timing seam is drawn by
        // the card body below; selection lifts it and takes the gold accent.
        // While a move is being lined up the accent turns runeglass on the
        // card that would pay for it: the same material the board is painting
        // the destination in, so the two ends of the gesture match.
        face === 'stamina' && spending
          ? '-translate-y-1 wb-acc-glass ring-2 ring-glass-400'
          : selected
            ? '-translate-y-1 wb-acc-gold ring-2 ring-gold-400'
            : 'wb-acc-none'
      } ${spotlit ? `wb-acc-gold ${SPOTLIGHT_CLASS}` : ''} ${gated ? GATED_CLASS : ''}`}
    >
      {face === 'card' && <CardFace card={card} />}
      {face === 'keywords' && <KeywordFace card={card} heroId={heroId} keywords={keywords} paying={paying} />}
      {face === 'stamina' && <StaminaFace card={card} paying={spending} />}
    </button>
  )
}

export function Hand() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const hoveredHexKey = useWorkbench((store) => store.hoveredHexKey)
  const draggingCardId = useWorkbench((store) => store.draggingCardId)
  const selectedCardId = useWorkbench((store) => store.selectedCardId)
  const heroRoutePreview = useWorkbench((store) => store.heroRoutePreview)
  const step = useFirstTurnStep()
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return null
  }
  // Two reasons a Hand goes quiet, and they compose. The scripted first turn
  // gates it while a step points elsewhere. And during a Boss row — Instant
  // or Incoming — no card in hand has a legal action, so the Hand recedes on
  // its own: the interface must not hold four cards at full brightness
  // through a phase in which every one of them is illegal. The band keeps
  // its height either way, because the board sizes to the space the HUD
  // leaves and must never resize mid-Encounter.
  const handGated = blocksTarget(step, 'hand') || !handCanAct(state)
  const face = handFace(state, movePrepped(state, { hoveredHexKey, draggingCardId, selectedCardId, heroRoutePreview }))
  const paying = payingKeywords(catalog, state)
  // A Compact Card keeps one width — its share of a full Hand — whether
  // five cards remain or one. Cards that stretched to fill the row stopped
  // reading as cards; a thinning Hand stays centered, with the freed space
  // splitting evenly to either side. The wrap only matters if a Hand ever
  // outgrows its refill target: extra cards start a second row instead of
  // overflowing.
  const slotCount = Math.max(hero.refillTarget, hero.hand.length, 1)
  // 0.25rem is the row's gap-1; change them together.
  const cardWidth = `calc((100% - ${(slotCount - 1) * 0.25}rem) / ${slotCount})`

  // min-h-30 reserves the full-hand row height (min-h-24 cards + py-3) even
  // as the Hand empties: the board above sizes to the space the HUD leaves,
  // and playing out the Hand must not make the board grow mid-Encounter.
  return (
    <div
      // px-2/gap-1 rather than px-3/gap-1.5: at a five-card refill the row's
      // own chrome was costing 16px of card width, and the widest card name
      // in the catalogue needs every one of them to sit on one line.
      className="flex min-h-30 flex-wrap content-center justify-center gap-1 border-t border-steel-800 bg-navy-950/90 px-2 py-3"
      data-testid="hand"
      data-face={face}
      data-inert={handCanAct(state) ? undefined : 'true'}
    >
      {hero.hand.map((instance) => {
        // The script points at one card at a time; the rest of the Hand
        // waits its turn.
        const scripted = step?.cardInstanceId ?? null
        const spotlit = !handGated && scripted === instance.instanceId
        const gated = handGated || (scripted !== null && scripted !== instance.instanceId)
        return (
          <CompactCard
            key={instance.instanceId}
            instanceId={instance.instanceId}
            cardId={instance.cardId}
            face={face}
            paying={paying}
            spotlit={spotlit}
            gated={gated}
            width={cardWidth}
          />
        )
      })}
      {hero.hand.length === 0 && <div className="flex-1 py-4 text-center text-xs text-steel-600">Hand is empty</div>}
    </div>
  )
}
