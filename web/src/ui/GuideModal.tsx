import { selectState, useWorkbench } from '@/store/workbench'
import { useOnboarding } from '@/store/onboarding'
import { BossEmblem, HeroEmblem, HexIcon, ShieldIcon, SwordIcon } from './icons'
import { Modal } from './Modal'
import { OwnerWedge, PHASE_TRACK } from './phaseTrack'
import { FOCUS_RING_CLASS } from './theme'

// The How to Play guide: a four-step illustrated walkthrough shown on the
// first visit and reopenable from the top bar. Each step pairs one concept
// with a small looping diagram, so a new player learns the round shape by
// watching it instead of reading a manual. Diagrams are pure CSS animation
// and freeze under prefers-reduced-motion.

// The same five marks the HUD's phase row wears, each paired with its word
// and its owner wedge. This is where a player learns to read that row, so
// the marks, wedges, and tones come from PHASE_TRACK rather than being
// restated here — the guide cannot teach a mark the HUD does not show.
function TimelineDiagram() {
  return (
    <div className="flex items-center justify-center gap-1.5 bg-navy-950 px-3 py-6">
      {PHASE_TRACK.map((mark, index) => (
        <div key={mark.phase} className="flex flex-col items-center gap-1.5">
          <span className="wb-beat-blink flex flex-col items-center gap-1" style={{ animationDelay: `${index * 0.8}s` }}>
            <mark.Icon className={`h-5 w-5 ${mark.activeClass}`} />
            <span className={`h-1 w-9 rounded-full ${mark.barClass}`} />
          </span>
          <OwnerWedge owner={mark.owner} className={`h-1.5 w-2.5 ${mark.activeClass}`} />
          <span className="text-[9px] font-semibold tracking-wide text-steel-400 uppercase">{mark.label}</span>
        </div>
      ))}
    </div>
  )
}

function PrepareDiagram() {
  return (
    <div className="relative flex h-32 flex-col items-center justify-between bg-navy-950 px-3 py-3">
      {/* The Slot: charge pips fill as the card arrives. */}
      <div className="wb-plate wb-plate-md wb-face-steel wb-acc-gold flex w-28 flex-col gap-1 py-1.5">
        <span className="text-[8px] font-bold text-ceramic-300">Slot</span>
        <div className="flex gap-1">
          {['1.2s', '2.4s', '3.6s'].map((delay) => (
            <span key={delay} className="wb-pip-fill h-2 w-2 rounded-full bg-steel-700" style={{ animationDelay: delay }} />
          ))}
        </div>
      </div>
      {/* The hand card that rises into the Slot, on a loop. */}
      <div className="wb-card-rise wb-plate wb-plate-md wb-face-steel wb-acc-glass absolute bottom-3 left-1/2 w-24 -translate-x-1/2 to-steel-900 py-1.5 shadow-lg">
        <span className="text-[8px] font-bold text-ceramic-200">Hand card</span>
      </div>
      <span className="text-[9px] text-steel-500">drag or tap · card goes to the Slot</span>
    </div>
  )
}

function FireDiagram() {
  return (
    <div className="flex h-32 items-center justify-center gap-6 bg-navy-950 px-3">
      <div className="flex flex-col items-center gap-2">
        <div className="wb-glow-ring wb-plate wb-plate-md wb-face-steel wb-acc-gold flex h-14 w-20 items-center justify-center">
          <SwordIcon className="h-6 w-6 text-gold-300" />
        </div>
        <span className="text-[9px] text-steel-500">glowing Slot: tap to fire</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex h-14 w-24 items-center">
          {[0, 1, 2].map((index) => (
            <HexIcon key={index} className="h-10 w-10 shrink-0 text-steel-700" />
          ))}
          <HeroEmblem className="wb-hex-step absolute top-2 left-0 h-6 w-6 text-cloth-300" />
        </div>
        <span className="text-[9px] text-steel-500">drop a card on a hex to move</span>
      </div>
    </div>
  )
}

