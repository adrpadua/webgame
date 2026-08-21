#!/usr/bin/env python3
"""The Oathcraft design tokens, in one place.

Both design surfaces read from here — `current-game-ui/build.py` inlines them
into its canvas artboards (which run in sandboxed iframes and cannot link a
stylesheet), and `design-system/build_ds.py` emits them as
`colors_and_type.css` for the Claude Design project. A value that moves in
`web/src/index.css` moves here once, and both follow.

Provenance, per layer:

  PALETTE, PLATE       shipped canon — `web/src/index.css`, specified in
                       `docs/content/oathcraft-interface-direction.md`
  RADII, MOTION        shipped canon — read off `index.css` and `theme.ts`
  TYPE, SPACING        NOT canon. The interface direction lists typography
                       under "What This Does Not Decide", and spacing simply
                       inherits Tailwind's default scale. Both are transcribed
                       from what the components actually use, so the design
                       system describes the app truthfully — but they are a
                       proposal to ratify, not a rule to cite. Marked as such
                       wherever they surface.
"""

# --- Materials -------------------------------------------------------------
# The locked table from the interface direction, given its ramps. Each ramp
# steps by value only; the anchor shade is the direction's own hex.
#
# (material, token stem, carries, {step: hex}, anchor step)
PALETTE = [
    (
        "Runeglass",
        "glass",
        "Projected information: seams, focus, telegraphs, Quick timing",
        {100: "#d6f4f9", 200: "#a6e6f0", 300: "#7fdbe9", 400: "#62d2e6", 500: "#3fb9cf",
         600: "#2a94a8", 700: "#1e6d7c", 900: "#0f3a44", 950: "#0a2730"},
        400,
    ),
    (
        "Living gold",
        "gold",
        "Lockwork: controls, charge tumblers, armor plate edges, Slow timing",
        {100: "#f7ebc9", 200: "#ecd48f", 300: "#dcbd60", 400: "#c8a344", 500: "#ad8b34",
         600: "#8a6e26", 700: "#64501c", 900: "#3a2e12", 950: "#261e0c"},
        400,
    ),
    (
        "Signal cloth",
        "cloth",
        "The Role channel — one step per Role, not per Hero",
        {100: "#d5e3f0", 300: "#7ea3c6", 400: "#4f7ba6", 500: "#2f5680", 700: "#22405f",
         950: "#101c2c"},
        500,
    ),
    (
        "Aether ceramic",
        "ceramic",
        "Read-out surfaces, the console, healing",
        {100: "#f7f9fb", 200: "#edf0f5", 300: "#e4e8ee", 400: "#c9d2e0", 500: "#a9b7cc",
         950: "#1a2230"},
        300,
    ),
    (
        "Ember",
        "ember",
        "Damage taken, danger, irreversible action",
        {100: "#f6c9be", 300: "#ec8b73", 400: "#e2603f", 500: "#d9482f", 600: "#b53a24",
         950: "#2c110c"},
        500,
    ),
    (
        "Ember coral",
        "coral",
        "The Boss wherever it appears — and damage dealt to it",
        {100: "#f8d5c4", 200: "#f3b394", 300: "#ec9569", 400: "#e0703b", 500: "#c4522a",
         700: "#7e3519", 900: "#45200f", 950: "#2c150a"},
        400,
    ),
    (
        "Oathsteel",
        "steel",
        "Panel and frame bodies",
        {400: "#91a3bf", 500: "#7a8fb2", 600: "#415371", 700: "#37465f", 800: "#24304a",
         900: "#1b2434", 950: "#0f1622"},
        900,
    ),
    (
        "Void navy",
        "navy",
        "The ground under everything. Navy, not black — black belongs to basalt",
        {950: "#080d16"},
        950,
    ),
]

