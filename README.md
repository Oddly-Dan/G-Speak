# G-Speak

A simple text-to-speech communication (AAC-style) app. No build step, no
frameworks, no accounts or logins — just HTML, CSS, and vanilla
JavaScript, using the browser's native Web Speech API for voice output
and `localStorage` for per-device state. Nothing is ever sent anywhere;
there's no backend.

## Running it

Nothing to build or install for the app itself. Either:

- Open `index.html` directly in a browser, or
- Serve the folder with any static file server (e.g. `python3 -m
  http.server`) and visit it in your browser.

Speech works best over `http(s)`/`file://` in Chrome, Edge, or Safari.
Available voices depend on the device and OS.

## Features

- **Sentence bar** — tap it for your device's keyboard; **Enter** or the
  green **Speak!** button reads it aloud and clears the bar.
- **Suggestions strip** — quick-tap words under the sentence bar. `Yes`,
  `No`, `Help` (📌) are pinned by default; others are learned from what
  you actually speak. Press-and-hold any chip to pin/unpin it yourself.
- **Mood toggles** — six ternary indicators (Off → negative → positive →
  Off), e.g. Hungry/Full, Sad/Happy. Optionally (Settings → **Apply Mood
  Modifiers**, off by default) active moods subtly, and stackably, shift
  speaking rate/pitch — see the table in `js/app.js`'s `MOOD_MODIFIERS`.
- **Fast nav** — six category boards (Emoji-Speak, Words, Sentences,
  Numbers, Needs, Things). Tapping one opens a shared pop-over: a search
  box **scoped to that category only**, a "Most used" row, and tabs to
  switch categories without closing it.
  - **Emoji-Speak** pairs plain Unicode emoji with a word each, aimed at
    an early/young communicator (3-5yo) — a free alternative to the
    licensed picture-symbol sets real AAC apps normally use. Its curated
    grid is backed by a much larger hidden vocabulary (animals, food,
    nature, everyday objects...) that's search-only until promoted.
  - **Every board is customizable** by press-and-hold (~550ms, mouse or
    touch): pin/unpin, remove, or add typed words/sentences/numbers and
    promoted Emoji-Speak items. Settings → **Reset All Boards** restores
    the defaults without touching voice settings, moods, or usage
    history. See the doc comments above `boardItems()` in `js/app.js`
    for the full model.
- **Settings** (⚙️) — Appearance (Light/Dark/System), voice/speed/pitch/
  volume, **Speak on Press** (off by default: says a word/sentence/
  Emoji-Speak item aloud as you tap it into the sentence bar — never for
  typed letters), Apply Mood Modifiers, Export/Import (a `.json` backup
  of settings, moods, usage, and board customizations), Reset All
  Boards.

## Theming

Two independent layers:

- **Light/Dark/System**, user-facing, in Settings → Appearance. Applies
  instantly and persists per device.
- **Branding**, for whoever deploys the app — no UI, just edit
  **`js/theme.config.js`**: the title, header text, header logo/icon
  (emoji, inline SVG, or an image), and palette overrides (any CSS
  custom property from `css/style.css`'s `:root`, separately for light
  and dark). The file is commented with the full option list and
  composes correctly with the Light/Dark/System toggle — it isn't
  reachable from the UI itself.

## Security

Board item text is rendered via `createElement`/`textContent`, never
`innerHTML`, since it can include arbitrary user-typed or imported text
(see `makeItemChip()` in `js/app.js`). Imported backup files are
type/shape-validated and size-capped field-by-field before anything is
trusted (`sanitize*Import()` in `js/app.js`) rather than merged in
wholesale. `index.html` also carries a restrictive
Content-Security-Policy (`script-src 'self'`, no inline/eval) as
defense-in-depth against this class of bug generally. `tests/security.spec.js`
covers all of this with real exploit-shaped payloads.

## Testing

A Playwright suite in `tests/` covers the app's core behavior (speech,
mood modifiers, suggestions/moods, per-category search, boards,
backup, theming) — dev-only tooling, not needed to run the app:

```sh
npm install
npx playwright install chromium   # skip if Playwright already has one
npm test
```

## Data & privacy

Settings, mood state, usage stats, and board customizations all live in
`localStorage` on that one device — nothing is synced or sent anywhere.
Export/Import (Settings) moves them between devices manually.

## License

GPL-3.0-or-later — see [`LICENSE`](LICENSE). This is meant to be a
charitable, freely reusable codebase: fork it, re-skin it, adapt the
vocabulary, build on it.