export function GuideModal() {
  const guideOpen = useOnboarding((store) => store.guideOpen)
  const guideStep = useOnboarding((store) => store.guideStep)
  const setGuideStep = useOnboarding((store) => store.setGuideStep)
  const closeGuide = useOnboarding((store) => store.closeGuide)
  const state = useWorkbench(selectState)
  const boss = state.board.entities[state.bossId]
  const hero = state.board.entities[state.primaryHeroId]

  if (!guideOpen) {
    return null
  }

  const steps = [
    {
      // This step used to open on "Defeat Embermaw — bring the boss to zero
      // within 8 Rounds", and both halves were false. D-016 makes a solo Boss
      // kill a tuning defect rather than a goal ("Boss defeat belongs to a
      // Party"), and the sweep holds it: `victory%` is 0 across 1,200 runs,
      // every one of them ending at Escalation rather than at Boss Health.
      // The 8 Rounds went the same way — ADR 0027 retired the round limit, so
      // the clock is the gauge on the Boss's strip, which arrives sooner when
      // a demand goes unanswered.
      //
      // So the premise names the real one. Hold, rather than kill: it is what
      // the slice actually asks, it is Elian Voss's own word (D-012's Hold,
      // Brace, Cover, Clear, Advance), and it points a first-time player at
      // the clock they are actually racing. "Coral" is deliberate — the next
      // step teaches that coral is the Boss, and this is the same bar.
      title: boss ? `Hold the line against ${boss.title}` : 'Hold the line',
      body: `You are ${hero?.title ?? 'the party tank'}, alone. Bringing a boss down takes a party — your fight is the coral bar top right. It fills every Round, and faster when a demand goes unanswered.`,
      diagram: (
        <div className="flex items-center justify-center gap-6 bg-navy-950 px-3 py-5">
          <div className="flex flex-col items-center gap-1">
            <HeroEmblem className="wb-float h-14 w-14 text-cloth-300" />
            <span className="text-[9px] font-semibold text-cloth-300">{hero?.title ?? 'You'}</span>
            <span className="bg-ceramic-950 px-1.5 text-[9px] text-ceramic-200">{hero?.maxHealth ?? '–'} HP</span>
          </div>
          <span className="text-lg font-black text-steel-600">VS</span>
          <div className="flex flex-col items-center gap-1">
            <BossEmblem className="wb-float h-16 w-16 text-coral-400" />
            <span className="text-[9px] font-semibold text-coral-300">{boss?.title ?? 'Boss'}</span>
            <span className="bg-coral-900 px-1.5 text-[9px] text-coral-200">{boss?.maxHealth ?? '–'} HP</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Every Round runs one track',
      // The marks and their tones are the row the HUD wears, so the words
      // name what is actually drawn: coral is the Boss, and the two windows
      // between its beats are yours.
      body: 'The coral down-wedge beats are the boss striking. The up-wedge Quick and Slow windows between them are yours. Next moves the track.',
      diagram: <TimelineDiagram />,
    },
    {
      title: 'Prepare, then charge',
      body: 'Drag a card onto a Slot to prepare it. Tuck more cards under it to add Charge.',
      diagram: <PrepareDiagram />,
    },
    {
      title: 'Fire in the matching window',
      body: 'A glowing Slot is ready — tap it. Or discard a card onto a nearby hex to step clear.',
      diagram: <FireDiagram />,
    },
  ]
  const step = steps[guideStep]
  const lastStep = guideStep === steps.length - 1

  return (
    <Modal onDismiss={closeGuide} labelledBy="guide-title" accentBorderClass="wb-acc-gold" testId="guide-modal">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest text-gold-400 uppercase">How to play</span>
        <button
          type="button"
          data-testid="guide-skip"
          onClick={closeGuide}
          className={`min-h-11 px-3 text-xs font-semibold text-steel-400 transition hover:text-ceramic-300 ${FOCUS_RING_CLASS}`}
        >
          Skip
        </button>
      </div>
      <h2 id="guide-title" className="mt-1 text-base font-bold text-ceramic-100">
        {step.title}
      </h2>
      <div className="mt-3" key={guideStep}>
        <div className="wb-slide-up">{step.diagram}</div>
        <p className="wb-slide-up mt-3 text-xs leading-relaxed text-ceramic-300" style={{ animationDelay: '0.08s' }}>
          {step.body}
        </p>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {/* Progress indicators only — Back and Next are the navigation, so
            these stay non-interactive and exempt from the 44px target rule. */}
        <div className="flex flex-1 gap-1.5" role="img" aria-label={`Step ${guideStep + 1} of ${steps.length}`}>
          {steps.map((_, index) => (
            <span key={index} className={`h-2.5 w-2.5 rounded-full transition ${index === guideStep ? 'bg-gold-400' : 'bg-steel-700'}`} />
          ))}
        </div>
        {guideStep > 0 && (
          <button
            type="button"
            data-testid="guide-back"
            onClick={() => setGuideStep(guideStep - 1)}
            className={`wb-plate wb-plate-sm wb-face-steel wb-acc-none min-h-12 text-sm font-bold text-ceramic-200 transition hover:brightness-125 ${FOCUS_RING_CLASS}`}
          >
            Back
          </button>
        )}
        <button
          type="button"
          data-testid={lastStep ? 'guide-start' : 'guide-next'}
          onClick={() => (lastStep ? closeGuide() : setGuideStep(guideStep + 1))}
          className={`wb-plate wb-plate-sm wb-face-gold wb-acc-gold min-h-12 text-sm font-bold text-gold-950 transition hover:brightness-110 active:translate-y-px ${FOCUS_RING_CLASS}`}
        >
          {lastStep ? 'Start playing' : 'Next'}
        </button>
      </div>
      {guideStep === 0 && (
        <div className="mt-3 flex items-center gap-2 bg-steel-900/70 px-3 py-2 text-[10px] text-steel-400">
          <ShieldIcon className="h-3.5 w-3.5 shrink-0 text-glass-400" />
          Hold anything — a card, a Slot, a boss beat — to read it. On a desktop, hover it.
        </div>
      )}
    </Modal>
  )
}