# Semantic aliases: what the chrome actually reaches for by name.
SEMANTIC = [
    ("--ground", "var(--navy-950)", "The page under the play surface"),
    ("--surface", "var(--steel-950)", "The play surface itself"),
    ("--plate-face", "var(--steel-900)", "A plate's default body"),
    ("--plate-edge", "var(--steel-700)", "Its 1px edge"),
    ("--fg-primary", "var(--ceramic-200)", "Body text on steel"),
    ("--fg-quiet", "var(--steel-500)", "The quiet-label step — every use is text"),
    ("--fg-inverse", "var(--ceramic-950)", "Text on a lit face"),
    ("--focus-ring", "var(--glass-400)", "Focus is a projected lens, never a status colour"),
]

# --- Plate geometry --------------------------------------------------------
# offset = height x tan(8deg) at the class's nominal height, so it is derived
# rather than chosen. `gutter` is the breathing room past the cut and is the
# only figure in the system tuned by eye.
PLATE_SIZES = [
    ("xs", 3, 2, 8, "~24px chips", "Live phase chip"),
    ("sm", 5, 3, 10, "~38-44px controls", "Prompts, the Signature button"),
    ("md", 7, 4, 8, "~48px cards", "Beat Card"),
    ("card", 7, 4, 4, "Compact Card", "Buys width by lowering the gutter"),
    ("lg", 9, 4, 8, "~62px readouts", "Hero Frame, the rails"),
    ("slot", 9, 4, 3, "Action Bar Slot", "Four units of the ladder is ~120px"),
    ("xl", 16, 6, 12, "~112px panels", "Modals, the outcome banner"),
]

PLATE_FACES = [
    ("steel", "var(--steel-900)", "var(--steel-700)", "var(--ceramic-200)", "Panels, Slots, prompts"),
    ("dim", "var(--steel-950)", "var(--steel-800)", "var(--steel-500)", "Inert: fired, or out of window"),
    ("ceramic", "var(--ceramic-300)", "var(--ceramic-500)", "var(--ceramic-950)", "Read-outs: the Hero Frame"),
    ("gold", "var(--gold-500)", "var(--gold-400)", "var(--gold-950)", "Live: the advance rail, the Signature"),
    ("coral", "var(--coral-400)", "var(--coral-300)", "var(--coral-950)", "The Boss's own windows"),
    ("glass", "var(--glass-400)", "var(--glass-300)", "var(--glass-950)", "The Quick Window chip"),
]

PLATE_ACCENTS = [
    ("gold", "var(--gold-400)", "Live — this can fire, or this is the move"),
    ("ember", "var(--ember-500)", "Irreversible — a Replace, a refusal, a Boss beat"),
    ("glass", "var(--glass-400)", "A player affordance being offered"),
    ("cloth", "var(--cloth-500)", "The role channel"),
    ("none", "transparent", "No status to report"),
]

# --- Type ------------------------------------------------------------------
# PROPOSAL, not canon. Transcribed from the sizes the components actually use
# so the system describes the app honestly; the roles are the naming this pass
# adds. `uses` is the live count at the time of transcription.
TYPE = [
    ("pip", 8, 2, "The smallest marks. One outlier — a candidate for retirement into `micro`."),
    ("micro", 9, 20, "Eyebrows, demoted card names, the Beat Card's track label."),
    ("chip", 10, 20, "Chip words, subtitles, stat lines, the deck and discard counts."),
    ("label", 11, 16, "The Hero Frame's name, the Round mark, dock titles."),
    ("body-sm", 12, 23, "Slot titles, toasts, prompts. Tailwind's `text-xs`."),
    ("body", 14, 20, "Beat titles, modal prose. Tailwind's `text-sm`."),
    ("read", 16, 1, "Long-form reading. Tailwind's `text-base`; barely used."),
    ("title", 18, 6, "Section headings inside modals. Tailwind's `text-lg`."),
    ("banner", 24, 2, "The outcome banner, and nothing else."),
]

TYPE_WEIGHTS = [
    ("semibold", 600, 31, "Labels and quiet emphasis"),
    ("bold", 700, 37, "The default for anything named"),
    ("black", 900, 9, "Reserved for words on a lit face: the phase chip, the Signature"),
]

