#!/usr/bin/env python3
"""Author the Raid Card Tactics design-canvas artboards.

Every value here is lifted from the shipped Workbench: the palette and the
plate geometry from `web/src/index.css`, the gauge language from
`web/src/ui/common/theme.ts`, the markup from the components themselves, and the
measured box sizes from `metrics.json` — captured off the running app at
390x844. The board art is the game's own render, cropped from that capture.

Run from the repo root:  python3 design/current-game-ui/build.py
"""

import json
import os

OUT = os.path.dirname(os.path.abspath(__file__))

# --- The palette, verbatim from web/src/index.css --------------------------
TOKENS = """
  --glass-100:#d6f4f9; --glass-200:#a6e6f0; --glass-300:#7fdbe9; --glass-400:#62d2e6;
  --glass-500:#3fb9cf; --glass-600:#2a94a8; --glass-700:#1e6d7c; --glass-900:#0f3a44; --glass-950:#0a2730;
  --gold-100:#f7ebc9; --gold-200:#ecd48f; --gold-300:#dcbd60; --gold-400:#c8a344;
  --gold-500:#ad8b34; --gold-600:#8a6e26; --gold-700:#64501c; --gold-900:#3a2e12; --gold-950:#261e0c;
  --cloth-100:#d5e3f0; --cloth-300:#7ea3c6; --cloth-400:#4f7ba6; --cloth-500:#2f5680;
  --cloth-700:#22405f; --cloth-950:#101c2c;
  --ceramic-100:#f7f9fb; --ceramic-200:#edf0f5; --ceramic-300:#e4e8ee; --ceramic-400:#c9d2e0;
  --ceramic-500:#a9b7cc; --ceramic-950:#1a2230;
  --ember-100:#f6c9be; --ember-300:#ec8b73; --ember-400:#e2603f; --ember-500:#d9482f;
  --ember-600:#b53a24; --ember-950:#2c110c;
  --coral-100:#f8d5c4; --coral-200:#f3b394; --coral-300:#ec9569; --coral-400:#e0703b;
  --coral-500:#c4522a; --coral-700:#7e3519; --coral-900:#45200f; --coral-950:#2c150a;
  --navy-950:#080d16;
  --steel-400:#91a3bf; --steel-500:#7a8fb2; --steel-600:#415371; --steel-700:#37465f;
  --steel-800:#24304a; --steel-900:#1b2434; --steel-950:#0f1622;
"""

# --- The raked plate, ported from index.css's @utility layers ---------------
PLATE_CSS = """
/* The plate geometry from docs/content/oathcraft-interface-direction.md: a
   parallelogram raked 8deg from vertical, top-left corner notched out, the
   leading edge carrying a 3px accent that runs the full cut. Drawn on ::before
   and ::after so the element keeps its focus ring, shadow and border. */
.plate{
  position:relative; isolation:isolate; background:transparent; border:0;
  --off:5px; --notch:3px; --gutter:8px; --inset:var(--off);
  --face:var(--steel-900); --edge:var(--steel-700); --acc:var(--steel-700);
  /* The one padding rule, derived and never re-declared: --inset is how deep
     the cut reaches this plate's content, --gutter is the breathing room past
     it — the only figure tuned by eye. */
  padding-inline:calc(var(--inset) + var(--gutter));
}
.plate::before{
  content:''; position:absolute; inset:0; z-index:-1; background:var(--face);
  box-shadow:inset 0 0 0 1px var(--edge), inset 0 1px 0 rgb(255 255 255/.06), inset 0 -1px 0 rgb(0 0 0/.5);
  clip-path:polygon(calc(var(--off) + var(--notch)) 0, 100% 0, calc(100% - var(--off)) 100%, 0 100%, var(--off) var(--notch));
}
.plate::after{
  content:''; position:absolute; inset:0; z-index:-1; background:var(--acc);
  clip-path:polygon(var(--off) var(--notch), calc(var(--off) + 3px) var(--notch), 3px 100%, 0 100%);
}
/* Sizes carry the rake and, where the plate is width-starved, a tighter
   gutter. Offset = height x tan(8deg) at the class's nominal height. */
.p-xs{--off:3px;--notch:2px}
.p-sm{--off:5px;--notch:3px;--gutter:10px}
.p-md{--off:7px;--notch:4px}
.p-card{--off:7px;--notch:4px;--gutter:4px}
.p-lg{--off:9px;--notch:4px}
.p-slot{--off:9px;--notch:4px;--gutter:3px}
.p-xl{--off:16px;--notch:6px;--gutter:12px}
/* Content held to the plate's vertical middle meets each cut at half depth. */
.p-centered{--inset:calc(var(--off) / 2)}
/* A plate carrying a text column measures each side at the corner that side
   is worst at, and adds the notch back on top. */
.p-raked{
  padding-inline:calc(var(--off) + 13px) calc(var(--off) + 10px);
  padding-block:calc(var(--notch) + var(--gutter-block,8px)) var(--gutter-block,8px);
}
/* Faces and accents. The accent is the status channel: gold on the live
   thing, ember on the irreversible one, glass on a player affordance. */
.f-steel{--face:var(--steel-900);--edge:var(--steel-700)}
.f-ceramic{--face:var(--ceramic-300);--edge:var(--ceramic-500)}
.f-gold{--face:var(--gold-500);--edge:var(--gold-400)}
.f-dim{--face:var(--steel-950);--edge:var(--steel-800)}
.f-coral{--face:var(--coral-400);--edge:var(--coral-300)}
.f-glass{--face:var(--glass-400);--edge:var(--glass-300)}
.a-gold{--acc:var(--gold-400)}
.a-glass{--acc:var(--glass-400)}
.a-ember{--acc:var(--ember-500)}
.a-cloth{--acc:var(--cloth-500)}
.a-none{--acc:transparent}
"""

BASE_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{
  background:var(--navy-950); color:var(--ceramic-200);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans",Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
}
/* The gauge language, written once (web/src/ui/common/theme.ts): a dark track, a
   fill measured from the left, the number overlaid with a shadow so it stays
   crisp where it straddles the fill edge. */
