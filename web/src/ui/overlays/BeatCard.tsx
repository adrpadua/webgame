import { useCatalog } from '@/content/CatalogContext'
import { keywordTitle } from "@/engine";
import { usePlayout } from "@/store/playout";
import { selectState, useWorkbench } from "@/store/workbench";
import { beatCardStats, findLiveBeat, standingDemand } from "./beatCard";
import { Notify } from "./NotificationLayer";
import { FOCUS_RING_CLASS } from "../common/theme";

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
// is the first thing the Row says. The rules already resolved the whole track —
// this only paces the telling.
//
// Since the program strip was removed (D-060) this card is the only place a
// Boss Beat is named and priced, which raises what it owes: every parameter
// resolution depends on has to be printed here, because there is no longer a
// chip to hold for the rest.
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
  const catalog = useCatalog()
  const state = useWorkbench(selectState);
  if (!awaiting) {
    return null;
  }
  const found =
    nextBeatId === null ? null : findLiveBeat(catalog, state, nextBeatId);
  const stats = found ? beatCardStats(found.beat) : [];
  // The herald (D-097): the board's top edge, alone in its zone. This card
  // docked against the Action Bar while it was one short title, on the rule
  // that a control belongs beside the control it names — and then it became a
  // card with stats, rules text and a line of answers, and the bottom of the
  // surface is where the Hero Frame and the ally column already stand. A Beat
  // whose last two rows arrive behind an ally frame is a Beat the player never
  // read, which is the one thing a printed card may not do. The press did not
  // have to move with the reading: the Action Bar's forward rail is Continue
  // for exactly this moment, so the thumb keeps a control at the bottom while
  // the card is read at the top.
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
        // No `px-`/`py-` here, deliberately. A flat Tailwind padding on a
        // raked plate overrides the clearance the size class derives from the
        // cut, and 12px was 3px short of what this one needs — which is how
        // the label came to sit against the ember edge. `wb-gutter-raked` is
        // that clearance, measured per side at the corner it is worst at,
        // which is what a plate carrying a column of text needs.
        className={`wb-beat-deal wb-accent-pulse pointer-events-auto wb-plate wb-plate-md wb-gutter-raked wb-face-steel wb-acc-ember flex w-full flex-col gap-1.5 text-left shadow-xl ${FOCUS_RING_CLASS}`}
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
  const catalog = useCatalog()
  const state = useWorkbench(selectState);
  const demand = standingDemand(catalog, state);
  if (!demand) {
    return null;
  }
  const { beat, answered } = demand;
  // Docked above the prompts and below the readouts. "So it docks" is this
  // component's own word for it; the lane is where that happens. It stays in
  // the dock now that the Beat Card has gone to the herald: one row of text is
  // legible in the strip the frames leave, and a demand the player is meant to
  // answer belongs beside the controls that answer it.
  return (
    <Notify id="standing-demand">
      <div
        data-testid="standing-demand"
        data-answered={answered ? "true" : "false"}
        // Same gutter as the Beat Card, for the same reason: "Standing" is
        // pinned to the leading edge under the accent band, and a flat `px-3`
        // left it 6px clear there against 10px on the trailing side. One row
        // rather than four, so the wedge is smaller — but the two are the
        // Boss's two plates and are read against each other across the board,
        // and two plates disagreeing about where their text starts is the pair
        // of them looking crooked.
        // The block gutter stays at the thin bar's 6px; only the Beat Card
        // wants a card's 8px.
        className={`wb-slide-up pointer-events-none wb-plate wb-plate-sm wb-gutter-raked [--wb-gutter-block:6px] wb-face-steel flex w-full items-center justify-between gap-2 shadow-lg ${
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
