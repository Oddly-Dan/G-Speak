# G-Speak

A simple text-to-speech communication (AAC-style) app — HTML, CSS, and
vanilla JavaScript, no build step, no frameworks, no accounts. Speech
uses the browser's native Web Speech API; everything else lives in
`localStorage` on that one device. No backend, nothing ever sent
anywhere.

## Running it

Nothing to build or install. Open `index.html` directly, or serve the
folder with any static file server (e.g. `python3 -m http.server`).

Speech works best over `http(s)`/`file://` in Chrome, Edge, or Safari.
Available voices depend on the device and OS.

## Features

- **Sentence bar** — tap for the keyboard; **Enter** or **Speak!** reads
  it aloud and clears the bar.
- **Suggestions strip** — quick-tap words under the bar. `Yes`/`No`/
  `Help` are pinned by default; others are learned from what you
  actually speak. Press-and-hold any chip to pin/unpin it yourself.
- **Mood toggles** — six ternary indicators (Off → negative → positive).
  Optionally (Settings → Apply Mood Modifiers) active moods stackably
  shift speaking rate/pitch — table in `MOOD_MODIFIERS`, `js/app.js`.
- **Fast nav** — six category boards (Emoji-Speak, Words, Sentences,
  Numbers, Needs, Things), each opening a pop-over with search scoped to
  that category and a "Most used" row. Every board is **customizable**
  by press-and-hold: pin, remove, or add words/sentences/numbers;
  Settings → Reset All Boards restores the defaults. See `boardItems()`
  in `js/app.js` for the full model.
  - Emoji-Speak pairs emoji with a word each — a free stand-in for the
    licensed picture-symbol sets real AAC apps use — plus a much larger
    hidden vocabulary that's search-only until promoted onto the board.
- **Settings** (⚙️) — Appearance (Light/Dark/System), voice/speed/pitch/
  volume, **Speak on Press** (speaks a button's word/sentence aloud as
  it's tapped in — never for typing), Apply Mood Modifiers, Export/
  Import, Reset All Boards, and **Print My Emoji-Speak** (below).
- **Print My Emoji-Speak** (Settings → Print) — a printable page of every
  button currently on the Emoji-Speak board, in one of three card sizes,
  with a faint dot grid as cutting guides — a physical language-learning
  aid alongside the app. Uses the browser's native print dialog ("Save as
  PDF" for a PDF); no PDF library involved.
- **Help** (❓, top-left of the header actions) — a quick usage guide, the
  license, and a link to this repo.

## Theming

- **Light/Dark/System** — user-facing, Settings → Appearance.
- **Branding** — no UI; edit `js/theme.config.js` directly (title,
  header logo, palette). Commented with the full option list; composes
  with the Light/Dark/System toggle rather than fighting it.

## Privacy & security

Everything (settings, moods, usage stats, board customizations) stays
in `localStorage` on that device — nothing is synced or sent anywhere.
Export/Import (Settings) moves it between devices manually.

Board item text is rendered via `textContent`, never `innerHTML`, since
it can be arbitrary typed or imported text. Imports are type/shape-
validated and size-capped before anything is trusted
(`sanitize*Import()`, `js/app.js`) rather than merged in wholesale. A
restrictive Content-Security-Policy in `index.html` adds defense-in-
depth. `tests/security.spec.js` exercises all of this with real
exploit-shaped payloads.

## Testing

A Playwright suite in `tests/` covers the app's core behavior — dev-only
tooling, not needed to run the app:

```sh
npm install
npx playwright install chromium   # skip if Playwright already has one
npm test
```

## License

GPL-3.0-or-later — see [`LICENSE`](LICENSE). A charitable, freely
reusable codebase: fork it, re-skin it, adapt the vocabulary, build on
it.