.gauge{position:relative;display:block;height:18px;overflow:hidden;border-radius:2px;background:var(--steel-950)}
.gauge-fill{position:absolute;top:0;bottom:0;left:0}
.gauge-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:4px;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,.8)}
.row{display:flex;align-items:center}
.col{display:flex;flex-direction:column}
"""

# --- Inline SVG art, verbatim from web/src/ui/common/icons.tsx ---------------------


def svg(view, body, cls="", extra=""):
    return f'<svg viewBox="{view}" class="{cls}" {extra} aria-hidden="true">{body}</svg>'


def fill_icon(body, cls=""):
    return svg("0 0 20 20", body, cls, 'fill="currentColor"')


def line_icon(body, cls="", w="2"):
    return svg(
        "0 0 20 20", body, cls,
        f'fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"',
    )


ICON = {
    # The Round track's five windows.
    "deck": lambda c="": fill_icon('<rect x="2" y="6" width="8" height="11" rx="1.5" opacity="0.55"/><rect x="9" y="3" width="9" height="11" rx="1.5"/>', c),
    "bolt": lambda c="": fill_icon('<path d="M11.6 2 4 11.4h4.2L7.9 18l7.6-9.4h-4.2L11.6 2Z"/>', c),
    "swift": lambda c="": line_icon('<path d="m4 5 5 5-5 5M11 5l5 5-5 5"/>', c, "2.2"),
    "impact": lambda c="": line_icon('<path d="M10 2.5v8.5M5.5 7.5 10 12l4.5-4.5M4 16.5h12"/>', c),
    "hourglass": lambda c="": fill_icon('<path d="M4.5 3h11v1.7h-11zM4.5 15.3h11V17h-11z"/><path d="M6.3 4.7h7.4L10 10l3.7 5.3H6.3L10 10 6.3 4.7Z"/>', c),
    # The Action Bar's rails.
    "advance": lambda c="": fill_icon('<path d="M3.5 3.2 13 10 3.5 16.8V3.2Z"/><path d="M14.6 3.2h2.2v13.6h-2.2z"/>', c),
    "play": lambda c="": fill_icon('<path d="M5.5 3.2 16 10 5.5 16.8V3.2Z"/>', c),
    "undo": lambda c="": line_icon('<path d="M4 8.5h8.2a4 4 0 0 1 0 8H8"/><path d="M7.4 4.6 3.6 8.5l3.8 3.9"/>', c),
    "restart": lambda c="": line_icon('<path d="M16.2 10a6.2 6.2 0 1 1-1.9-4.5"/><path d="M16.6 2.6v4.2h-4.2"/>', c),
    # Effect and stat marks.
    "heart": lambda c="": fill_icon('<path d="M10 17S3 12.5 3 7.6C3 5 5 3.2 7.2 3.2c1.2 0 2.2.5 2.8 1.4.6-.9 1.6-1.4 2.8-1.4C15 3.2 17 5 17 7.6c0 4.9-7 9.4-7 9.4Z"/>', c),
    "shield": lambda c="": fill_icon('<path d="M10 2 17 4.5v5C17 14 14.2 17 10 18.5 5.8 17 3 14 3 9.5v-5L10 2Z"/>', c),
    "sword": lambda c="": svg("0 0 20 20", '<path d="M4 16 13 7l3-4-4 3-9 9Z" fill="currentColor" stroke="none"/><path d="m11.5 11.5 3 3M6 12l2 2M4.5 15.5 3 17"/>', c, 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"'),
    "hex": lambda c="": svg("0 0 20 20", '<path d="M10 2 17 6v8l-7 4-7-4V6l7-4Z" stroke-linejoin="round"/>', c, 'fill="none" stroke="currentColor" stroke-width="1.6"'),
    # The Hero Frame's own two marks.
    "deckcount": lambda c="": svg("0 0 20 20", '<rect x="3" y="5" width="9" height="12" rx="1.5" opacity="0.55"/><rect x="8" y="3" width="9" height="12" rx="1.5"/>', c, 'fill="currentColor"'),
    "discard": lambda c="": svg("0 0 20 20", '<path d="M9 2h2v5h2.6L10 11.6 6.4 7H9V2Z"/><rect x="3.5" y="13" width="13" height="4" rx="1.2" opacity="0.55"/>', c, 'fill="currentColor"'),
}


def hero_emblem(cls=""):
    return svg(
        "0 0 48 48",
        '<path d="M24 4 40 10v12c0 10-6 18-16 22C14 40 8 32 8 22V10L24 4Z" fill="currentColor"/>'
        '<path d="M24 9 35 13v9c0 8-4.5 14-11 17.5C17.5 36 13 30 13 22v-9l11-4Z" fill="#09090b" opacity="0.55"/>'
        '<path d="M24 14v22M16 24h16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
        cls, 'fill="none"',
    )


# Elian Voss's Keyword marks: the folding Gate Rig, one part per Keyword
# (web/src/ui/common/keywordIcons.tsx). Open line art at a single weight, which is
# what separates them at a glance from the filled effect icons.
def kw(body, cls=""):
    return svg("0 0 20 20", body, cls, 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"')


KEYWORD = {
    "guard": lambda c="": kw('<path d="M4 4h12v7c0 3-2.6 4.7-6 5.5C6.6 15.7 4 14 4 11V4Z"/><path d="M10 4v12.2"/>', c),
    "attack": lambda c="": kw('<circle cx="10" cy="10" r="3.2"/><path d="M10 2.6v2.4M10 15v2.4M2.6 10H5M15 10h2.4M4.8 4.8 6.5 6.5M13.5 13.5l1.7 1.7M15.2 4.8 13.5 6.5M6.5 13.5l-1.7 1.7"/>', c),
    "tank": lambda c="": kw('<path d="M7 16V8a3 3 0 0 1 6 0v8"/><path d="M3.5 16h13"/>', c),
    "tempo": lambda c="": kw('<path d="M15.6 7.4A6 6 0 1 0 16 10"/><path d="M15.6 3.8v3.6H12"/><circle cx="10" cy="10" r="1.4"/>', c),
    "threat": lambda c="": kw('<path d="M5 8.2v3.6l6 3.2V5L5 8.2Z"/><path d="M14.2 7.6c1.1 1.4 1.1 3.4 0 4.8M16.8 5.4c2 2.6 2 6.6 0 9.2"/>', c),
    "board": lambda c="": kw('<path d="M10 2.4 16.6 6v8L10 17.6 3.4 14V6L10 2.4Z"/><path d="M10 7.2 12.6 10 10 12.8 7.4 10 10 7.2Z" fill="currentColor" stroke="none"/>', c),
    "growth": lambda c="": kw('<path d="M5 15.5v-3M10 15.5v-6.5M15 15.5v-10"/>', c),
    "reaction": lambda c="": kw('<path d="M5.5 3.4v13.2"/><path d="M16.5 5 10 10l6.5 5"/>', c),
    "support": lambda c="": kw('<path d="M8.4 4.6H5.2v10.8h3.2M11.6 4.6h3.2v10.8h-3.2"/><path d="M7.8 10h4.4"/>', c),
    "stamina": lambda c="": kw('<path d="M6.4 2.8h7.2v9.4l3 3.4v1.6H8.8L6.4 14H3.4v-4l3-2.6V2.8Z"/><path d="M6.4 7.4h7.2"/>', c),
}


def lock_head(state, cls=""):
    """The lock head on a Slot (web/src/ui/common/icons.tsx). The ward ring is the
    glance-distance Full signal: broken while charging, closed at full stack
    with a second faint ring outside it."""
    head = {"full": "#c8a344", "charging": "#a98b39", "spent": "#6a5a2e"}.get(state, "#6e7b93")
    ring = {"full": "#c8a344", "charging": "#c8a344", "spent": "#5a5238"}.get(state, "#5e6b82")
    dash = "" if state == "full" else ' stroke-dasharray="8 4"' if state == "charging" else ' stroke-dasharray="7 5"'
    bloom = '<circle cx="11" cy="11" r="10" fill="none" stroke="#c8a344" stroke-width="1" opacity="0.34"/>' if state == "full" else ""
    strike = '<path d="M4 18 18 4" stroke="#62d2e6" stroke-width="1.4" opacity="0.85"/>' if state == "spent" else ""
    return (
        f'<svg viewBox="0 0 22 22" class="{cls}" aria-hidden="true">{bloom}'
        f'<circle cx="11" cy="11" r="8.4" fill="none" stroke="{ring}" stroke-width="1.5"{dash}/>'
        f'<circle cx="11" cy="11" r="6.2" fill="{head}"/>'
        f'<path d="M11 7.6a1.7 1.7 0 0 0-.8 3.2l-.7 3.4h3l-.7-3.4A1.7 1.7 0 0 0 11 7.6Z" fill="#141b27"/>{strike}</svg>'
    )


def wedge(owner, cls=""):
    """The owner, said without colour: the Boss's windows point down at the
    board, yours point up from it. Setup renders the wedge's empty seat."""
    if owner == "setup":
        return f'<span class="{cls}"></span>'
    path = '<path d="M0 0h10L5 6 0 0Z"/>' if owner == "boss" else '<path d="M0 6 5 0l5 6H0Z"/>'
    return f'<svg viewBox="0 0 10 6" class="{cls}" fill="currentColor" aria-hidden="true">{path}</svg>'


# --- The Round track table, from web/src/ui/chrome/phaseTrack.tsx ------------------
# phase, label, owner, icon, restClass, faceClass, the face's own 950 ink,
# and activeClass — what the live mark's wedge wears under its lit chip.
PHASE_TRACK = [
    ("loadout", "Loadout", "setup", "deck", "var(--steel-500)", "f-ceramic", "var(--ceramic-950)", "var(--ceramic-200)"),
    ("instant", "Instant", "boss", "bolt", "var(--coral-500)", "f-coral", "var(--coral-950)", "var(--coral-300)"),
    ("quick", "Quick", "player", "swift", "var(--glass-600)", "f-glass", "var(--glass-950)", "var(--glass-300)"),
    ("incoming", "Incoming", "boss", "impact", "var(--coral-500)", "f-coral", "var(--coral-950)", "var(--coral-300)"),
    ("slow", "Slow", "player", "hourglass", "var(--gold-600)", "f-gold", "var(--gold-950)", "var(--gold-300)"),
]


def phase_track(active):
    """The five marks. The live window is not a fifth tinted mark but the row's
    one lit chip — a raked plate in the owner's material carrying the window's
    word. One word always fits where five never did."""
    out = []
    for phase, label, owner, icon, rest, face, ink, live in PHASE_TRACK:
        if phase == active:
            out.append(
                f'<span class="mark mark-live" style="color:{live}">'
                f'<span class="plate p-xs {face} chip" style="color:{ink}">'
                f'{ICON[icon]("i14")}<span class="chip-word">{label}</span></span>'
                f'{wedge(owner, "wedge")}</span>'
            )
        else:
            out.append(
                f'<span class="mark mark-rest" style="color:{rest}">'
                f'{ICON[icon]("i18")}{wedge(owner, "wedge")}</span>'
            )
    return "".join(out)


TRACK_CSS = """
/* The Round track: what the Round is doing, and nothing that does it. */
.phase-band{border-bottom:1px solid var(--steel-800);background:rgba(15,22,34,.6);padding:6px 12px}
.track{display:flex;align-items:center;gap:4px;min-height:44px;flex:1;min-width:0}
.mark{display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px 0}
.mark-rest{flex:1;min-width:0}
.mark-live{flex-shrink:0}
.chip{display:flex;align-items:center;gap:6px;padding-top:4px;padding-bottom:4px}
.chip-word{font-size:10px;line-height:1;font-weight:900;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap}
.wedge{height:6px;width:10px;flex-shrink:0;display:block}
.i14{height:14px;width:14px;flex-shrink:0}
.i18{height:18px;width:18px;flex-shrink:0;display:block}
.round-mark{min-height:44px;min-width:44px;flex-shrink:0;font-size:11px;font-weight:600;color:var(--steel-400);background:none;border:0;display:flex;align-items:center;justify-content:center}
/* Escalation: the encounter's only clock (ADR 0027). No label — the reading
   is in the shape, with the wipe band washed in at the far end and a fuse
   burning through the first while the automatic ticks are still dormant. */
.esc{display:flex;align-items:center;min-height:44px;width:100%}
.esc-track{position:relative;display:block;height:8px;width:100%;overflow:hidden;border-radius:2px;background:var(--steel-950);box-shadow:inset 0 0 0 1px var(--steel-800)}
.esc-wipe{position:absolute;top:0;bottom:0;right:0;width:20%;background:rgba(69,32,15,.7)}
.esc-fuse{position:absolute;top:0;bottom:0;left:0;background:rgba(69,32,15,.7)}
.esc-fill{position:absolute;top:0;bottom:0;left:0;background:var(--coral-500)}
.esc-div{position:absolute;top:0;bottom:0;width:1px;background:var(--steel-950)}
"""


def escalation(value=0, fuse=0.0):
    divs = "".join(f'<span class="esc-div" style="left:{v * 20}%"></span>' for v in (1, 2, 3, 4))
    return (
        f'<span class="esc"><span class="esc-track">'
        f'<span class="esc-wipe"></span>'
        f'<span class="esc-fuse" style="width:{fuse * 100:.0f}%"></span>'
        f'<span class="esc-fill" style="width:{value * 20}%"></span>{divs}</span></span>'
    )