TYPE_TRACKING = [
    ("normal", "0", "Body and titles"),
    ("wide", "0.025em", "The Signature button"),
    ("widest", "0.1em", "Every uppercase eyebrow and chip word"),
]

# --- Spacing and radii -----------------------------------------------------
# Spacing is Tailwind's default scale, unnarrowed. Listed as observed.
SPACING = [(1, 4), (1.5, 6), (2, 8), (2.5, 10), (3, 12), (4, 16), (6, 24), (8, 32)]
RADII = [("none", "0", "Every plate — the rake is the silhouette"),
         ("xs", "2px", "The class-resource bar"),
         ("sm", "2px", "Gauge tracks"),
         ("full", "9999px", "Timing dots, charge pips")]

MOTION = [
    ("wb-face-pulse", "1.4s", "cubic-bezier(0.4,0,0.6,1)", "loop",
     "A dragged card is over this plate. Breathes the face and accent layers only, so a drop badge never dips under its contrast floor."),
    ("wb-accent-pulse", "1.4s", "cubic-bezier(0.4,0,0.6,1)", "loop",
     "The same signal for a plate carrying body text: the 3px accent breathes, the face does not."),
    ("wb-ring-pulse", "1.4s", "ease-out", "loop",
     "Legal, tap me — for a control that is not a plate."),
    ("wb-seat", "260ms", "ease-out", "once",
     "A Slot's last tumbler drops and the ward ring closes. Fires once: a Full Slot can persist for Rounds, and anything breathing that long becomes furniture."),
    ("wb-beat-deal", "260ms", "cubic-bezier(0.2,0.9,0.3,1)", "once",
     "A Boss Beat lands like a card on a table."),
    ("wb-card-offer", "380ms", "ease-out", "once",
     "The Hand offers itself, staggered left to right, and holds the lift."),
    ("wb-pop-in", "250ms", "ease-out", "once", "A popup or prompt arrives."),
]

FONT_STACK = ('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, '
              '"Helvetica Neue", "Noto Sans", Arial, sans-serif')
MONO_STACK = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'


def color_vars():
    """Every ramp step as a `--<stem>-<step>: <hex>` line."""
    out = []
    for _material, stem, _carries, ramp, _anchor in PALETTE:
        for step in sorted(ramp):
            out.append((f"--{stem}-{step}", ramp[step]))
    return out


def tokens_css():
    """The `:root` block both surfaces share."""
    lines = ["  /* Materials. Colour reads as role and material, never as decoration. */"]
    for material, stem, carries, ramp, _anchor in PALETTE:
        lines.append(f"  /* {material} — {carries} */")
        lines.append("  " + " ".join(f"--{stem}-{s}: {ramp[s]};" for s in sorted(ramp)))
    lines.append("")
    lines.append("  /* Semantic aliases. */")
    for name, value, note in SEMANTIC:
        lines.append(f"  {name}: {value}; /* {note} */")
    lines.append("")
    lines.append("  /* Type — PROPOSAL, transcribed from live usage (see README). */")
    lines.append(f"  --font-sans: {FONT_STACK};")
    lines.append(f"  --font-mono: {MONO_STACK};")
    for role, px, _uses, _note in TYPE:
        lines.append(f"  --type-{role}: {px}px;")
    for role, weight, _uses, _note in TYPE_WEIGHTS:
        lines.append(f"  --weight-{role}: {weight};")
    for role, value, _note in TYPE_TRACKING:
        lines.append(f"  --tracking-{role}: {value};")
    lines.append("")
    lines.append("  /* Spacing — Tailwind's default scale, as observed. */")
    for step, px in SPACING:
        lines.append(f"  --space-{str(step).replace('.', '_')}: {px}px;")
    for name, value, _note in RADII:
        lines.append(f"  --radius-{name}: {value};")
    return "\n".join(lines)
