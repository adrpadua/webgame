import { useCatalog } from '@/content/CatalogContext'
import { type HeroState } from '@/engine'
import { usePlayout } from '@/store/playout'
import { selectPilotId, selectState, useWorkbench } from '@/store/workbench'
import { signatureControl, type SignatureControl as SignatureControlState } from './heroFrame'
import { useDamageFlash } from '../common/useDamageFlash'
import { HeartIcon, HeroEmblem, ShieldIcon } from '../common/icons'
import { HERO_STAT_DETAILS, slotDetail } from '../common/holdDetails'
import { useHold } from '../common/HoldPopover'
import { StatusIcons } from '../common/StatusIcons'
import { FOCUS_RING_CLASS, GAUGE_FILL_CLASS, GAUGE_LABEL_CLASS, GAUGE_TRACK_CLASS, healthBarScale } from '../common/theme'

// The Hero Frame (D-065, ADR 0033): the primary Hero's persistent readout,
// floating over the board's bottom edge, built to the unit-frame anatomy an
// MMO player already reads — a left-justified vertical stack of name, then
// health with the Armor overlay, then the class resource where mana sits,
// then the deck and discard counts. It absorbed the hero branch of the Stat
// Panel and never dismisses; a tap on the Hero's tile pulses it instead of
// opening a panel.
//
// The whole frame is one hold target rather than a column of them. That is
// the constraint doing the shaping: every button on the play surface owes a
// 44px tap target, so a stack of four interactive rows would be 176px of
// chrome over a board that has 95px to spare below its last hex row. One
// target over the stack costs 58px and still carries the sentences a hold is
// for. The Status Icons beside the frame answer the same constraint the same
// way (D-088): one tray, one target, and a popup that names every Counter in
// it, rather than 44px of chrome per mark.
//
// The Signature is a separate control (`SignatureButton`), on screen only
// while it can fire. The frame's resource bar and that button are two faces
// of one state (`heroFrame.ts`): the bar carries the earn, the button
// carries the readiness.
//
// The board never resizes for any of it — at 390 points the board is
// width-bound and this floats in the container's spare height.

export const HERO_FRAME_CLEARANCE_CLASS = 'pb-[60px]'

// The unit frame's gauges: health as the dominant bar with Armor riding it in
// the same currency, and — where the Hero fields a Signature — the class
// resource as a thin bar beneath, in the position an MMO reserves for mana.
function HeroGauges({
  hero,
  flashing,
  flashKey,
  signature,
}: {
  hero: HeroState
  flashing: boolean
  flashKey: number
  signature: SignatureControlState | null
}) {
  const scale = healthBarScale(hero.health, hero.maxHealth, hero.armor)
  const healthFraction = Math.max(0, hero.health) / scale
  const armorFraction = Math.max(0, hero.armor) / scale
  return (
    <>
      <span className={`${GAUGE_TRACK_CLASS} w-full`} data-testid="hero-health">
        <span className={`${GAUGE_FILL_CLASS} bg-ember-500/70`} style={{ width: `${healthFraction * 100}%` }} />
        <span
          className="absolute inset-y-0 bg-glass-500/70 transition-[left,width] duration-300"
          style={{ left: `${healthFraction * 100}%`, width: `${armorFraction * 100}%` }}
        />
        <span className={`${GAUGE_LABEL_CLASS} text-[10px] text-ember-100`}>
          <HeartIcon className="h-3 w-3 shrink-0" />
          <span key={flashKey} className={flashing ? 'wb-damage-flash origin-left' : undefined}>
            {hero.health}/{hero.maxHealth}
          </span>
          {hero.armor > 0 && (
            <>
              <ShieldIcon className="ml-0.5 h-3 w-3 shrink-0 text-glass-300" />
              <span data-testid="hero-armor" className="text-glass-100">
                {hero.armor}
              </span>
            </>
          )}
        </span>
      </span>
      {signature !== null && <ResourceBar signature={signature} />}
    </>
  )
}