def phase_band(active, round_no=1, value=0, fuse=0.0):
    return (
        f'<div class="phase-band">'
        f'<div class="row" style="gap:8px"><span class="track">{phase_track(active)}</span>'
        f'<span class="round-mark">R{round_no}</span></div>'
        f'{escalation(value, fuse)}</div>'
    )


# --- The Action Bar --------------------------------------------------------
BAR_CSS = """
/* The bar is a twelve-unit ladder: 2 | 4 | 4 | 2. The rails take two units
   each and the replaceable Slots share the eight between them. The Signature
   Slot never renders here — its face is the Hero Frame's control (D-065). */
.action-bar{display:grid;grid-template-columns:repeat(12,1fr);gap:6px;border-top:1px solid var(--steel-800);background:rgba(15,22,34,.8);padding:8px}
.rail{grid-column:span 2;display:flex;align-items:center;justify-content:center;min-height:80px}
.slot{grid-column:span 4;min-height:80px;min-width:0;padding-top:8px;padding-bottom:8px;text-align:left;display:block}
.slot-title{display:block;font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ceramic-200)}
.slot-row{margin-top:6px;display:flex;align-items:center;gap:6px}
.lock{height:16px;width:16px;flex-shrink:0}
/* Charge tumblers: separate raked pins with gaps while charging; when the
   last one seats the gaps close and they read as one continuous bar. */
.tumblers{display:flex;align-items:center;gap:3px}
.tumblers.seated{gap:0}
.pin{height:5px;width:14px;transform:skewX(-8deg);background:var(--steel-950);box-shadow:inset 0 1px 0 rgba(0,0,0,.6)}
.pin.lit{background:var(--gold-400);box-shadow:none}
.pin.spent{background:var(--gold-700);box-shadow:none}
.dot{margin-left:auto;height:8px;width:8px;flex-shrink:0;border-radius:9999px}
.want{display:flex;flex-shrink:0;align-items:center;gap:4px}
.i16{height:16px;width:16px}
.slot-sub{margin-top:4px;display:flex;align-items:center;gap:6px}
.slot-word{font-size:10px;font-weight:600;letter-spacing:.025em;text-transform:uppercase}
.want{margin-left:auto}
.slot-empty{display:flex;height:100%;align-items:center;justify-content:center;font-size:24px;line-height:1;font-weight:300;color:var(--steel-700)}
.i28{height:28px;width:28px}
"""


def slot(title=None, cap=3, charges=0, state="loaded", speed="quick", wants=("guard",), out_of_window=False):
    """One Action Bar Slot. Its state lives in the leading-edge accent — the
    status channel every plate shares — and in the face: gold when the Slot is
    live, steel otherwise, dim when it is waiting on the other window."""
    if title is None:
        return '<button class="plate p-slot p-lg f-dim a-none slot" style="opacity:.8"><span class="slot-empty">+</span></button>'
    face = "f-dim a-none" if (out_of_window or state == "fired") else ("f-steel a-gold" if state == "full" else "f-steel a-none")
    lock = {"loaded": "open", "charged": "charging", "full": "full", "fired": "spent"}[state]
    tone = {"charged": "var(--steel-400)", "full": "var(--gold-400)", "fired": "var(--steel-500)"}.get(state, "var(--steel-500)")
    if out_of_window:
        tone = "var(--steel-500)"
    title_col = "var(--steel-400)" if (state == "fired" or out_of_window) else "var(--ceramic-200)"
    seated = " seated" if state in ("full", "fired") else ""
    pins = "".join(
        f'<span class="pin {"spent" if state == "fired" else "lit"}"></span>' if i < charges else '<span class="pin"></span>'
        for i in range(cap)
    )
    dot = "var(--glass-400)" if speed == "quick" else "var(--gold-400)"
    takes = state not in ("full", "fired") and not out_of_window
    want_col = "var(--gold-400)" if takes else "var(--steel-600)"
    # The state word and the want marks share the row under the pins. Neither
    # fits above: a three-Charge Top Card carrying one want mark needed 106px of
    # tumbler row inside a 97px Slot, which put the glyph in the plate's own cut.
    # Loaded still prints no word — that rule was always about the word, not the
    # row — so a Loaded Slot with an appetite renders the row for its marks alone.
    want_html = ""
    if wants:
        marks = "".join(KEYWORD[w]("i16") for w in wants)
        want_html = f'<span class="want" style="color:{want_col}">{marks}</span>'
    word = ""
    if state in ("charged", "full", "fired"):
        word = f'<span class="slot-word" style="color:{tone}">{state.capitalize()}</span>'
    sub = f'<div class="slot-sub">{word}{want_html}</div>' if (word or want_html) else ""
    return (
        f'<button class="plate p-slot p-lg {face} slot">'
        f'<span class="slot-title" style="color:{title_col}">{title}</span>'
        f'<div class="slot-row">{lock_head(lock, "lock")}'
        f'<div class="tumblers{seated}">{pins}</div>'
        f'<span class="dot" style="background:{dot}"></span></div>{sub}</button>'
    )


def action_bar(slots_html, undo_armed=True, rail="next"):
    undo_face = "f-steel a-glass" if undo_armed else "f-dim a-none"
    undo_col = "var(--glass-200)" if undo_armed else "var(--steel-500)"
    icon = {"next": "advance", "continue": "play", "restart": "restart"}[rail]
    return (
        f'<div class="action-bar">'
        f'<button class="plate p-lg p-centered {undo_face} rail" style="color:{undo_col}">{ICON["undo"]("i28")}</button>'
        f'{slots_html}'
        f'<button class="plate p-lg p-centered f-gold a-gold rail" style="color:var(--gold-950)">{ICON[icon]("i28")}</button>'
        f'</div>'
    )


# --- The Hand --------------------------------------------------------------
HAND_CSS = """
/* The Hand: equal Compact Cards anchored to the bottom interaction zone. A
   card keeps one width — its share of a full Hand — whether five remain or
   one; the freed space splits evenly to either side. */
.hand{display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:4px;min-height:120px;
      border-top:1px solid var(--steel-800);background:rgba(8,13,22,.9);padding:12px 8px}
.hand.offering{border-top-color:var(--glass-500)}
.card{min-height:96px;flex-shrink:0;padding-top:6px;padding-bottom:6px;text-align:left;display:block}
.card-title{font-size:10px;line-height:1.25;font-weight:700;overflow-wrap:break-word;color:var(--ceramic-100)}
.card-speed{margin-top:4px;display:flex;align-items:center;gap:4px;font-size:9px;font-weight:600;text-transform:uppercase}
.i14b{height:14px;width:14px;flex-shrink:0;margin-left:auto}
.card-pips{margin-top:6px;display:flex;gap:2px}
.card-pip{height:6px;width:12px;border-radius:9999px;background:var(--steel-600)}
.kw-row{display:flex;min-height:36px;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px}
.i20{height:20px;width:20px;flex-shrink:0}
.i28c{height:28px;width:28px}
.card-demoted{margin-top:4px;text-align:center;font-size:9px;line-height:1.25;font-weight:600;overflow-wrap:break-word;color:var(--steel-500)}
"""

EFFECT = {
    "attack": ("var(--coral-400)", "sword"),
    "guard": ("var(--glass-400)", "shield"),
    "heal": ("var(--ceramic-300)", "heart"),
    "utility": ("var(--ceramic-400)", "hex"),
}


def card_face(title, speed, cap, effect, width, selected=False):
    """The card as itself: a name, an effect colour, its window speed, and its
    Charge Value as pips — what a Slot would get if it were prepared."""
    col, icon = EFFECT[effect]
    speed_col = "var(--glass-400)" if speed == "quick" else "var(--gold-400)"
    pips = "".join('<span class="card-pip"></span>' for _ in range(cap))
    acc = "a-gold" if selected else "a-none"
    lift = "transform:translateY(-4px);box-shadow:0 0 0 2px var(--gold-400);" if selected else ""
    return (
        f'<button class="plate p-card f-steel {acc} card" style="width:{width};{lift}">'
        f'<div class="card-title">{title}</div>'
        f'<div class="card-speed" style="color:{speed_col}">{speed}'
        f'<span style="color:{col}" class="i14b">{ICON[icon]("i14b")}</span></div>'
        f'<div class="card-pips">{pips}</div></button>'
    )


def keyword_face(title, keywords, paying, width):
    """The player-window face: the card's Keywords in the Hero's own marks,
    above a demoted name. A Keyword a loaded Top Card would pay off for takes
    living gold; the rest stay steel."""
    marks = "".join(
        f'<span style="color:{"var(--gold-400)" if k in paying else "var(--steel-400)"}">{KEYWORD[k]("i20")}</span>'
        for k in keywords
    )
    return (
        f'<button class="plate p-card f-steel a-none card" style="width:{width}">'
        f'<div class="kw-row">{marks}</div>'
        f'<div class="card-demoted">{title}</div></button>'
    )


def stamina_face(title, paying, width):
    """A move is being lined up, so this card is one Stamina and one hex — the
    whole Hand is a stack of interchangeable coins."""
    col = "var(--glass-400)" if paying else "var(--steel-500)"
    acc = "a-glass" if paying else "a-none"
    ring = "box-shadow:0 0 0 2px var(--glass-400);transform:translateY(-8px);" if paying else "transform:translateY(-8px);"
    return (
        f'<button class="plate p-card f-steel {acc} card" style="width:{width};{ring}">'
        f'<div class="kw-row" style="min-height:36px"><span style="color:{col}">{KEYWORD["stamina"]("i28c")}</span></div>'
        f'<div class="card-demoted">{title if paying else "&nbsp;"}</div></button>'
    )


# --- The Hero Frame --------------------------------------------------------
# --- The Status Icon -------------------------------------------------------
# A Counter as a raked square rather than a word (D-088, party-frame direction
# 1A), ported from web/src/ui/common/StatusIcons.tsx and statusIcons.ts. The
# square is a plate like every other surface, so it wears the 8deg rake and its
# leading-edge accent without re-deriving either: the accent band IS the
# material channel, and the glyph is cut in the same material.

