# G-Speak

A simple, minimal text-to-speech communication (AAC-style) app. No build
step, no frameworks, no accounts or logins — just HTML, CSS, and vanilla
JavaScript, using the browser's native Web Speech API for voice output and
`localStorage` for per-device settings.

## Running it

There's nothing to build or install. Either:

- Open `index.html` directly in a browser, or
- Serve the folder with any static file server, e.g. `npx serve .` or
  `python3 -m http.server`, and visit it in your browser.

Speech works best over `http(s)`/`file://` in Chrome, Edge, or Safari.
Available voices depend on the device and OS.

## What's here

- **Sentence bar** — large text box at the top. Tap it to bring up your
  device's on-screen keyboard. Hit **Enter** or the big green **Speak!**
  button to have it read aloud. The bar clears after speaking.
- **Voice settings** — behind the ⚙️ cog icon: pick a voice, and adjust
  speed, pitch, and volume. Saved per device.
- **Suggestions strip** — quick-tap words/phrases under the sentence bar.
  Starts with `Hi, Greetings, Yes, No, Help`. `Yes`, `No`, and `Help`
  (📌) always stay. The others are gradually replaced by whatever you
  actually speak most often, tracked locally on the device.
- **Mood toggles** — six ternary indicators (tap to cycle
  Off → 🔴 → 🟢), e.g. Hungry/Full, Thirsty/Hydrated, Sad/Happy,
  Mad/Joyful, Nervous/Excited, Hurt/Great. State is remembered per device.
- **Fast nav** — six category blocks (Emoji-Speak, Words, Sentences,
  Numbers, Needs, Things). Tapping one opens a pop-over of items that get
  added to the sentence bar. The current items are placeholders meant to
  be built out further.

## Data & privacy

Everything (settings, mood state, usage stats for suggestions) stays in
the browser's `localStorage` on that one device. Nothing is sent
anywhere, there's no backend, and there's no account system.