// The class resource, as a bar rather than a control: it is read, never
// pressed — the Signature button is what takes the press. Segmented because
// the resource is counted rather than continuous, so the bar can look like a
// mana bar without lying about what a Charge is, and unlabelled because its
// position is the label: a second bar under the health bar of a unit frame
// is the class resource, and the button that arrives when it fills names it.
function ResourceBar({ signature }: { signature: SignatureControlState }) {
  const { charges, cap, face } = signature
  return (
    <span
      className="flex h-[7px] w-full items-stretch gap-0.5 overflow-hidden rounded-xs bg-steel-950 p-[1px]"
      data-testid="signature-resource"
      data-charges={charges}
      aria-hidden="true"
    >
      {Array.from({ length: cap }, (_, index) => (
        <span
          // Keyed by whether it is filled, so a fresh earn remounts that
          // segment and its pop plays exactly once — the frame half of the
          // earn moment; the board half floats at the Hero's hex.
          key={`${index}-${index < charges}`}
          // An empty segment has to be legible as a segment: the meter's
          // job while unearned is to say how many there are to fill, which
          // is how a permanently visible resource teaches its own earn.
          className={`flex-1 rounded-[1px] transition-colors ${
            index < charges ? `wb-pop-in ${face === 'ready' ? 'bg-gold-300' : 'bg-gold-500'}` : 'bg-steel-700'
          }`}
        />
      ))}
    </span>
  )
}

// The Signature button: its own plate at the row's right end, mounted only
// while the Signature can actually be fired — the button *is* the offer, so
// one that cannot be pressed is an offer the rules deny, which is the claim
// the Action Bar's own dimming rules already refuse to let a Slot make.
// Being transient is also why it does not touch ADR 0006's persistent-button
// clause, which stands.
//
// What a permanent control would have carried, the frame carries instead:
// the resource bar shows the Charges through every window, so the earn is
// still taught by a visibly empty meter and a held bank is still readable in
// the windows the Signature cannot act in. That division is what makes
// appear-when-usable safe here — without the bar it would hide the whole
// mechanic, which is why it was refused before the bar existed.
function SignatureButton() {
  const state = useWorkbench(selectState)
  const catalog = useCatalog()
  const fireSlot = useWorkbench((store) => store.fireSlot)
  const pilotId = useWorkbench(selectPilotId)
  const control = signatureControl(catalog, state, pilotId)
  const hold = useHold(
    control === null
      ? null
      : slotDetail(control.card, state.heroes[pilotId].actionBar[control.slotIndex], control.slotIndex, state.phase),
  )
  if (control === null || control.face !== 'ready') {
    return null
  }
  const { face, charges, cap, card, slotIndex, resourceTitle } = control
  return (
    <button
      type="button"
      {...hold.holdProps}
      data-testid="signature-control"
      data-signature-face={face}
      data-charges={charges}
      aria-label={`${card.title}: ${charges} of ${cap} ${resourceTitle}, ready — tap to fire`}
      onClick={() => {
        if (hold.consumeHold()) {
          return
        }
        fireSlot(slotIndex)
      }}
      // 84px, not 74px. `Riposte` measures 45.7px at this size and weight, and
      // wb-plate-sm's derived padding leaves a 74px plate 44px of content box —
      // so the one control whose job is naming the power shipped it as
      // `RIPOS...`. The row has the width to spare: this button sits at the end
      // of a flex row whose only other fixed member is the 208px frame, on a
      // 390pt surface. Widen the plate rather than cut the tracking or drop the
      // verb; the verb is what makes it read as pressable.
      className={`wb-pop-in wb-plate wb-plate-sm wb-face-gold wb-acc-gold pointer-events-auto ml-auto flex min-h-13 w-[84px] shrink-0 flex-col items-center justify-center gap-0.5 py-1.5 text-gold-950 ${FOCUS_RING_CLASS}`}
    >
      <span className="w-full truncate text-center text-[10px] leading-none font-black tracking-wide uppercase">{card.title}</span>
      <span className="text-[9px] leading-none font-bold tracking-wide text-gold-900 uppercase">Fire</span>
    </button>
  )
}