STATUS_CSS = """
/* A 28px plate on a tighter gutter than wb-plate-xs was written for: the whole
   content is one 16px glyph, so the gutter only has to clear the 3px cut. */
.sicon{position:relative;display:flex;height:28px;width:28px;flex-shrink:0;align-items:center;justify-content:center;--gutter:3px}
.sicon svg{height:16px;width:16px}
/* The count rides the face's own bottom-right corner, which the rake cuts in
   by exactly --off — so it sits on the plate rather than hanging off its cut
   edge, and lifts clear of the clock when there is one. */
.sicon-count{position:absolute;right:calc(var(--off) + 1px);bottom:1px;font-size:9px;line-height:1;font-weight:900;
             color:var(--ceramic-100);text-shadow:0 0 3px var(--navy-950)}
.sicon-count.over-clock{bottom:4px}
.sicon-clock{position:absolute;bottom:0;left:0;right:var(--off);height:2px;background:var(--steel-950)}
.sicon-clock span{position:absolute;top:0;bottom:0;left:0}
"""

# The material channel, not decoration (statusIcons.ts): ember is damage taken,
# coral the Boss's own body, glass Armor and the player's affordances, gold
# lockwork, steel a blunted edge and anything unmarked.
STATUS_MATERIAL = {
    "ember": "var(--ember-300)",
    "coral": "var(--coral-300)",
    "glass": "var(--glass-300)",
    "gold": "var(--gold-300)",
    "cloth": "var(--cloth-300)",
    "steel": "var(--steel-400)",
}

# Filled rather than line art: the Keyword glyphs on a Compact Card are open
# strokes, so a filled glyph on a dark square is never mistaken for one at 16px.
STATUS_GLYPH = {
    # Fire, as one tongue.
    "flame": '<path d="M12 2c3 5 6 6.5 6 10.5A6 6 0 0 1 6 12.5C6 8.5 9 7 12 2Z"/>',
    # A fault line: something that was whole and now takes more.
    "crack": '<path d="M13 1 8 10h5l-4 13 3-11H7l6-11Z"/><path d="M17 3l4 5-4 4 2-9Z" opacity="0.6"/>',
    # The gate panel, doubled: cover held over cover.
    "shield": ('<path d="M12 3l8 3.2v6.3c0 5-3.2 8.4-8 9.5-4.8-1.1-8-4.5-8-9.5V6.2L12 3Z"/>'
               '<path d="M12 7.5l4.5 1.8v3.6c0 2.8-1.8 4.8-4.5 5.5-2.7-.7-4.5-2.7-4.5-5.5V9.3L12 7.5Z" '
               'fill="var(--steel-800)" opacity="0.7"/>'),
    # Rubble: ground that costs something to cross.
    "blocks": '<path d="M3 15h7v6H3v-6Zm8-6h6v12h-6V9Zm7 4h3v8h-3v-8Z"/>',
    # The healing cross, which is also the Registry's stamp.
    "cross": '<path d="M10 2h4v7h7v4h-7v9h-4v-9H3V9h7V2Z"/>',
    # A spearhead over its haft: what a blow is made of.
    "spike": '<path d="M12 1l4 9-4 3-4-3 4-9Z"/><path d="M8 15h8l-4 8-4-8Z"/>',
    # Two links: held in place.
    "chain": ('<g fill="none" stroke="currentColor" stroke-width="3">'
              '<rect x="3" y="4" width="8" height="7" rx="3"/><rect x="13" y="13" width="8" height="7" rx="3"/>'
              '<path d="M9 11l6 3"/></g>'),
    # The unmarked Counter: a rhombus, hollowed so it reads as a frame around
    # nothing rather than as a solid mark that means something.
    "mark": '<path d="M12 2l7 10-7 10-7-10 7-10Zm0 4.6L7.7 12 12 17.4 16.3 12 12 6.6Z"/>',
}

# Keyed by Counter id, the way keywordIcons keys a Hero's Keyword marks: what a
# Counter *does* is authored in data/counters/, what it *looks like* is the
# direction's material language, which no content file should spell in hex.
STATUS_MARKS = {
    "seared": ("flame", "ember"),        # burning: the Hero takes more from every blow
    "heat": ("flame", "coral"),          # the same fire, held by the thing that set it
    "sundered": ("crack", "ember"),      # armour split open
    "weakened": ("spike", "steel"),      # a dulled edge: the weapon changed, not the wound
    "fortified": ("shield", "glass"),    # banked Armor, in the Armor overlay's own runeglass
    "underwritten": ("cross", "gold"),   # the Registry's cover on the next blow
}
NEUTRAL_MARK = ("mark", "steel")


def status_icon(counter_id, count=1, remaining=0, duration=0):
    """One Status Icon. Three things ride the square, and each is a number the
    player would otherwise have to open the popup to learn: the count when more
    than one is held, a round clock draining left to right on a Counter with an
    authored duration, and nothing at all on one that is single and permanent —
    which is the common case and should stay quiet."""
    glyph, material = STATUS_MARKS.get(counter_id, NEUTRAL_MARK)
    colour = STATUS_MATERIAL[material]
    clock = duration > 0 and remaining > 0
    count_html = (
        f'<span class="sicon-count{" over-clock" if clock else ""}">{count}</span>' if count > 1 else ""
    )
    clock_html = ""
    if clock:
        pct = min(100, remaining / duration * 100)
        clock_html = f'<span class="sicon-clock"><span style="width:{pct:.0f}%;background:{colour}"></span></span>'
    return (
        f'<span class="plate p-xs sicon" style="--face:var(--steel-800);--edge:var(--steel-500);--acc:{colour}">'
        f'<svg viewBox="0 0 24 24" style="color:{colour}" fill="currentColor" aria-hidden="true">{STATUS_GLYPH[glyph]}</svg>'
        f'{count_html}{clock_html}</span>'
    )


def status_tray(counters=()):
    """Every live Counter a piece is holding, in ONE control. That is the Hero
    Frame's own answer to the 44pt rule applied a second time: four Counters as
    four targets is 176px of chrome beside a 208px frame on a 390pt surface, so
    the squares pack at the density they were drawn at and the tray as a whole
    takes the press. The block padding is what buys the tap target.

    Accepts bare ids — `("seared",)` — or full tuples
    `(id, count, remaining, duration)`."""
    if not counters:
        return ""
    squares = "".join(
        status_icon(c) if isinstance(c, str) else status_icon(*c) for c in counters
    )
    return f'<button class="stray">{squares}</button>'


FRAME_CSS = """
/* The Hero Frame (D-065, ADR 0033): the primary Hero's persistent readout,
   floating over the board's bottom edge as the dock's floor, built to the
   unit-frame anatomy an MMO player already reads. The whole frame is ONE hold
   target — four interactive rows at 44px each would be 176px of chrome over a
   board with 95px to spare. */
.frame-row{position:absolute;left:0;right:0;bottom:0;z-index:30;display:flex;align-items:flex-end;gap:6px;padding:0 8px 4px}
.frame{width:208px;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;
       padding-top:2px;padding-bottom:2px;text-align:left;color:var(--ceramic-950)}
.frame-name{display:flex;width:100%;align-items:center;gap:4px;font-size:11px;line-height:1;font-weight:600}
.i14h{height:14px;width:14px;flex-shrink:0}
.i12{height:12px;width:12px;flex-shrink:0}
.frame-gauge{width:100%}
.frame-gauge .gauge-label{font-size:10px;color:var(--ember-100)}
/* The class resource, as a bar rather than a control: read, never pressed.
   Segmented because the resource is counted rather than continuous, and
   unlabelled because its position is the label — a second bar under the
   health bar of a unit frame is the class resource. */
.resource{display:flex;height:7px;width:100%;align-items:stretch;gap:2px;overflow:hidden;border-radius:2px;background:var(--steel-950);padding:1px}
.seg{flex:1;border-radius:1px;background:var(--steel-700)}
.seg.on{background:var(--gold-500)}
.seg.ready{background:var(--gold-300)}
.piles{display:flex;align-items:center;gap:10px;font-size:10px;line-height:1;font-weight:600;color:var(--ceramic-950)}
.pile{display:flex;align-items:center;gap:4px}
/* The Signature button: its own plate at the row's right end, mounted only
   while the Signature can actually be fired — the button IS the offer. */
.sig{margin-left:auto;display:flex;min-height:52px;width:84px;flex-shrink:0;flex-direction:column;align-items:center;
     justify-content:center;gap:2px;padding-top:6px;padding-bottom:6px;color:var(--gold-950)}
.sig-name{width:100%;text-align:center;font-size:10px;line-height:1;font-weight:900;letter-spacing:.025em;text-transform:uppercase;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sig-verb{font-size:9px;line-height:1;font-weight:700;letter-spacing:.025em;text-transform:uppercase;color:var(--gold-900)}
/* The Status Icon tray sits beside the frame, where an MMO puts its buffs.
   It replaced the Counter chip, which spelled its title across a 74px plate:
   `SEARED` alone took the width two Counters need, and a third had nowhere to
   go on a 390pt surface (D-088). */
.stray{display:flex;flex-wrap:wrap;align-content:center;align-items:center;justify-content:flex-start;
       gap:4px;min-height:44px;min-width:44px;padding:8px 0;border:0;background:transparent}
"""


