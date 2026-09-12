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
  speed, pitch, and volume. Saved per device. The same pop-out has
  **Export**/**Import** buttons to back up or restore everything below
  (see [Backup](#backup)).
- **Suggestions strip** — quick-tap words/phrases under the sentence bar.
  Starts with `Hi, Greetings, Yes, No, Help`. `Yes`, `No`, and `Help`
  (📌) always stay. The others are gradually replaced by whatever you
  actually speak most often, tracked locally on the device.
- **Mood toggles** — six ternary indicators (tap to cycle
  Off → 🔴 → 🟢), e.g. Hungry/Full, Thirsty/Hydrated, Sad/Happy,
  Mad/Joyful, Nervous/Excited, Hurt/Great. State is remembered per device.
- **Fast nav** — six category tiles (Emoji-Speak, Words, Sentences,
  Numbers, Needs, Things). Tapping one opens a shared **browse** pop-over:
  a search box that filters matching words/sentences across every
  category, a "⭐ Most used" row (the same usage data behind the
  suggestions strip), and tabs to jump between categories without
  closing and reopening. The goal is to reach almost anything in a
  couple of taps. Current items are a placeholder starting set meant to
  be built out further.

### Emoji-Speak

Most real AAC (speech-assist) apps license a picture symbol set (PCS,
SymbolStix, etc.), which costs money. **Emoji-Speak is a free way to
bootstrap the same idea using plain Unicode emoji as stand-ins for those
symbols.** It's the one category where every item *must* carry an icon
(an icon is optional on every other category's items — some of Needs and
Things already have one, most Words/Numbers/Sentences don't).

The vocabulary is aimed at an early/young communicator — roughly a
3-5-year-old level — and favors the icon's common *meaning* over its
literal picture: 👤 stands for "I", 🫵 for "you", ➡️ for "go" rather than
"right". It's grouped as pronouns, core requesting words (go, stop, want,
more, help, eat…), directions, basic feelings, and simple manners
(hi/bye/please/thank you/sorry/yes/no).

## Data & privacy

Everything (settings, mood state, usage stats for suggestions) stays in
the browser's `localStorage` on that one device. Nothing is sent
anywhere, there's no backend, and there's no account system.

## Backup

Since everything lives only in one browser's `localStorage`, clearing
site data (or switching devices) loses it. Open the ⚙️ settings pop-out
and use:

- **📤 Export settings** — downloads a `.json` file with your voice
  settings, mood states, and usage stats (the data behind the
  suggestions strip and the browse pop-over's "Most used" row).
- **📥 Import settings** — loads a previously exported file back in.
  This **overwrites** whatever is currently saved on the device, after
  a confirmation prompt.

## License

GPL-3.0-or-later — see [`LICENSE`](LICENSE). This is meant to be a
charitable, freely reusable codebase: fork it, adapt the vocabulary,
build on it.