export function HeroFrame() {
  const state = useWorkbench(selectState)
  const catalog = useCatalog()
  const heroId = useWorkbench(selectPilotId)
  const hero = state.heroes[heroId]
  const override = usePlayout((store) => store.overrides[heroId])
  const pulse = useWorkbench((store) => store.heroFramePulse)
  const shownHealth = override?.health ?? hero?.health ?? 0
  // A hit must be visible even while the player's eyes are on the board: the
  // number flashes per beat, when the blow's playout moment arrives.
  const { flashing, flashKey } = useDamageFlash(shownHealth)
  const signature = hero === undefined ? null : signatureControl(catalog, state, heroId)
  const resourceStat = signature === null ? [] : [{ label: signature.resourceTitle, value: `${signature.charges} / ${signature.cap}` }]
  // One hold for the whole frame: the numbers are all printed on it, so what
  // a hold still owes the player is the sentences behind them.
  // The frame prints the first name; the hold is where the whole name is
  // told (D-095). A hold is the surface this HUD keeps its words on, and
  // "Captain Elian Voss" is a word about who the Hero is rather than a
  // readout of what is happening to them.
  const hold = useHold({
    ...HERO_STAT_DETAILS.health,
    title: catalog.heroes[heroId]?.full_name || state.board.entities[heroId]?.title || 'Hero',
    stats: [
      { label: 'Health', value: `${hero?.health ?? 0} / ${hero?.maxHealth ?? 0}` },
      { label: 'Armor now', value: String(hero?.armor ?? 0) },
      ...resourceStat,
      { label: 'Deck', value: String(hero?.deck.length ?? 0) },
      { label: 'Discard', value: String(hero?.discard.length ?? 0) },
    ],
    text: `${HERO_STAT_DETAILS.health.text} ${HERO_STAT_DETAILS.armor.text} ${HERO_STAT_DETAILS.cards.text}`,
  })
  if (!hero) {
    return null
  }
  const shownHero = override ? { ...hero, health: override.health, armor: override.armor ?? hero.armor } : hero
  const title = state.board.entities[heroId]?.title ?? heroId
  const resourceLabel = signature === null ? '' : `, ${signature.resourceTitle} ${signature.charges} of ${signature.cap}`
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end gap-1.5 px-2 pb-1">
      <button
        type="button"
        {...hold.holdProps}
        data-testid="hero-frame"
        // Keyed on the pulse counter: tapping the Hero's tile replays the
        // pop, pointing the tap at the chrome that answers it.
        key={pulse}
        aria-label={`${title}, health ${shownHero.health} of ${shownHero.maxHealth}, Armor ${shownHero.armor}${resourceLabel}, ${hero.deck.length} in deck, ${hero.discard.length} in discard`}
        className={`wb-pop-in wb-plate wb-plate-lg wb-face-ceramic wb-acc-cloth pointer-events-auto flex w-[208px] shrink-0 flex-col items-start gap-0.5 py-0.5 text-left text-ceramic-950 ${FOCUS_RING_CLASS}`}
      >
        <span className="flex w-full items-center gap-1 text-[11px] leading-none font-semibold">
          <HeroEmblem className="h-3.5 w-3.5 shrink-0 text-cloth-500" />
          <span className="truncate">{title}</span>
        </span>
        <HeroGauges hero={shownHero} flashing={flashing} flashKey={flashKey} signature={signature} />
        {/* Deck and discard, the two piles a Hand refills from. Counts rather
            than a gauge: a fraction of an unseen total says less than the two
            numbers whose sum the player can watch move. */}
        <span className="flex items-center gap-2.5 text-[10px] leading-none font-semibold text-ceramic-700">
          <span className="flex items-center gap-1" data-testid="deck-count">
            <DeckIcon className="h-3 w-3 shrink-0" />
            {hero.deck.length}
          </span>
          <span className="flex items-center gap-1" data-testid="discard-count">
            <DiscardIcon className="h-3 w-3 shrink-0" />
            {hero.discard.length}
          </span>
        </span>
      </button>
      {/* Counters sit beside the frame, where an MMO puts its buffs: they are
          the Hero's state, but each is its own authored rule, which a hold on
          the frame's own numbers cannot explain. The tray is their readout and
          their hold target both — packed at the density the direction drew,
          because the row has to hold three of them beside a 208px frame. */}
      <StatusIcons entityId={heroId} />
      <SignatureButton />
    </div>
  )
}

function DeckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="currentColor">
      <rect x="3" y="5" width="9" height="12" rx="1.5" opacity="0.55" />
      <rect x="8" y="3" width="9" height="12" rx="1.5" />
    </svg>
  )
}

function DiscardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="currentColor">
      {/* A card dropping into a pile: the arrow is what separates discard
          from deck at 12 pixels, where two card stacks look identical. */}
      <path d="M9 2h2v5h2.6L10 11.6 6.4 7H9V2Z" />
      <rect x="3.5" y="13" width="13" height="4" rx="1.2" opacity="0.55" />
    </svg>
  )
}