def hero_frame(name="Elian", health=34, max_health=34, armor=0, charges=0, cap=2,
               deck=16, discard=0, ready=False, counters=()):
    """Left-justified vertical stack: name, health with the Armor overlay, the
    class resource where an MMO puts mana, then the deck and discard counts.

    `counters` is the Status Icon tray beside it — bare Counter ids, or full
    `(id, count, remaining, duration)` tuples. It took the Counter chip's place
    in D-088."""
    scale = max(max_health, health + armor, 1)
    hf = max(0, health) / scale * 100
    af = max(0, armor) / scale * 100
    armor_html = (
        f'{ICON["shield"]("i12")}<span style="color:var(--glass-100)">{armor}</span>' if armor > 0 else ""
    )
    segs = "".join(
        f'<span class="seg {"ready" if ready else "on"}"></span>' if i < charges else '<span class="seg"></span>'
        for i in range(cap)
    )
    resource = f'<span class="resource">{segs}</span>' if cap else ""
    chips = status_tray(counters)
    sig = (
        '<button class="plate p-sm f-gold a-gold sig">'
        '<span class="sig-name">Riposte</span><span class="sig-verb">Fire</span></button>'
        if ready else ""
    )
    return (
        f'<div class="frame-row">'
        f'<button class="plate p-lg f-ceramic a-cloth frame">'
        f'<span class="frame-name"><span style="color:var(--cloth-500)">{hero_emblem("i14h")}</span>'
        f'<span>{name}</span></span>'
        f'<span class="gauge frame-gauge">'
        f'<span class="gauge-fill" style="width:{hf:.1f}%;background:rgba(217,72,47,.7)"></span>'
        f'<span class="gauge-fill" style="left:{hf:.1f}%;width:{af:.1f}%;background:rgba(63,185,207,.7)"></span>'
        f'<span class="gauge-label">{ICON["heart"]("i12")}<span>{health}/{max_health}</span>{armor_html}</span></span>'
        f'{resource}'
        f'<span class="piles"><span class="pile">{ICON["deckcount"]("i12")}{deck}</span>'
        f'<span class="pile">{ICON["discard"]("i12")}{discard}</span></span></button>'
        f'{chips}{sig}</div>'
    )


# --- The party frames ------------------------------------------------------
# The ally frames (party-frame layout direction 1A), ported from
# web/src/ui/party/PartyFrames.tsx: a left-edge column of readouts growing
# upward from the primary Hero's frame, over board pixels the melee party is
# standing near anyway — so the board keeps 100% of its width.
#
# Every frame is the primary frame's anatomy with the console removed: name,
# then health with the Armor overlay, then the Signature bank. No piles, no
# controls.

PARTY_CSS = """
/* The column: seats in authored order, growing downward toward the primary
   frame so the whole party reads as one object anchored at the bottom-left.
   Its floor is the Hero Frame's own top edge. */
.party{position:absolute;bottom:64px;left:8px;z-index:30;display:flex;width:138px;flex-direction:column;gap:4px}
/* A frame at rest owes no tap target, so the resting height is free to stay
   under 44px: it is a readout, and a readout that swallows taps is chrome the
   board paid for twice. */
.ally{display:flex;width:100%;flex-direction:column;align-items:stretch;gap:2px;
      padding-top:4px;padding-bottom:4px;text-align:left;border:0}
.ally.out{opacity:.6}
.ally-name{display:flex;min-width:0;align-items:center;gap:4px;line-height:1}
.ally-name b{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
             font-size:11px;font-weight:600;color:var(--ceramic-300)}
.i12r{height:12px;width:12px;flex-shrink:0}
/* The Boss's attention: the Threat mark, in ember coral — it names the Boss's
   plan, not the Hero's state. */
.ally-threat{display:flex;flex-shrink:0;align-items:center;gap:2px}
.ally-threat i{height:10px;width:10px;background:var(--coral-400);clip-path:polygon(50% 0,100% 100%,0 100%)}
.ally-threat u{height:10px;width:3px;background:var(--coral-500)}
.ally-gauge{position:relative;display:block;height:12px;overflow:hidden;border-radius:2px;background:var(--steel-950)}
/* A body on the floor reads as hatched ground rather than as an empty bar —
   an empty bar is a Hero at 0 health, which is a different claim. */
.ally-gauge.downed{background:repeating-linear-gradient(115deg,var(--ember-950) 0 4px,var(--steel-950) 4px 9px)}
.ally-gauge .gauge-label{font-size:9px;color:var(--ember-100)}
.ally-gauge.downed .gauge-label{color:var(--ember-300);letter-spacing:.1em}
/* The ally's own Signature bank — every seat may field one (ADR 0035). Thinner
   than the primary's resource bar because it is read from further away and
   never operated. */
.ally-sig{display:flex;height:5px;gap:2px}
.ally-sig span{flex:1;border-radius:2px;background:var(--steel-700)}
.ally-sig span.on{background:var(--gold-500)}
.ally-sig span.ready{background:var(--gold-300)}
"""

# The Role glyphs (PartyFrames.tsx). Filled, at 12px, because the name beside
# them is 11px: a line-art mark at this size is a smudge.
ROLE_GLYPH = {
    "tank": '<path d="M24 4 40 10v12c0 10-6 18-16 22C14 40 8 32 8 22V10L24 4Z"/>',
    "healer": '<path d="M20 5h8v13h13v8H28v17h-8V26H7v-8h13V5Z"/>',
    "damage": '<path d="M24 3l7 15-7 7-7-7 7-15Z"/><path d="M17 27h14l-7 18-7-18Z"/>',
}


def role_accent(role):
    """The Signal cloth channel, one step per Role. Two Damage seats share a
    step deliberately: they are one Role, and the channel names Roles."""
    return {"tank": "var(--cloth-500)", "healer": "var(--cloth-300)"}.get(role, "var(--cloth-400)")


def frame_accent(role, status="living", threat=False, revivable=False):
    """Status outranks Role on the accent channel: living gold for the one
    frame the player can operate, ember for a body on the floor, ember coral
    for the Boss's attention."""
    if revivable:
        return "var(--gold-400)"
    if status != "living":
        return "var(--ember-500)"
    if threat:
        return "var(--coral-500)"
    return role_accent(role)


def ally_frame(name="Maren", role="healer", health=22, max_health=26, armor=0,
               status="living", threat=False, revivable=False, charges=0, cap=0):
    """One ally's readout. In the one moment a legal ally action exists — the
    primary Hero adjacent to a Downed ally with a card in hand — that frame
    alone becomes the button: its accent turns living gold and a tap parks the
    rescue the way a move parks. Otherwise the frame is the switch, the way a
    portrait click is in a party RPG. Nothing else on screen moves, and no
    second interactive row ever appears."""
    down = status != "living"
    scale = max(max_health, health + armor, 1)
    hf = 0.0 if down else max(0, health) / scale * 100
    af = 0.0 if down else max(0, armor) / scale * 100
    if status == "incapacitated":
        label = "INCAPACITATED"
    elif status == "downed":
        label = "REVIVE · 1 CARD" if revivable else "DOWNED"
    elif armor > 0:
        label = f"{health}+{armor}/{max_health}"
    else:
        label = f"{health}/{max_health}"
    threat_html = (
        '<span class="ally-threat" title="The Boss\'s attention"><i></i><u></u></span>'
        if threat and not down else ""
    )
    bank = ""
    if cap > 0 and status == "living":
        segs = "".join(
            f'<span class="{"ready" if charges >= cap else "on"}"></span>' if i < charges else "<span></span>"
            for i in range(cap)
        )
        bank = f'<span class="ally-sig">{segs}</span>'
    return (
        f'<button class="plate p-sm ally{" out" if status == "incapacitated" else ""}" '
        f'style="--face:var(--steel-950);--acc:{frame_accent(role, status, threat, revivable)}">'
        f'<span class="ally-name"><span style="color:{role_accent(role)};display:flex">'
        f'<svg viewBox="0 0 48 48" class="i12r" fill="currentColor" aria-hidden="true">{ROLE_GLYPH.get(role, ROLE_GLYPH["damage"])}</svg>'
        f'</span><b>{name}</b>{threat_html}</span>'
        f'<span class="ally-gauge{" downed" if down else ""}">'
        f'<span class="gauge-fill" style="width:{hf:.1f}%;background:rgba(217,72,47,.7)"></span>'
        f'<span class="gauge-fill" style="left:{hf:.1f}%;width:{af:.1f}%;background:rgba(63,185,207,.7)"></span>'
        f'<span class="gauge-label">{label}</span></span>'
        f'{bank}</button>'
    )


def party_frames(frames):
    """The column. Renders nothing for a solo Encounter — the seam costs the
    teaching slice zero pixels."""
    if not frames:
        return ""
    return '<div class="party">' + "".join(ally_frame(**f) for f in frames) + "</div>"


# --- The dock --------------------------------------------------------------
DOCK_CSS = """
/* Every floating surface lands in one of three zones, and the zones are flex
   siblings of one column — so no two can share a pixel, and a bar appearing
   or leaving never resizes the board mid-Encounter. */
.beat{display:flex;width:100%;flex-direction:column;gap:6px;text-align:left;box-shadow:0 20px 25px -5px rgba(0,0,0,.5)}
.beat-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.beat-track{flex-shrink:0;font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--steel-400)}
.beat-verb{flex-shrink:0;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--coral-300)}
.beat-title{font-size:14px;font-weight:700;color:var(--coral-100);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.beat-stats{display:flex;flex-wrap:wrap;gap:2px 12px}
.beat-stat{font-size:10px;color:var(--steel-300,#c9d2e0)}
.beat-stat b{font-weight:400;color:var(--steel-500)}
.beat-text{font-size:10px;line-height:1.4;color:var(--steel-400)}
.beat-tags{font-size:10px;color:var(--steel-500)}
.demand{display:flex;width:100%;align-items:center;justify-content:space-between;gap:8px;box-shadow:0 10px 15px -3px rgba(0,0,0,.4)}
.demand-word{font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--steel-400)}
.toast{padding-top:8px;padding-bottom:8px;text-align:center;font-size:12px;font-weight:600;color:var(--ember-100)}
.prompt{display:flex;align-items:center;justify-content:space-between;padding-top:8px;padding-bottom:8px;
        font-size:12px;font-weight:600;color:var(--gold-100);box-shadow:0 10px 15px -3px rgba(0,0,0,.4)}
.prompt-cancel{min-height:44px;font-weight:700;color:var(--gold-950)}
"""


