# Tempo popup — design rationale

Design pass by Claude Opus 5.5 (`claude-opus-5-5`). Scope: `extension/popup.css` only; `popup.html` is unchanged.

## Direction

Follows the live dc-reviewagent reference: a light utility interface. White canvas, `#1A1A1A` ink, quiet gray hairlines, 6–8px radii, Geist for UI, Geist Mono for the count. No gradients, hero art, heavy shadows, or card stacks. The only decoration is two hairlines around the timer, plus one above the footer.

## Hierarchy

1. **Countdown** — 48px Geist Mono, weight 500, tabular figures, centered between hairlines. It is the only large type in the popup. It turns muted when idle or paused, so whether the timer is live shows up before the status pill is read. `.countdown-unit` is muted to quiet the secondary part of the readout.
2. **Primary action** — the only gold surface (`#FFA300`) in the popup, with `#1A1A1A` text (8.7:1). A 1px `#C27C00` edge gives the button 3.4:1 against white. Gold is never used with white text.
3. **Everything else** — 14px controls, 13px helpers, 12px eyebrow, status, and footer.

## Color roles

- **Gold means action.** It is used for the primary button, the progress fill, and the paused-status dot.
- **Ink means selection.** The checked scope option and pressed preset are filled with ink and get white text. A second accent color would compete with the gold action.
- **State colors stay in the status pill.** Running is green-tinted with a pulsing dot. Paused is amber-tinted. Idle is a neutral outline. All pill text is at least 5.9:1.

## Layout at 380 × <600

Content width is 340px (20px side padding). The vertical budget is estimated at about 570px with the running actions visible. Space was saved in four places:

- **Inline legends.** "Refresh" floats left of the scope segmented control, and "Custom interval" sits on the same row as its inputs.
- **Range hint.** `#interval-help` is positioned at the top-right of the "Every" fieldset, on the legend row. It is still linked to the input through `aria-describedby`.
- **Shared action row.** When `#running-actions` is visible, the primary button shares its row with Pause and Stop: `#timer-form:has(> .running-actions:not([hidden]))`. When idle, the primary button spans the full width.
- **Footer.** The two footer paragraphs and the Help link flow as one 12px paragraph of about 3 lines instead of about 5.

The error message is plain red text (no box), which keeps it from overflowing in the idle state.

## Controls

- **Scope and presets** share one segmented-track style: a 1px `#8A8A8A` boundary (3.4:1), with 28px inner segments. The radio inputs are hidden visually but stay focusable. Focus is drawn on the adjacent `span`.
- **Number input and select** are 34px high with the same 3:1 border. Spinners are removed, since the presets cover coarse changes and arrow keys still work. The select uses an inline SVG chevron (data URI, so nothing loads from the network).
- **Bypass cache** uses a native checkbox with `accent-color: ink`. The label and the hint sit on one line.
- **Secondary buttons:** Pause is neutral. Stop uses danger-red text (6.6:1) with a light red tint on hover.
- **Disabled controls** (the loading state) drop to 50% opacity. The disabled primary button turns neutral gray instead of washed-out gold.

## Accessibility

- **Focus ring:** a global `:focus-visible` 2px outline in the text color, with a 1px offset inside the segmented tracks.
- **Contrast:** all text is at least 4.5:1 in both themes, and control boundaries are at least 3:1.
- **`[hidden]`** is forced to `display: none !important`, so `.running-actions { display: flex }` can never reveal it.
- **`prefers-reduced-motion`** disables the progress-bar transition and the status pulse.

## Dark mode

Under `prefers-color-scheme: dark`:

- **Surfaces:** `#161616` background, `#EDEDED` text, `#A3A3A3` muted text, `#6B6B6B` control borders (3.4:1).
- **Selection** inverts to a light fill with dark text.
- **Gold stays gold,** with dark text.

## Fonts

`@font-face` loads `fonts/geist-latin.woff2` and `fonts/geist-mono.woff2` as variable fonts (100–900). There is a system-font fallback, and nothing is fetched at runtime. No Gotham is used, and nothing in the design claims Driveline affiliation.

## Hooks the CSS relies on

- **Status:** `.status[data-state=idle|running|paused]`. It also drives the countdown and progress colors through `.app:has(...)`.
- **Selection:** `.preset[aria-pressed=true]` and `.scope-option input:checked + span`.
- **Progress:** `#progress` width is set by JS, with a 0.25s linear transition.
- **Validation:** `#interval[aria-invalid=true]` gets a danger border, if JS sets it.

## Rendered QA after the Opus pass

The installed-extension screenshots exposed an overlap between the absolutely positioned interval-range hint and the presets. The hint now shares the actual legend row through a flex layout, preserving its ID and input description. The default, running, and paused states are checked at 380 × 600 in light and dark themes; the final screenshots are reviewed visually as well as through axe. Pending interval edits are also preserved when switching between idle tab/window targets.
