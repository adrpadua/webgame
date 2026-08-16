import { selectState, useWorkbench } from '@/store/workbench'
import { useOnboarding } from '@/store/onboarding'
import { BossEmblem, HeroEmblem, HexIcon, ShieldIcon, SwordIcon } from './icons'
import { Modal } from './Modal'
import { FOCUS_RING_CLASS } from './theme'

// The How to Play guide: a four-step illustrated walkthrough shown on the
// first visit and reopenable from the top bar. Each step pairs one concept
// with a small looping diagram, so a new player learns the round shape by
// watching it instead of reading a manual. Diagrams are pure CSS animation
// and freeze under prefers-reduced-motion.

function TimelineDiagram() {
  const beats = [
    { label: 'Loadout', tone: 'bg-zinc-600', delay: '0s' },
    { label: 'Instant', tone: 'bg-amber-500', delay: '0.8s' },
    { label: 'Quick', tone: 'bg-emerald-500', delay: '1.6s' },
    { label: 'Incoming', tone: 'bg-amber-500', delay: '2.4s' },
    { label: 'Slow', tone: 'bg-sky-500', delay: '3.2s' },
  ]
  return (
    <div className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-950 px-3 py-6">
      {beats.map((beat, index) => (
        <div key={index} className="flex flex-col items-center gap-1.5">
          <span className={`wb-beat-blink h-3.5 w-11 rounded-full ${beat.tone}`} style={{ animationDelay: beat.delay }} />
          <span className="text-[9px] font-semibold tracking-wide text-zinc-400 uppercase">{beat.label}</span>
        </div>
      ))}
    </div>
  )
}

function PrepareDiagram() {
  return (
    <div className="relative flex h-32 flex-col items-center justify-between rounded-xl bg-zinc-950 px-3 py-3">
      {/* The Slot: charge pips fill as the card arrives. */}
      <div className="flex w-28 flex-col gap-1 rounded-lg border-2 border-emerald-500/70 bg-zinc-800 p-1.5">
        <span className="text-[8px] font-bold text-zinc-200">Slot</span>
        <div className="flex gap-1">
          {['1.2s', '2.4s', '3.6s'].map((delay) => (
            <span key={delay} className="wb-pip-fill h-2 w-2 rounded-full bg-zinc-700" style={{ animationDelay: delay }} />
          ))}
        </div>
      </div>
      {/* The hand card that rises into the Slot, on a loop. */}
      <div className="wb-card-rise absolute bottom-3 left-1/2 w-24 -translate-x-1/2 rounded-lg border border-zinc-500 bg-linear-to-b from-zinc-600 to-zinc-800 p-1.5 shadow-lg">
        <span className="text-[8px] font-bold text-zinc-100">Hand card</span>
      </div>
      <span className="text-[9px] text-zinc-500">drag or tap · card goes to the Slot</span>
    </div>
  )
}

function FireDiagram() {
  return (
    <div className="flex h-32 items-center justify-center gap-6 rounded-xl bg-zinc-950 px-3">
      <div className="flex flex-col items-center gap-2">
        <div className="wb-glow-ring flex h-14 w-20 items-center justify-center rounded-lg border-2 border-emerald-400 bg-emerald-950/60">
          <SwordIcon className="h-6 w-6 text-emerald-300" />
        </div>
        <span className="text-[9px] text-zinc-500">glowing Slot: tap to fire</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex h-14 w-24 items-center">
          {[0, 1, 2].map((index) => (
            <HexIcon key={index} className="h-10 w-10 shrink-0 text-zinc-700" />
          ))}
          <HeroEmblem className="wb-hex-step absolute top-2 left-0 h-6 w-6 text-sky-400" />
        </div>
        <span className="text-[9px] text-zinc-500">drop a card on a hex to move</span>
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
      title: boss ? `Defeat ${boss.title}` : 'Defeat the Boss',
      body: `You are ${hero?.title ?? 'the party tank'}. Bring the boss to zero within ${state.roundLimit} Rounds — before it does the same to you.`,
      diagram: (
        <div className="flex items-center justify-center gap-6 rounded-xl bg-zinc-950 px-3 py-5">
          <div className="flex flex-col items-center gap-1">
            <HeroEmblem className="wb-float h-14 w-14 text-sky-400" />
            <span className="text-[9px] font-semibold text-sky-300">{hero?.title ?? 'You'}</span>
            <span className="rounded bg-emerald-900/70 px-1.5 text-[9px] text-emerald-200">{hero?.maxHealth ?? '–'} HP</span>
          </div>
          <span className="text-lg font-black text-zinc-600">VS</span>
          <div className="flex flex-col items-center gap-1">
            <BossEmblem className="wb-float h-16 w-16 text-red-500" />
            <span className="text-[9px] font-semibold text-red-300">{boss?.title ?? 'Boss'}</span>
            <span className="rounded bg-red-900/70 px-1.5 text-[9px] text-red-200">{boss?.maxHealth ?? '–'} HP</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Every Round runs one track',
      body: 'Amber beats are the boss. Green and blue windows are yours. Next moves the track.',
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
    <Modal onDismiss={closeGuide} labelledBy="guide-title" accentBorderClass="border-emerald-600" testId="guide-modal">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">How to play</span>
        <button
          type="button"
          data-testid="guide-skip"
          onClick={closeGuide}
          className={`min-h-11 rounded-lg px-3 text-xs font-semibold text-zinc-400 transition hover:text-zinc-200 ${FOCUS_RING_CLASS}`}
        >
          Skip
        </button>
      </div>
      <h2 id="guide-title" className="mt-1 text-base font-bold text-zinc-50">
        {step.title}
      </h2>
      <div className="mt-3" key={guideStep}>
        <div className="wb-slide-up">{step.diagram}</div>
        <p className="wb-slide-up mt-3 text-xs leading-relaxed text-zinc-200" style={{ animationDelay: '0.08s' }}>
          {step.body}
        </p>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {/* Progress indicators only — Back and Next are the navigation, so
            these stay non-interactive and exempt from the 44px target rule. */}
        <div className="flex flex-1 gap-1.5" role="img" aria-label={`Step ${guideStep + 1} of ${steps.length}`}>
          {steps.map((_, index) => (
            <span key={index} className={`h-2.5 w-2.5 rounded-full transition ${index === guideStep ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
          ))}
        </div>
        {guideStep > 0 && (
          <button
            type="button"
            data-testid="guide-back"
            onClick={() => setGuideStep(guideStep - 1)}
            className={`min-h-12 rounded-lg bg-zinc-700 px-4 text-sm font-bold text-zinc-100 transition hover:bg-zinc-600 ${FOCUS_RING_CLASS}`}
          >
            Back
          </button>
        )}
        <button
          type="button"
          data-testid={lastStep ? 'guide-start' : 'guide-next'}
          onClick={() => (lastStep ? closeGuide() : setGuideStep(guideStep + 1))}
          className={`min-h-12 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-500 active:scale-95 ${FOCUS_RING_CLASS}`}
        >
          {lastStep ? 'Start playing' : 'Next'}
        </button>
      </div>
      {guideStep === 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-zinc-800/70 px-3 py-2 text-[10px] text-zinc-400">
          <ShieldIcon className="h-3.5 w-3.5 shrink-0 text-sky-400" />
          Hold anything — a card, a Slot, a boss beat — to read it.
        </div>
      )}
    </Modal>
  )
}