# --- Artboard shell --------------------------------------------------------
def artboard(title, body, width, extra_css="", background=None, pad=0):
    """One artboard, in the editor's own document shape: the support.js head
    line it needs exactly, styles inside <helmet>, content inside <x-dc>."""
    bg = background or "var(--navy-950)"
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
:root {{{TOKENS}}}
{BASE_CSS}
{PLATE_CSS}
{extra_css}
.artboard{{width:{width}px;background:{bg};padding:{pad}px;overflow:hidden}}
.legend{{font-size:11px;line-height:1.5;color:var(--steel-400)}}
.legend b{{color:var(--ceramic-300);font-weight:600}}
.head{{font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ceramic-200)}}
.sub{{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--steel-500);margin-top:2px}}
.rule{{height:1px;background:var(--steel-800);margin:14px 0}}
.tile{{background:rgba(15,22,34,.55);border:1px solid var(--steel-800);border-radius:4px;padding:12px}}
.tile-label{{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--steel-500);margin-bottom:8px}}
</style>
</helmet>
<section class="artboard">{body}</section>
</x-dc>
</body>
</html>
"""


# The play surface: portrait frame, 390x844, edge to edge below `sm`.
SURFACE_CSS = """
.surface{position:relative;display:flex;flex-direction:column;width:390px;height:844px;
         overflow:hidden;background:var(--steel-950);color:var(--ceramic-200)}
.board{position:relative;flex:1;min-height:0;overflow:hidden;display:flex;align-items:flex-start;justify-content:center}
.board img{display:block;width:390px}
.dock{position:absolute;left:0;right:0;bottom:60px;z-index:20;display:flex;flex-direction:column;gap:6px;padding:0 8px}
"""


def build():
    hand_w = "90.5px"

    # ---------------- Main.dc.html: the Quick Window ----------------------
    quick_slots = (
        slot("Iron Guard", cap=3, charges=1, state="charged", speed="quick", wants=("guard",))
        + slot("Sweeping Blow", cap=2, charges=2, state="full", speed="quick", wants=("attack",))
    )
    quick_hand = "".join([
        keyword_face("Iron Guard", ["guard", "tank"], {"guard", "tank"}, hand_w),
        keyword_face("Sweeping Blow", ["attack", "board"], {"attack"}, hand_w),
        keyword_face("Fortify", ["guard", "growth"], {"guard"}, hand_w),
        keyword_face("Quench", ["tempo", "support"], set(), hand_w),
    ])
    quick_party = party_frames([
        dict(name="Maren", role="healer", health=22, max_health=26, charges=1, cap=2),
        dict(name="Roan Kesh", role="damage", health=19, max_health=24, armor=3, threat=True),
    ])
    main_body = f"""<div class="surface">
  {phase_band("quick", 3, 2, 0.0)}
  <div class="board">
    <img src="board.jpg" alt="The Embermaw board: Elian Voss holding the Guarded Front, the Boss above, a telegraphed cone below.">
    {quick_party}
    {hero_frame(health=31, armor=4, charges=1, cap=2, deck=11, discard=5, ready=True, counters=("fortified",))}
  </div>
  {action_bar(quick_slots)}
  <div class="hand">{quick_hand}</div>
</div>"""

    # ---------------- Loadout.dc.html --------------------------------------
    loadout_slots = slot(None) + slot(None)
    loadout_hand = "".join([
        card_face("Iron Guard", "quick", 3, "guard", hand_w),
        card_face("Sweeping Blow", "quick", 2, "attack", hand_w),
        card_face("Iron Guard", "quick", 3, "guard", hand_w),
        card_face("Steady Strike", "quick", 2, "attack", hand_w, selected=True),
    ])
    loadout_body = f"""<div class="surface">
  {phase_band("loadout", 1, 0, 0.0)}
  <div class="board">
    <img src="board.jpg" alt="The Embermaw board at Loadout.">
    <div class="dock">
      <div class="plate p-sm f-steel a-gold prompt">
        <span>Slots set — press Next</span><span class="plate p-sm f-gold a-gold prompt-cancel" style="display:flex;align-items:center">Got it</span>
      </div>
    </div>
    {hero_frame(health=34, armor=0, charges=0, cap=2, deck=16, discard=0, ready=False)}
  </div>
  {action_bar(loadout_slots, undo_armed=False)}
  <div class="hand">{loadout_hand}</div>
</div>"""

    surface_css = SURFACE_CSS + TRACK_CSS + BAR_CSS + HAND_CSS + FRAME_CSS + STATUS_CSS + PARTY_CSS + DOCK_CSS

    write("Main.dc.html", artboard("Quick Window", main_body, 390, surface_css, "var(--steel-950)"))
    write("Loadout.dc.html", artboard("Loadout", loadout_body, 390, surface_css, "var(--steel-950)"))

    # ---------------- PlateSystem.dc.html ----------------------------------
    sizes = [
        ("wb-plate-xs", "p-xs", "3px", "~24px chips", "Live phase chip"),
        ("wb-plate-sm", "p-sm", "5px", "~38–44px controls", "Prompts, Signature button"),
        ("wb-plate-md", "p-md", "7px", "~48px cards", "Beat Card"),
        ("wb-plate-card", "p-card", "7px", "Compact Card", "gutter drops to 4px"),
        ("wb-plate-lg", "p-lg", "9px", "~62px readouts", "Hero Frame, rails"),
        ("wb-plate-slot", "p-slot", "9px", "Action Bar Slot", "gutter drops to 3px"),
        ("wb-plate-xl", "p-xl", "16px", "~112px panels", "Modals, outcome banner"),
    ]
    size_rows = "".join(
        f'<div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">'
        f'<div class="plate {cls} f-steel a-gold" style="width:190px;height:52px;display:flex;align-items:center;font-size:11px;font-weight:600">{name}</div>'
        f'<div class="legend" style="flex:1"><b>--wb-off: {off}</b> · {use}<br>{note}</div></div>'
        for name, cls, off, use, note in sizes
    )
    faces = [("f-steel", "steel", "var(--ceramic-200)"), ("f-dim", "dim", "var(--steel-500)"),
             ("f-ceramic", "ceramic", "var(--ceramic-950)"), ("f-gold", "gold", "var(--gold-950)"),
             ("f-coral", "coral", "var(--coral-950)"), ("f-glass", "glass", "var(--glass-950)")]
    face_row = "".join(
        f'<div class="plate p-md {cls} a-none" style="width:104px;height:46px;display:flex;align-items:center;'
        f'justify-content:center;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:{ink}">{label}</div>'
        for cls, label, ink in faces
    )
    accents = [("a-gold", "gold — live"), ("a-ember", "ember — irreversible"),
               ("a-glass", "glass — player affordance"), ("a-cloth", "cloth — the role channel"), ("a-none", "none")]
    acc_row = "".join(
        f'<div class="plate p-md f-steel {cls}" style="width:132px;height:46px;display:flex;align-items:center;font-size:10px;color:var(--steel-400)">{label}</div>'
        for cls, label in accents
    )
    plate_body = f"""
<div class="head">The raked plate</div>
<div class="sub">web/src/index.css · @utility wb-plate</div>
<div class="legend" style="margin-top:12px;max-width:660px">
Every surface in the chrome is a parallelogram raked 8° from vertical, with the top-left corner notched
out of the silhouette and the leading edge carrying a 3px accent that runs the full cut. The rake is drawn
on a <b>::before</b> layer with <b>clip-path</b> rather than by clipping the element — a clipped element loses
its focus ring, its shadow, and its border on the two cut edges, and the accessibility contract requires a
visible ring on every control.
</div>
<div class="rule"></div>
<div style="display:flex;gap:24px;align-items:flex-start">
  <div class="tile" style="width:280px">
    <div class="tile-label">Anatomy</div>
    <div class="plate p-xl f-steel a-gold" style="height:112px;display:flex;flex-direction:column;justify-content:center;gap:6px">
      <div style="font-size:11px;font-weight:700;color:var(--ceramic-200)">Content sits above both layers</div>
      <div class="legend" style="font-size:10px">--wb-off is the cut's real depth;<br>--wb-notch lifts the leading corner.</div>
    </div>
    <div class="legend" style="margin-top:12px;font-size:10px">
      <b>offset = height × tan(8°)</b> — derived, never chosen. A plate much taller than its size class
      simply wears a shallower rake.
    </div>
  </div>
  <div style="flex:1">
    <div class="tile-label">The one padding rule</div>
    <div class="tile" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.7;color:var(--glass-200)">
      padding-inline: calc(var(--wb-inset) + var(--wb-gutter));
    </div>
    <div class="legend" style="margin-top:10px;max-width:380px">
      <b>--wb-inset</b> is how deep the cut reaches <i>this plate's content</i>: content spanning the plate meets the
      full offset, content held to the middle band meets half of it (<b>wb-plate-centered</b>).
      <b>--wb-gutter</b> is the breathing room past the cut, and it is the only figure tuned by eye.
      Nothing else sets padding-inline — a plate that wants width back lowers the gutter or declares where its
      content sits. A browser check holds every visible plate to <b>padding ≥ --wb-inset</b>.
    </div>
  </div>
