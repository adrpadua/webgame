import { keywordTitle } from "@/engine";
import { usePlayout } from "@/store/playout";
import { selectState, useWorkbench } from "@/store/workbench";
import { beatCardStats, findLiveBeat, standingDemand } from "./beatCard";
import { Notify } from "./NotificationLayer";
import { FOCUS_RING_CLASS } from "./theme";

// Every Boss Beat is a card, and the card is the control that resolves it.
//
// The pacing this rides on already existed: the playout has always held each
// Beat behind a press and named it first, so the player reads a Beat before it
// resolves rather than catching up to one already swung. What was missing was
// the Beat itself — the prompt was a bar carrying a title, and everything that
// makes a Beat legible (what it hits, for how much, how far it reaches, what
// answers it) was one hover away on a chip most players never hold.
//
// Inherited from the bar this replaced, because it is still the rule: the card
// is a trailer, not a caption. It names what is about to happen, because
// "Raking Claw · Resolve" reads as a promise to show the claw, and naming the
// beat already on the board made every press look like it skipped one. Every
// beat of a Boss Row gets its own press, the opening one included, so the card
// is the first thing the Row says. What has already resolved stays readable
// beside it: the Boss Beat chips in the strip keep their light until the next
// moment fires. The rules already resolved the whole track — this only paces
// the telling.
//
// Making it a card is also what a board-game port needs (D-055): if a Beat is
// going to be printed, everything resolution depends on has to be *on* it. That
// is a real constraint on content, not just presentation, and this component is
// where a Beat missing a printable parameter becomes visible.

export function BeatCard() {
  const awaiting = usePlayout((store) => store.awaitingContinue);
  const nextBeatId = usePlayout((store) => store.nextBeatId);
  const nextBeatTitle = usePlayout((store) => store.nextBeatTitle);
  const continuePlayout = usePlayout((store) => store.continuePlayout);
  const catalog = useWorkbench((store) => store.catalog);
  const state = useWorkbench(selectState);
  if (!awaiting) {
    return null;
  }
  const found =
    nextBeatId === null ? null : findLiveBeat(catalog, state, nextBeatId);
  const stats = found ? beatCardStats(found.beat) : [];
  // The dock's anchor rank: the one control a Boss Row asks for over and
  // over, so it sits against the Action Bar where the thumb already is.
  return (
    <Notify id="beat-card">
      <button
        type="button"
        // Both attributes are the smoke suite's contract on this prompt: it
        // presses whatever carries the testid and checks that what plays is what
        // `data-next-beat` promised. The card took the bar's place, so it takes
        // its contract too rather than leaving a second prompt behind.
        data-testid="playout-continue"
        data-next-beat={nextBeatTitle ?? ""}
        data-beat-id={found?.beat.id ?? ""}
        onClick={continuePlayout}
        className={`wb-beat-deal wb-accent-pulse pointer-events-auto wb-plate wb-plate-md wb-face-steel wb-acc-ember flex w-full flex-col gap-1.5 px-3 py-2 text-left shadow-xl ${FOCUS_RING_CLASS}`}
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="shrink-0 text-[9px] font-semibold tracking-widest text-steel-400 uppercase">
            {found
              ? found.track === "instant"
                ? "Boss · Instant"
                : "Boss · Incoming"
              : "Up next"}
          </span>
          {/* "Resolve", not "Play": playing is what the Hero does with a card in
            hand, and a Boss card sharing that verb would read as a move the
            player is being offered. Resolve is the engine's own word for what
            a Beat does and collides with nothing the player can do.

            The accent breathes to say "waiting on you", not the face. The bar
            this replaced used `wb-face-pulse`, which dips the plate's face to
            55% — fine under one short title, unreadable under a card carrying
            a Beat's rules text, because the board shows straight through it.
            Nothing flagged it: the text's own opacity never moves, so a
            contrast check on declared colours passes while the composited
            pixels fail. Caught by screenshotting the card. */}
          <span className="shrink-0 text-[11px] font-black tracking-widest text-coral-300 uppercase">
            Resolve ▸
          </span>
        </span>
        <span className="truncate text-sm font-bold text-coral-100">
          {nextBeatTitle ?? "Boss beat"}
        </span>
        {stats.length > 0 && (
          <span className="flex flex-wrap gap-x-3 gap-y-0.5">
            {stats.map((stat) => (
              <span key={stat.label} className="text-[10px] text-steel-300">
                <span className="text-steel-500">{stat.label} </span>
                {stat.value}
              </span>
            ))}
          </span>
        )}
        {found && found.beat.rules_text !== "" && (
          <span className="text-[10px] leading-snug text-steel-400">
            {found.beat.rules_text}
          </span>
        )}
        {found && found.beat.answer_tags.length > 0 && (
          // Content stores Keyword ids; the card shows their authored titles,
          // so renaming an answer's wording never means editing five program
          // files.
          <span className="text-[10px] text-steel-500">
            {found.beat.answer_tags.map((tag) => keywordTitle(catalog, tag)).join(" · ")}
          </span>
        )}
      </button>
    </Notify>
  );
}

// A demand is the one Beat kind that resolves to nothing when it plays: its
// price is charged at the Round end, so a card that popped and vanished would
// show the demand at the only moment the player cannot act on it and hide it
// through the whole window where they can.
//
// So it docks. It appears once its row has resolved and stays until the Round
// ends, and it reports live whether the demand is currently answered — which is
// the difference between a notification and a thing you can play against. On a
// table this is the card that stays face-up in front of the Boss.
export function StandingDemand() {
  const catalog = useWorkbench((store) => store.catalog);
  const state = useWorkbench(selectState);
  const demand = standingDemand(catalog, state);
  if (!demand) {
    return null;
  }
  const { beat, answered } = demand;
  // Docked above the prompts and below the readouts. "So it docks" is this
  // component's own word for it; the lane is where that happens.
  return (
    <Notify id="standing-demand">
      <div
        data-testid="standing-demand"
        data-answered={answered ? "true" : "false"}
        className={`wb-slide-up pointer-events-none wb-plate wb-plate-sm wb-face-steel flex w-full items-center justify-between gap-2 px-3 py-1.5 shadow-lg ${
          answered ? "wb-acc-gold" : "wb-acc-ember"
        }`}
      >
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 text-[9px] font-semibold tracking-widest text-steel-400 uppercase">
            Standing
          </span>
          <span className="truncate text-xs font-bold text-coral-100">
            {beat.title}
          </span>
        </span>
        <span
          className={`shrink-0 text-[10px] font-black tracking-widest uppercase ${answered ? "text-gold-200" : "text-coral-300"}`}
        >
          {answered
            ? "Answered"
            : `Escalation +${beat.escalation_if_unanswered}`}
        </span>
      </div>
    </Notify>
  );
}