</div>
<div class="rule"></div>
<div class="tile-label">Sizes</div>
{size_rows}
<div class="rule"></div>
<div class="tile-label">Faces</div>
<div style="display:flex;gap:10px;flex-wrap:wrap">{face_row}</div>
<div class="tile-label" style="margin-top:18px">Accents — the status channel</div>
<div style="display:flex;gap:10px;flex-wrap:wrap">{acc_row}</div>
"""
    write("PlateSystem.dc.html", artboard("Plate system", plate_body, 760, TRACK_CSS, pad=28))

    # ---------------- PhaseBand.dc.html ------------------------------------
    states = "".join(
        f'<div style="margin-bottom:14px"><div class="tile-label">{label}</div>'
        f'<div style="width:390px;background:var(--steel-950)">{phase_band(phase, r, e, f)}</div></div>'
        for phase, label, r, e, f in [
            ("loadout", "Loadout — cards set out, nothing fired", 1, 0, 0.25),
            ("instant", "Boss Instant — it lands as the window opens", 2, 0, 0.5),
            ("quick", "Quick Window — yours, and fast", 3, 1, 0.0),
            ("incoming", "Boss Incoming — the telegraphed beat landing", 5, 2, 0.0),
            ("slow", "Slow Window — yours, on the mechanism you wound up", 7, 4, 0.0),
        ]
    )
    phase_body = f"""
<div class="head">Round track &amp; Encounter clock</div>
<div class="sub">PhaseControl · phaseTrack · EscalationGauge</div>
<div class="legend" style="margin-top:12px;max-width:380px">
Five marks, one per window, each wearing its owner's tone at rest and its wedge — <b>the Boss's windows
point down at the board, yours point up</b> — so the Round's shape reads before any window opens. The live
window is not a sixth tint but the row's one lit chip: a raked plate in the owner's material carrying the
window's word. One word always fits where five never did.
</div>
<div class="rule"></div>
{states}
<div class="rule"></div>
<div class="legend" style="max-width:380px">
Under the track, on its own line, is <b>Escalation</b> — the encounter's only clock (ADR 0027). It carries no
label: the reading is in the shape. The last band, the one that ends the fight, is washed in at the far end
before the clock ever reaches it, and a fuse burns through the first band while the automatic ticks are
still dormant, so a clock that cannot move yet does not read as one that has stopped.
</div>
"""
    write("PhaseBand.dc.html", artboard("Round track", phase_body, 440, TRACK_CSS, pad=24))

    # ---------------- ActionBar.dc.html ------------------------------------
    bar_states = [
        ("Empty — nothing prepared", slot(None) + slot(None), False),
        ("Loaded — a Top Card, no Charge", slot("Iron Guard", 3, 0, "loaded", "quick", ("guard", "tank")) + slot("Steady Strike", 2, 0, "loaded", "quick", ("attack",)), True),
        ("Charged — the stack building", slot("Iron Guard", 3, 2, "charged", "quick", ("guard", "tank")) + slot("Steady Strike", 2, 1, "charged", "quick", ("attack",)), True),
        ("Full — the ward ring closes, the gaps shut", slot("Iron Guard", 3, 3, "full", "quick", ("guard", "tank")) + slot("Steady Strike", 2, 2, "full", "quick", ("attack",)), True),
        ("Fired — spent this window, glass strike on the head", slot("Iron Guard", 3, 3, "fired", "quick", ("guard", "tank")) + slot("Steady Strike", 2, 2, "fired", "quick", ("attack",)), True),
        ("Out of window — Full's gold cannot claim “can fire”", slot("Fortify", 2, 2, "full", "slow", ("guard",), True) + slot("Quench", 2, 1, "charged", "slow", ("tempo",), True), True),
    ]
    bar_rows = "".join(
        f'<div style="margin-bottom:16px"><div class="tile-label">{label}</div>'
        f'<div style="width:390px;background:var(--steel-950)">{action_bar(s, undo)}</div></div>'
        for label, s, undo in bar_states
    )
    bar_body = f"""
<div class="head">The Action Bar</div>
<div class="sub">A twelve-unit ladder: 2 | 4 | 4 | 2</div>
<div class="legend" style="margin-top:12px;max-width:380px">
The rails take two units each and the replaceable Slots share the eight between them. Undo and the advance
control are the two most-pressed things in the interface, and the ladder exists to put them under the thumb.
A grid rather than a flex row because the ladder is the contract: the Slots must not resize when a rail
changes what it is. <b>The Signature Slot never renders here</b> — its face is the Hero Frame's control (D-065),
so the bar carries exactly the Slots a hand card can reach.
</div>
<div class="rule"></div>
{bar_rows}
<div class="rule"></div>
<div class="legend" style="max-width:380px">
A Slot's state lives in two channels at once. The <b>leading-edge accent</b> is the status channel every plate
shares. The <b>lock head</b> is the glance-distance signal: its ward ring is broken while charging and closed at
full stack with a second faint ring outside it — a ring closing is a shape change, so it reads in peripheral
vision and without colour. The tumblers say the same thing a second way: separate raked pins with gaps while
charging, and when the last one seats the gaps close and they read as one continuous bar.
</div>
"""
    write("ActionBar.dc.html", artboard("Action Bar", bar_body, 440, BAR_CSS, pad=24))

    # ---------------- HeroFrame.dc.html ------------------------------------
    def frame_on_board(inner, h=88):
        return (f'<div style="position:relative;width:390px;height:{h}px;background:'
                f'linear-gradient(180deg,#131c2b,#0b1220);overflow:hidden">{inner}</div>')

    frame_states = [
        ("Unearned — the meter says how many there are to fill", hero_frame(health=34, armor=0, charges=0, cap=2, deck=16, discard=0)),
        ("Banked — a Charge earned, the window not open", hero_frame(health=31, armor=4, charges=1, cap=2, deck=13, discard=3)),
        ("Ready — the button arrives, and it is always pressable", hero_frame(health=28, armor=4, charges=1, cap=2, deck=11, discard=5, ready=True)),
        ("Full bank + the Status Icon tray beside it", hero_frame(
            health=24, armor=2, charges=2, cap=2, deck=9, discard=7, ready=True,
            counters=(("fortified", 1, 0, 0), ("seared", 2, 1, 3), ("underwritten", 1, 0, 0)))),
    ]
    frame_rows = "".join(
        f'<div style="margin-bottom:16px"><div class="tile-label">{label}</div>{frame_on_board(f)}</div>'
        for label, f in frame_states
    )
    frame_body = f"""
<div class="head">The Hero Frame</div>
<div class="sub">D-065 · ADR 0033</div>
<div class="legend" style="margin-top:12px;max-width:380px">
The primary Hero's persistent readout, floating over the board's bottom edge, built to the unit-frame anatomy
an MMO player already reads: a left-justified vertical stack of <b>name</b>, then <b>health with the Armor overlay</b>,
then <b>the class resource where mana sits</b>, then <b>the deck and discard counts</b>. It absorbed the hero branch of
the Stat Panel and never dismisses; a tap on the Hero's tile pulses it instead of opening a panel.
</div>
<div class="rule"></div>
{frame_rows}
<div class="rule"></div>
<div class="legend" style="max-width:380px">
<b>One hold target, not four.</b> Every button on the play surface owes a 44px tap target, so a stack of four
interactive rows would be 176px of chrome over a board with 95px to spare below its last hex row. One target
over the whole stack costs 61px and still carries the sentences a hold is for.
<br><br>
<b>The resource bar is read; the button is pressed.</b> The bar is segmented because a Charge is counted rather than
continuous, and unlabelled because its position is the label. The Signature button is a separate plate, on
screen if and only if the Signature can fire right now — so a button the player can see is always one they can
press. That division is what makes appear-when-usable honest: without a permanently visible bar it would hide
the whole mechanic, which is why the same shape was refused before the bar existed.
</div>
"""
    write("HeroFrame.dc.html", artboard("Hero Frame", frame_body, 440, FRAME_CSS + STATUS_CSS, pad=24))

    # ---------------- PartyFrames.dc.html ----------------------------------
    def party_on_board(inner, h=150):
        return (f'<div style="position:relative;width:390px;height:{h}px;background:'
                f'linear-gradient(180deg,#131c2b,#0b1220);overflow:hidden">{inner}</div>')

    party_states = [
        ("At rest — two allies, one carrying the Boss's attention", [
            dict(name="Maren", role="healer", health=22, max_health=26, charges=1, cap=2),
            dict(name="Roan Kesh", role="damage", health=19, max_health=24, armor=3, threat=True),
        ]),
        ("Downed — the rescue is not legal from here", [
            dict(name="Maren", role="healer", health=0, max_health=26, status="downed"),
            dict(name="Roan Kesh", role="damage", health=19, max_health=24, armor=3),
        ]),
        ("Revivable — the frame IS the button, and says its price", [
            dict(name="Maren", role="healer", health=0, max_health=26, status="downed", revivable=True),
            dict(name="Roan Kesh", role="damage", health=19, max_health=24, armor=3),
        ]),
        ("Incapacitated — the rescue window closed", [
            dict(name="Maren", role="healer", health=0, max_health=26, status="incapacitated"),
            dict(name="Roan Kesh", role="damage", health=11, max_health=24, threat=True),
        ]),
    ]
    party_rows = "".join(
        f'<div style="margin-bottom:16px"><div class="tile-label">{label}</div>'
        f'{party_on_board(party_frames(frames) + hero_frame(health=31, armor=4, charges=1, cap=2, deck=11, discard=5))}</div>'
        for label, frames in party_states
    )
    party_body = f"""
<div class="head">The party frames</div>
<div class="sub">Layout direction 1A</div>
<div class="legend" style="margin-top:12px;max-width:380px">
A left-edge column of readouts growing upward from the primary Hero's frame, over board pixels the melee party
is standing near anyway — so <b>the board keeps 100% of its width</b>. Every frame is the primary frame's anatomy
with the console removed: <b>name</b>, <b>health with the Armor overlay</b>, <b>the Signature bank</b>. No piles,
no controls.
</div>
<div class="rule"></div>
{party_rows}
<div class="rule"></div>
<div class="legend" style="max-width:380px">
<b>A frame at rest owes no tap target</b>, so the resting height is free to stay under 44px — it is a readout, and a
readout that swallows taps is chrome the board paid for twice. In the one moment a legal ally action exists — the
primary Hero adjacent to a Downed ally with a card in hand — that frame alone becomes the button: its accent turns
living gold, the bar names the price, and a tap parks the rescue the way a move parks, waiting on the Hand to name
the card that pays. Nothing else on screen moves, and no second interactive row ever appears.
<br><br>
<b>Otherwise the frame is the switch.</b> One player pilots the Party, and a tap swaps the whole panel — shared board,
no camera movement, the displaced Hero taking the tapped one's place in the column. The column shows whoever the
console does not, so the swap is symmetric.
<br><br>
<b>Status outranks Role on the accent channel.</b> Role is the Signal cloth step — Tank 500, Healer 300, Damage 400 —
and it is what a frame wears when it has nothing more urgent to say. Living gold overrides it for the one frame the
player can operate, ember for a body on the floor, ember coral for the Boss's attention. A Downed frame's track is
hatched rather than empty, because an empty bar is a Hero at 0 health, which is a different claim.
</div>
"""
    write("PartyFrames.dc.html", artboard("Party frames", party_body, 440, FRAME_CSS + STATUS_CSS + PARTY_CSS, pad=24))

    # ---------------- HandFaces.dc.html ------------------------------------
    w = "90.5px"
    faces_rows = "".join([
        f'<div style="margin-bottom:16px"><div class="tile-label">Card face — Loadout: what a Slot would get</div>'
        f'<div class="hand" style="width:390px">'
        + "".join([card_face("Iron Guard", "quick", 3, "guard", w),
                   card_face("Sweeping Blow", "quick", 2, "attack", w),
                   card_face("Fortify", "slow", 2, "guard", w),
                   card_face("Steady Strike", "quick", 2, "attack", w, selected=True)])
        + '</div></div>',
        f'<div style="margin-bottom:16px"><div class="tile-label">Keyword face — Quick and Slow: what a Slot is hunting for</div>'
        f'<div class="hand" style="width:390px">'
        + "".join([keyword_face("Iron Guard", ["guard", "tank"], {"guard", "tank"}, w),
                   keyword_face("Sweeping Blow", ["attack", "board"], {"attack"}, w),
                   keyword_face("Fortify", ["guard", "growth"], {"guard"}, w),
                   keyword_face("Quench", ["tempo", "support"], set(), w)])
        + '</div></div>',
        f'<div style="margin-bottom:16px"><div class="tile-label">Stamina face — a move lined up: one card, one hex</div>'
        f'<div class="hand offering" style="width:390px">'
        + "".join([stamina_face("Iron Guard", False, w), stamina_face("Sweeping Blow", True, w),
                   stamina_face("Fortify", False, w), stamina_face("Quench", False, w)])
        + '</div></div>',
    ])
    hand_body = f"""
<div class="head">The Hand</div>
<div class="sub">Three faces, one row — handFace.ts</div>
<div class="legend" style="margin-top:12px;max-width:380px">
What each Compact Card shows is the face the current gesture calls for. A card keeps one width — its share of
a full Hand — whether five remain or one: cards that stretched to fill the row stopped reading as cards.
</div>
<div class="rule"></div>
{faces_rows}
<div class="rule"></div>
<div class="legend" style="max-width:380px">
The <b>card face</b> describes the card as a Top Card, which is exactly what Loadout is choosing. The <b>keyword face</b>
drops the speed word and the Charge pips — both describe a Top Card, and a card being tucked adds one Charge
whatever its own speed says — and promotes the Hero's own Keyword marks, gold on the ones a loaded Top Card
would pay off for. The <b>Stamina face</b> makes the whole Hand a stack of interchangeable coins, because looking
like anything else would suggest the choice of which one to spend matters more than it does.
</div>
"""
    write("HandFaces.dc.html", artboard("Hand faces", hand_body, 440, HAND_CSS + FRAME_CSS, pad=24))

    # ---------------- Dock.dc.html -----------------------------------------
    beat = """<button class="plate p-md p-raked f-steel a-ember beat">
  <span class="beat-head"><span class="beat-track">Boss · Instant</span><span class="beat-verb">Resolve ▸</span></span>
  <span class="beat-title">Close the Gap</span>
  <span class="beat-stats"><span class="beat-stat"><b>Advances</b> 1 hex</span></span>
  <span class="beat-text">Embermaw advances one hex toward the guardian. Distance is not an answer for long.</span>
  <span class="beat-tags">Position</span>
</button>"""
    demand = """<div class="plate p-sm p-raked f-steel a-ember demand" style="--gutter-block:6px">
  <span class="demand-word">Standing</span>
  <span style="font-size:11px;font-weight:700;color:var(--coral-100)">Brood Call</span>
  <span style="font-size:10px;font-weight:600;color:var(--ember-300)">Unanswered</span>
</div>"""
    targeting = """<div class="plate p-sm f-steel a-gold prompt">
  <span>Pick a piece</span>
  <span class="plate p-sm f-gold a-gold prompt-cancel" style="display:flex;align-items:center">Cancel</span>
</div>"""
    rejection = '<div class="plate p-sm f-steel a-ember toast">The Signature charges only through its standing clause.</div>'
    dock_body = f"""
<div class="head">The notification dock</div>
<div class="sub">Three zones · NotificationLayer</div>
<div class="legend" style="margin-top:12px;max-width:380px">
Every floating surface on the play field lands in one of three zones, and the zones are flex siblings of one
column — so no two can share a pixel, and a bar appearing or leaving never resizes the board mid-Encounter.
<b>Guidance</b> floats over the top hexes: teaching the player may ignore. The <b>stage</b> takes the middle for one
announcement at a time. The <b>dock</b> hugs the Action Bar with everything that asks for a tap on the controls just
below it — and its floor is the Hero Frame's top edge.
</div>
<div class="rule"></div>
<div class="tile-label">Beat Card — the dock's anchor rank</div>
<div style="width:374px;margin-bottom:18px">{beat}</div>
<div class="tile-label">Standing Demand — the one Beat that resolves to nothing</div>
<div style="width:374px;margin-bottom:18px">{demand}</div>
<div class="tile-label">Targeting prompt</div>
<div style="width:374px;margin-bottom:18px">{targeting}</div>
<div class="tile-label">Refusal toast</div>
<div style="width:374px;margin-bottom:18px">{rejection}</div>
<div class="rule"></div>
<div class="legend" style="max-width:380px">
Both dock plates carry a text column pinned to the leading edge, and a raked box read as a column is a wedge —
the gutter changes with every row. They take <b>wb-gutter-raked</b>, which measures each side at the corner that
side is worst at and adds the notch back on top, so the wedge is spent on the plate's silhouette rather than on
the text. The Beat Card's accent breathes rather than its face: the face dipping to 55% would show the board
straight through a card carrying a Beat's rules text, and no contrast check catches that.
</div>
"""
    write("Dock.dc.html", artboard("Dock", dock_body, 440, DOCK_CSS + TRACK_CSS, pad=24))

    # ---------------- canvas.json ------------------------------------------
    canvas = {
        "artboards": [
            {"file": "Main.dc.html", "x": 0, "y": 0, "w": 390, "h": 844, "title": "Quick Window — the live HUD"},
            {"file": "Loadout.dc.html", "x": 450, "y": 0, "w": 390, "h": 844, "title": "Loadout — empty Slots, card faces"},
            {"file": "PlateSystem.dc.html", "x": 900, "y": 0, "w": 760, "h": 700, "title": "The raked plate"},
            {"file": "Dock.dc.html", "x": 1720, "y": 0, "w": 440, "h": 800, "title": "Notification dock"},
            {"file": "PhaseBand.dc.html", "x": 900, "y": 760, "w": 440, "h": 700, "title": "Round track & clock"},
            {"file": "ActionBar.dc.html", "x": 1400, "y": 760, "w": 440, "h": 860, "title": "Action Bar states"},
            {"file": "HeroFrame.dc.html", "x": 0, "y": 910, "w": 440, "h": 780, "title": "Hero Frame & Signature"},
            {"file": "HandFaces.dc.html", "x": 460, "y": 910, "w": 440, "h": 700, "title": "Hand faces"},
            {"file": "PartyFrames.dc.html", "x": 1900, "y": 860, "w": 440, "h": 900, "title": "Party frames"},
        ],
        "annotations": [
            {"id": "read-me", "x": -430, "y": 0, "w": 380,
             "text": "The current Game UI of Raid Card Tactics, reproduced from the shipped source rather than sketched: the palette and plate geometry from web/src/index.css, the gauge language from web/src/ui/common/theme.ts, the markup from the components, and every box size measured off the running app at 390x844. The board art in the two screen boards is the game's own render.\n\nTwo screens on the left, seven component boards to the right."},
            {"id": "surface", "x": -430, "y": 300, "w": 380,
             "text": "The play surface is 390x844 — a phone in portrait, edge to edge. It is a fixed column: phase band, board, Action Bar, Hand. The board sizes to the space the HUD leaves and must never resize mid-Encounter, which is why every floating surface is absolutely positioned over it and why the Hand keeps its row height as it empties."},
            {"id": "signature", "x": 0, "y": 1730, "w": 400,
             "text": "The Signature button appears only while the Signature can fire. That is safe because the resource bar carries permanence: the earn is taught by a visibly empty meter, and a held bank stays readable in the windows the Signature cannot act in."},
        ],
        "launch": {"view": "canvas"},
    }
    write("canvas.json", json.dumps(canvas, indent=2) + "\n")
    print("wrote 9 artboards + canvas.json")


def write(name, text):
    with open(os.path.join(OUT, name), "w") as handle:
        handle.write(text)


if __name__ == "__main__":
    build()
