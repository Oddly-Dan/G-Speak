/* SPDX-License-Identifier: GPL-3.0-or-later
   ============================================================
   G-Speak — minimal text-to-speech communication app.
   Vanilla JS, no build step, no external libraries.
   Uses the browser's native Web Speech API + localStorage.
   ============================================================ */

(function () {
  "use strict";

  /* ---------------- Storage keys ---------------- */
  const LS_SETTINGS = "gspeak.settings";
  const LS_USAGE = "gspeak.usage";
  const LS_MOODS = "gspeak.moods";
  const LS_BOARDS = "gspeak.boards";

  /* ---------------- Config ---------------- */

  // Default pinned words for the home suggestion strip — the starting
  // point for boardState.home.pinned, which is what's actually shown
  // (press-and-hold a chip to pin/unpin; "Reset All Boards" restores this).
  const PINNED_WORDS = ["Yes", "No", "Help"];

  // Starter suggestions before any usage data exists.
  const STARTER_DYNAMIC = ["Hi", "Greetings"];

  const MAX_DYNAMIC_SUGGESTIONS = 8;

  // Ternary mood toggles: state 0 = off, 1 = negative, 2 = positive. The
  // "off" state shows the same icon as "negative" (just without the tint
  // or label change) so each pill has its own distinct resting icon
  // instead of a generic, indistinguishable 😐 for all six.
  const MOODS = [
    { id: "hunger", neg: "🍽️", pos: "😋", negLabel: "Hungry", posLabel: "Full" },
    { id: "thirst", neg: "🥵", pos: "💧", negLabel: "Thirsty", posLabel: "Hydrated" },
    { id: "sadness", neg: "😢", pos: "😊", negLabel: "Sad", posLabel: "Happy" },
    { id: "anger", neg: "😠", pos: "🤩", negLabel: "Mad", posLabel: "Joyful" },
    { id: "nerves", neg: "😰", pos: "🤗", negLabel: "Nervous", posLabel: "Excited" },
    { id: "pain", neg: "🤕", pos: "💪", negLabel: "Hurt", posLabel: "Great" },
  ];

  // Fast-nav categories and their default vocabulary — a starting set,
  // since every board is user-customizable at runtime (see boardItems()
  // and the press-and-hold handlers further down; "Reset All Boards" in
  // Settings restores exactly what's defined here).
  // mode "append" adds the item to whatever is already typed; "replace" sets
  // the whole sentence bar (used for complete sentences).
  const NAV_BLOCKS = [
    {
      // Real AAC symbol sets (PCS, SymbolStix, etc.) are licensed and cost
      // money — this is a free way to bootstrap the same idea with plain
      // Unicode emoji standing in for a symbol. Every item here MUST carry
      // an icon (unlike the other, word-only-friendly categories), and the
      // vocabulary itself is aimed at a young/early communicator: pronouns,
      // core requesting words, and basic feelings, roughly a 3-5 year old
      // level. Icons are chosen for their common *meaning* as a symbol
      // (➡️ = "go", 👤 = "I") rather than their literal picture.
      id: "emoji",
      label: "Emoji-Speak",
      icon: "😀",
      color: "#f4a300",
      mode: "append",
      items: [
        // Pronouns
        { emoji: "👤", word: "I" }, { emoji: "🫵", word: "you" },
        { emoji: "🙋", word: "we" },
        // Core requesting / interaction words
        { emoji: "➡️", word: "go" }, { emoji: "✋", word: "stop" },
        { emoji: "👉", word: "want" }, { emoji: "➕", word: "more" },
        { emoji: "✅", word: "done" }, { emoji: "🆘", word: "help" },
        { emoji: "👀", word: "look" }, { emoji: "🤲", word: "give me" },
        { emoji: "🍽️", word: "eat" }, { emoji: "🥤", word: "drink" },
        { emoji: "⚽", word: "play" }, { emoji: "🚪", word: "open" },
        { emoji: "🔒", word: "close" },
        // Directions
        { emoji: "⬆️", word: "up" }, { emoji: "⬇️", word: "down" },
        { emoji: "📥", word: "in" }, { emoji: "📤", word: "out" },
        // Feelings
        { emoji: "😀", word: "happy" }, { emoji: "😢", word: "sad" },
        { emoji: "😠", word: "mad" }, { emoji: "🤕", word: "hurt" },
        { emoji: "😨", word: "scared" }, { emoji: "😴", word: "tired" },
        // Social / manners
        { emoji: "👋", word: "hi" }, { emoji: "🚶", word: "bye" },
        { emoji: "🙏", word: "please" }, { emoji: "🙌", word: "thank you" },
        { emoji: "😔", word: "sorry" }, { emoji: "👍", word: "yes" },
        { emoji: "👎", word: "no" },
      ],
      // Not shown in the visible grid — the grid stays a small, curated
      // "3-5 year old" core vocabulary — but findable by search once
      // you're in Emoji-Speak. This is a much wider net of ordinary
      // Unicode emoji (animals, food, nature, everyday objects, people,
      // activities) that don't have an obvious "basic speech" corollary
      // of their own, given a plain word so they're still real vocabulary
      // rather than decoration. Deliberately limited to long-established,
      // single-codepoint emoji (roughly Unicode 9.0/2016 and earlier, a
      // few up to 11.0/2018) that render reliably everywhere — skipping
      // skin-tone variants, gender/profession combinations, family
      // groups, and flags, which are multi-codepoint sequences that
      // don't render consistently across every device and OS.
      hiddenItems: [
        // Animals
        { emoji: "🐶", word: "dog" }, { emoji: "🐱", word: "cat" },
        { emoji: "🐭", word: "mouse" }, { emoji: "🐹", word: "hamster" },
        { emoji: "🐰", word: "rabbit" }, { emoji: "🦊", word: "fox" },
        { emoji: "🐻", word: "bear" }, { emoji: "🐼", word: "panda" },
        { emoji: "🐨", word: "koala" }, { emoji: "🐯", word: "tiger" },
        { emoji: "🦁", word: "lion" }, { emoji: "🐮", word: "cow" },
        { emoji: "🐷", word: "pig" }, { emoji: "🐸", word: "frog" },
        { emoji: "🐵", word: "monkey" }, { emoji: "🐔", word: "chicken" },
        { emoji: "🐧", word: "penguin" }, { emoji: "🐦", word: "bird" },
        { emoji: "🦆", word: "duck" }, { emoji: "🦉", word: "owl" },
        { emoji: "🦇", word: "bat" }, { emoji: "🐺", word: "wolf" },
        { emoji: "🐴", word: "horse" }, { emoji: "🦄", word: "unicorn" },
        { emoji: "🐝", word: "bee" }, { emoji: "🦋", word: "butterfly" },
        { emoji: "🐌", word: "snail" }, { emoji: "🐞", word: "ladybug" },
        { emoji: "🐢", word: "turtle" }, { emoji: "🐍", word: "snake" },
        { emoji: "🐙", word: "octopus" }, { emoji: "🐠", word: "fish" },
        { emoji: "🐬", word: "dolphin" }, { emoji: "🐳", word: "whale" },
        { emoji: "🦈", word: "shark" }, { emoji: "🐘", word: "elephant" },
        { emoji: "🦓", word: "zebra" }, { emoji: "🦒", word: "giraffe" },
        { emoji: "🐪", word: "camel" }, { emoji: "🐑", word: "sheep" },
        { emoji: "🐐", word: "goat" }, { emoji: "🦌", word: "deer" },
        { emoji: "🐿️", word: "squirrel" }, { emoji: "🦘", word: "kangaroo" },
        // Food & drink
        { emoji: "🍎", word: "apple" }, { emoji: "🍌", word: "banana" },
        { emoji: "🍊", word: "orange" }, { emoji: "🍇", word: "grapes" },
        { emoji: "🍓", word: "strawberry" }, { emoji: "🍉", word: "watermelon" },
        { emoji: "🍒", word: "cherries" }, { emoji: "🍍", word: "pineapple" },
        { emoji: "🥕", word: "carrot" }, { emoji: "🌽", word: "corn" },
        { emoji: "🥔", word: "potato" }, { emoji: "🍅", word: "tomato" },
        { emoji: "🥦", word: "broccoli" }, { emoji: "🍞", word: "bread" },
        { emoji: "🧀", word: "cheese" }, { emoji: "🥚", word: "egg" },
        { emoji: "🍔", word: "burger" }, { emoji: "🍕", word: "pizza" },
        { emoji: "🌭", word: "hotdog" }, { emoji: "🥪", word: "sandwich" },
        { emoji: "🌮", word: "taco" }, { emoji: "🍝", word: "pasta" },
        { emoji: "🍣", word: "sushi" }, { emoji: "🍦", word: "ice cream" },
        { emoji: "🍩", word: "donut" }, { emoji: "🍪", word: "cookie" },
        { emoji: "🎂", word: "cake" }, { emoji: "🍫", word: "chocolate" },
        { emoji: "🍬", word: "candy" }, { emoji: "🥛", word: "milk" },
        { emoji: "☕", word: "coffee" }, { emoji: "🍵", word: "tea" },
        { emoji: "🧃", word: "juice" },
        // Nature & weather
        { emoji: "☀️", word: "sun" }, { emoji: "🌙", word: "moon" },
        { emoji: "⭐", word: "star" }, { emoji: "☁️", word: "cloud" },
        { emoji: "🌧️", word: "rain" }, { emoji: "❄️", word: "snow" },
        { emoji: "⚡", word: "lightning" }, { emoji: "🌈", word: "rainbow" },
        { emoji: "🔥", word: "fire" }, { emoji: "💧", word: "water" },
        { emoji: "🌳", word: "tree" }, { emoji: "🌸", word: "flower" },
        { emoji: "⛰️", word: "mountain" }, { emoji: "🏖️", word: "beach" },
        // Vehicles & places
        { emoji: "🚗", word: "car" }, { emoji: "🚌", word: "bus" },
        { emoji: "🚲", word: "bicycle" }, { emoji: "✈️", word: "airplane" },
        { emoji: "🚂", word: "train" }, { emoji: "⛵", word: "boat" },
        { emoji: "🏠", word: "house" }, { emoji: "🏫", word: "school" },
        { emoji: "🏥", word: "hospital" },
        // Everyday objects & toys
        { emoji: "🏀", word: "ball" }, { emoji: "🧸", word: "teddy bear" },
        { emoji: "🎈", word: "balloon" }, { emoji: "🎁", word: "gift" },
        { emoji: "📚", word: "book" }, { emoji: "🖍️", word: "crayon" },
        { emoji: "✏️", word: "pencil" }, { emoji: "🎨", word: "paint" },
        { emoji: "🎵", word: "music" }, { emoji: "📱", word: "phone" },
        { emoji: "🔑", word: "key" }, { emoji: "🎩", word: "hat" },
        { emoji: "🧦", word: "socks" }, { emoji: "👟", word: "shoe" },
        { emoji: "⏰", word: "clock" },
        // Body
        { emoji: "👁️", word: "eye" }, { emoji: "👂", word: "ear" },
        { emoji: "👃", word: "nose" }, { emoji: "👄", word: "mouth" },
        { emoji: "🦷", word: "tooth" }, { emoji: "🖐️", word: "hand" },
        { emoji: "🦶", word: "foot" }, { emoji: "💪", word: "strong" },
        // People & family
        { emoji: "👶", word: "baby" }, { emoji: "👧", word: "girl" },
        { emoji: "👦", word: "boy" }, { emoji: "👩", word: "mom" },
        { emoji: "👨", word: "dad" }, { emoji: "👵", word: "grandma" },
        { emoji: "👴", word: "grandpa" }, { emoji: "👪", word: "family" },
        { emoji: "👫", word: "friend" },
        // Activities
        { emoji: "⚾", word: "baseball" }, { emoji: "🏈", word: "football" },
        { emoji: "🏊", word: "swim" }, { emoji: "🎸", word: "guitar" },
        { emoji: "🎹", word: "piano" }, { emoji: "🥁", word: "drum" },
        { emoji: "🧩", word: "puzzle" }, { emoji: "🎮", word: "game" },
        { emoji: "🛌", word: "sleep" }, { emoji: "🛁", word: "bath" },
        { emoji: "🧼", word: "soap" },
      ],
    },
    {
      id: "words",
      label: "Words",
      icon: "🔤",
      color: "#06a77d",
      mode: "append",
      items: [
        "I", "you", "want", "need", "like", "more", "less", "stop", "go",
        "help", "please", "thank you", "sorry", "good", "bad", "big",
        "little", "hot", "cold", "up", "down", "in", "out", "again",
        "all done", "look", "come", "wait", "this", "that",
      ],
    },
    {
      id: "sentences",
      label: "Sentences",
      icon: "💬",
      color: "#1f7ac9",
      mode: "replace",
      items: [
        "I want more, please.", "I need help.", "I don't feel well.",
        "Can I have a break?", "I love you.", "I'm all done.",
        "Can you help me?", "I want to go home.", "That hurts.",
        "I'm happy.", "I need some space, please.", "Thank you very much.",
      ],
    },
    {
      id: "numbers",
      label: "Numbers",
      icon: "🔢",
      color: "#e0446e",
      mode: "append",
      items: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    },
    {
      id: "needs",
      label: "Needs",
      icon: "🆘",
      color: "#8338ec",
      mode: "append",
      items: [
        { emoji: "🚻", word: "bathroom" }, { emoji: "💧", word: "water" },
        { emoji: "🍎", word: "food" }, { emoji: "💊", word: "medicine" },
        { emoji: "😴", word: "rest" }, { emoji: "🤫", word: "quiet" },
        { emoji: "🤗", word: "a hug" }, { emoji: "🧍", word: "space" },
        { emoji: "🧸", word: "my comfort item" }, { emoji: "⏸️", word: "a break" },
      ],
    },
    {
      id: "things",
      label: "Things",
      icon: "🧸",
      color: "#fb8500",
      mode: "append",
      items: [
        { emoji: "🧸", word: "my toy" }, { emoji: "📖", word: "my book" },
        { emoji: "📱", word: "the tablet" }, { emoji: "🧣", word: "my blanket" },
        { emoji: "🍪", word: "a snack" }, { emoji: "👟", word: "my shoes" },
        { emoji: "📺", word: "the TV" }, { emoji: "🎵", word: "music" },
        { emoji: "🌳", word: "outside" }, { emoji: "⚽", word: "the ball" },
      ],
    },
  ];

  // Multiplies onto rate/pitch when "Apply Mood Modifiers" is on, keyed by
  // mood id and state (1 = negative, 2 = positive). Missing rate/pitch
  // means that axis doesn't touch that parameter. Active moods stack
  // (multiply together), per axis.
  const MOOD_MODIFIERS = {
    hunger: { neg: { rate: 0.95 }, pos: { rate: 1.05 } },
    thirst: { neg: { rate: 0.95 }, pos: { rate: 1.05 } },
    sadness: { neg: { rate: 0.95, pitch: 0.95 }, pos: { rate: 1.05, pitch: 1.05 } },
    anger: { neg: { pitch: 0.9 }, pos: { pitch: 1.1 } },
    nerves: { neg: { pitch: 1.1, rate: 0.9 }, pos: { pitch: 1.1, rate: 1.1 } },
    pain: { neg: { pitch: 0.9 }, pos: { pitch: 1.1, rate: 1.1 } },
  };

  /* ---------------- Storage helpers ---------------- */

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage full or unavailable — fail silently, app still works */
    }
  }

  /* ---------------- Settings (voice, rate, pitch, volume) ---------------- */

  const settings = Object.assign(
    {
      rate: 1,
      pitch: 1,
      volume: 1,
      voiceURI: "",
      applyMoodModifiers: false,
      speakOnPress: false,
      theme: "system",
      printCardSize: "medium",
    },
    loadJSON(LS_SETTINGS, {})
  );

  function saveSettings() {
    saveJSON(LS_SETTINGS, settings);
  }

  // "system" removes the attribute entirely so the CSS
  // @media(prefers-color-scheme) rule decides; "light"/"dark" force it via
  // the :root[data-theme=...] rule, which wins either way. See style.css.
  function applyTheme() {
    if (settings.theme === "light" || settings.theme === "dark") {
      document.documentElement.setAttribute("data-theme", settings.theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  /* ---------------- Usage tracking (for suggestions) ---------------- */

  const usage = loadJSON(LS_USAGE, {}); // { "lowercase text": { count, display } }

  function recordUsage(text) {
    const key = text.trim().toLowerCase();
    if (!key) return;
    const pinned = getHomeBoardState().pinned;
    if (pinned.some((w) => w.toLowerCase() === key)) return; // already pinned
    const entry = usage[key] || { count: 0, display: text.trim() };
    entry.count += 1;
    entry.display = text.trim(); // keep most recent casing
    usage[key] = entry;
    saveJSON(LS_USAGE, usage);
  }

  function topUsageEntries(limit, excludeSet) {
    return Object.values(usage)
      .filter((e) => !excludeSet || !excludeSet.has(e.display.toLowerCase()))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((e) => e.display);
  }

  /* ---------------- Moods ---------------- */

  const moodState = Object.assign({}, loadJSON(LS_MOODS, {}));
  MOODS.forEach((m) => {
    if (typeof moodState[m.id] !== "number") moodState[m.id] = 0;
  });

  function saveMoods() {
    saveJSON(LS_MOODS, moodState);
  }

  /* ---------------- Boards (customizable vocabulary) ----------------
     Press-and-hold lets you pin/unpin, remove, and add items — this is
     the persisted state layered on top of each NAV_BLOCK's hardcoded
     items/hiddenItems. Keyed by block id ("emoji", "words", ...) plus a
     "home" entry for the suggestion strip's pinned words. Per-block
     shape: { removed: [key,...], added: [item,...], pinned: [key,...] }.
     "key" is always the lowercased word/text — the same thing itemLabel()
     returns — since every item already has a unique one of those. */
  const boardState = loadJSON(LS_BOARDS, {});

  function saveBoards() {
    saveJSON(LS_BOARDS, boardState);
  }

  function getBoardState(blockId) {
    if (!boardState[blockId]) {
      boardState[blockId] = { removed: [], added: [], pinned: [] };
    }
    const s = boardState[blockId];
    if (!Array.isArray(s.removed)) s.removed = [];
    if (!Array.isArray(s.added)) s.added = [];
    if (!Array.isArray(s.pinned)) s.pinned = [];
    return s;
  }

  function getHomeBoardState() {
    if (!boardState.home || !Array.isArray(boardState.home.pinned)) {
      boardState.home = { pinned: PINNED_WORDS.slice() };
    }
    return boardState.home;
  }

  // De-dupes a combined item list by label (case-insensitive), keeping
  // the first occurrence — used wherever default + hidden + added items
  // might overlap (e.g. a hidden Emoji-Speak item promoted onto the board).
  function dedupeItems(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = itemLabel(item).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // The actual, current contents of a category's board: its default
  // items minus anything removed, plus anything added, with pinned items
  // moved to the front (in the order they were pinned).
  function boardItems(block) {
    const state = getBoardState(block.id);
    const removedSet = new Set(state.removed);
    const base = block.items.filter((item) => !removedSet.has(itemLabel(item).toLowerCase()));
    const all = dedupeItems(base.concat(state.added));
    const pinnedSet = new Set(state.pinned);
    const pinnedItems = state.pinned
      .map((key) => all.find((item) => itemLabel(item).toLowerCase() === key))
      .filter(Boolean);
    const unpinnedItems = all.filter((item) => !pinnedSet.has(itemLabel(item).toLowerCase()));
    return pinnedItems.concat(unpinnedItems);
  }

  // Adds a brand-new item (typed text, or a promoted hidden Emoji-Speak
  // item) to a board, unless it's already actually on that board. Checked
  // against the current board (not the raw defaults/hidden lists), so a
  // hidden item can be promoted and a previously-removed default can be
  // re-added — neither is "already there" once you account for that state.
  function addItemToBoard(block, item) {
    const state = getBoardState(block.id);
    const key = itemLabel(item).toLowerCase();
    const already = boardItems(block).some((i) => itemLabel(i).toLowerCase() === key);
    if (already) {
      showToast(`Already in ${block.label}`);
      return;
    }
    state.added.push(item);
    // A freshly-removed default with the same key would otherwise mask it.
    state.removed = state.removed.filter((k) => k !== key);
    saveBoards();
    showToast(`Added to ${block.label}!`);
    if (navState.activeBlockId === block.id) {
      renderNavFrequentRow();
      renderNavGrid();
    }
  }

  // Removes an item from a board — a default item is hidden via
  // `removed`, a user-added one is just dropped from `added`.
  function removeFromBoard(block, item) {
    const state = getBoardState(block.id);
    const key = itemLabel(item).toLowerCase();
    const isDefault = block.items.some((i) => itemLabel(i).toLowerCase() === key);
    if (isDefault) {
      if (!state.removed.includes(key)) state.removed.push(key);
    } else {
      state.added = state.added.filter((i) => itemLabel(i).toLowerCase() !== key);
    }
    state.pinned = state.pinned.filter((k) => k !== key);
    saveBoards();
    showToast(`Removed from ${block.label}`);
    renderNavGrid();
  }

  // Pinning moves an item to the end of the pinned group — i.e. the
  // top-most/left-most spot that was, until now, unpinned.
  function toggleBoardPin(block, key) {
    const state = getBoardState(block.id);
    const idx = state.pinned.indexOf(key);
    if (idx >= 0) {
      state.pinned.splice(idx, 1);
      showToast("Pin removed");
    } else {
      state.pinned.push(key);
      showToast("Pinned to board!");
    }
    saveBoards();
    renderNavGrid();
  }

  /* ---------------- DOM refs ---------------- */

  const sentenceArea = document.getElementById("sentence-area");
  const sentenceBar = document.getElementById("sentence-bar");
  const speakBtn = document.getElementById("speak-btn");
  const clearBtn = document.getElementById("clear-btn");
  const keyboardBtn = document.getElementById("keyboard-btn");
  const helpBtn = document.getElementById("help-btn");
  const helpBackdrop = document.getElementById("help-backdrop");
  const suggestionsRow = document.getElementById("suggestions-row");
  const moodRow = document.getElementById("mood-row");
  const fastnav = document.getElementById("fastnav");

  const settingsBtn = document.getElementById("settings-btn");
  const settingsBackdrop = document.getElementById("settings-backdrop");
  const themeSelect = document.getElementById("theme-select");
  const voiceSelect = document.getElementById("voice-select");
  const rateRange = document.getElementById("rate-range");
  const pitchRange = document.getElementById("pitch-range");
  const volumeRange = document.getElementById("volume-range");
  const rateOutput = document.getElementById("rate-output");
  const pitchOutput = document.getElementById("pitch-output");
  const volumeOutput = document.getElementById("volume-output");
  const moodModifiersToggle = document.getElementById("mood-modifiers-toggle");
  const speakOnPressToggle = document.getElementById("speak-on-press-toggle");
  const testVoiceBtn = document.getElementById("test-voice-btn");
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const importFileInput = document.getElementById("import-file-input");
  const resetBoardsBtn = document.getElementById("reset-boards-btn");
  const printSizeSelect = document.getElementById("print-size-select");
  const printEmojiBtn = document.getElementById("print-emoji-btn");
  const printSheetEl = document.getElementById("print-sheet");

  const navBackdrop = document.getElementById("nav-backdrop");
  const navSearch = document.getElementById("nav-search");
  const navFrequentRow = document.getElementById("nav-frequent-row");
  const navCategoryTabs = document.getElementById("nav-category-tabs");
  const navPopoutGrid = document.getElementById("nav-popout-grid");

  // Which category tab is selected, and the current search text (lowercased).
  const navState = { activeBlockId: NAV_BLOCKS[0].id, query: "" };

  /* ---------------- Speech ---------------- */

  const synth = window.speechSynthesis;
  let voices = [];

  function refreshVoices() {
    voices = synth ? synth.getVoices() : [];
    if (!voiceSelect) return;
    voiceSelect.innerHTML = "";
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "System default";
    voiceSelect.appendChild(defaultOpt);
    voices.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      voiceSelect.appendChild(opt);
    });
    voiceSelect.value = settings.voiceURI || "";
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // Combined rate/pitch multiplier from every currently-active mood, only
  // when "Apply Mood Modifiers" is on. Multiple active moods stack.
  function moodMultipliers() {
    let rate = 1;
    let pitch = 1;
    if (!settings.applyMoodModifiers) return { rate, pitch };
    MOODS.forEach((m) => {
      const state = moodState[m.id];
      if (!state) return; // 0 = off, no modifier
      const mod = MOOD_MODIFIERS[m.id] && MOOD_MODIFIERS[m.id][state === 1 ? "neg" : "pos"];
      if (!mod) return;
      if (mod.rate) rate *= mod.rate;
      if (mod.pitch) pitch *= mod.pitch;
    });
    return { rate, pitch };
  }

  function speak(text) {
    if (!text.trim()) return;
    if (!synth) {
      alert("Sorry, this browser doesn't support text-to-speech.");
      return;
    }
    synth.cancel(); // don't queue on top of a previous utterance
    const utter = new SpeechSynthesisUtterance(text);
    const chosenVoice = voices.find((v) => v.voiceURI === settings.voiceURI);
    if (chosenVoice) utter.voice = chosenVoice;
    const mood = moodMultipliers();
    utter.rate = clamp(settings.rate * mood.rate, 0.3, 3);
    utter.pitch = clamp(settings.pitch * mood.pitch, 0, 2);
    utter.volume = settings.volume;
    synth.speak(utter);
  }

  /* ---------------- Suggestions rendering ---------------- */

  function renderSuggestions() {
    const pinnedWords = getHomeBoardState().pinned;
    const pinnedSet = new Set(pinnedWords.map((w) => w.toLowerCase()));
    const usedCount = Object.keys(usage).length;
    const dynamicSlots = Math.min(
      MAX_DYNAMIC_SUGGESTIONS,
      Math.max(STARTER_DYNAMIC.length, usedCount)
    );

    const top = topUsageEntries(dynamicSlots, pinnedSet);
    const dynamic = top.slice();
    STARTER_DYNAMIC.forEach((w) => {
      if (
        dynamic.length < dynamicSlots &&
        !pinnedSet.has(w.toLowerCase()) &&
        !dynamic.some((d) => d.toLowerCase() === w.toLowerCase())
      ) {
        dynamic.push(w);
      }
    });

    suggestionsRow.innerHTML = "";

    // Pinned words sit at the start of the row; the dynamic/learned
    // suggestions follow after them.
    pinnedWords.forEach((text) => {
      suggestionsRow.appendChild(makeChip(text, true));
    });
    dynamic.slice(0, dynamicSlots).forEach((text) => {
      suggestionsRow.appendChild(makeChip(text, false));
    });
  }

  // Press-and-hold a chip to pin it to the home suggestion strip (or
  // unpin it, if it's already pinned there) — this is separate from a
  // category board's own pinning, which only affects that one board.
  function makeChip(text, pinned) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (pinned ? " pinned" : "");
    btn.textContent = (pinned ? "📌 " : "") + text;
    makeInteractive(btn, {
      onClick: () => appendToSentence(text),
      onLongPress: () => {
        const homeState = getHomeBoardState();
        const key = text.toLowerCase();
        const isPinned = homeState.pinned.some((w) => w.toLowerCase() === key);
        showContextMenu([
          {
            label: isPinned ? "📌 Unpin" : "📌 Pin",
            onClick: () => {
              if (isPinned) {
                homeState.pinned = homeState.pinned.filter((w) => w.toLowerCase() !== key);
                showToast("Unpinned");
              } else {
                homeState.pinned.push(text);
                showToast("Pinned!");
              }
              saveBoards();
              renderSuggestions();
            },
          },
        ]);
      },
    });
    return btn;
  }

  // Note: deliberately does NOT focus the sentence bar. Focusing a text
  // input pops the on-screen keyboard on phones/tablets, which is exactly
  // what we don't want when someone is just tapping through Emoji-Speak,
  // Words, etc. — the keyboard should only appear from an explicit tap
  // directly on the sentence bar itself.
  function appendToSentence(text) {
    const current = sentenceBar.value.trim();
    sentenceBar.value = current ? current + " " + text : text;
    // "Speak on Press": says the word/phrase aloud as it's added. Only
    // ever reached from a button tap (chips, board items) — never from
    // typing, since typed characters go straight into the input natively
    // and never pass through this function.
    if (settings.speakOnPress) speak(text);
  }

  /* ---------------- Press-and-hold ---------------- */

  const LONG_PRESS_MS = 550;
  const LONG_PRESS_MOVE_TOLERANCE = 10;

  // Wires up an element so a normal tap runs onClick and a sustained
  // press (mouse or touch, ~550ms, without much movement) runs
  // onLongPress instead — never both for the same press.
  function makeInteractive(el, { onClick, onLongPress }) {
    let timer = null;
    let longPressed = false;
    let startX = 0;
    let startY = 0;

    el.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return; // left-click only
      longPressed = false;
      startX = e.clientX;
      startY = e.clientY;
      clearTimeout(timer);
      timer = setTimeout(() => {
        longPressed = true;
        onLongPress();
      }, LONG_PRESS_MS);
    });
    el.addEventListener("pointermove", (e) => {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > LONG_PRESS_MOVE_TOLERANCE) {
        clearTimeout(timer);
      }
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) =>
      el.addEventListener(ev, () => clearTimeout(timer))
    );
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("click", () => {
      if (longPressed) {
        longPressed = false; // long-press already handled it; swallow this click
        return;
      }
      if (onClick) onClick();
    });
  }

  // Same long-press detection, but for an element (like the sentence bar)
  // whose normal click/tap behavior should be left completely alone.
  function makeLongPressOnly(el, onLongPress) {
    makeInteractive(el, { onClick: null, onLongPress });
  }

  const contextBackdrop = document.getElementById("context-backdrop");
  const contextMenu = document.getElementById("context-menu");
  let focusBeforeContextMenu = null;

  // actions: [{ label, onClick, danger? }]. Always adds a Cancel entry.
  function showContextMenu(actions) {
    contextMenu.innerHTML = "";
    actions.forEach((action) => {
      const btn = document.createElement("button");
      btn.type = "button";
      if (action.danger) btn.className = "danger";
      btn.textContent = action.label;
      btn.addEventListener("click", () => {
        closeContextMenu();
        action.onClick();
      });
      contextMenu.appendChild(btn);
    });
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "cancel";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", closeContextMenu);
    contextMenu.appendChild(cancelBtn);
    contextBackdrop.hidden = false;
    focusBeforeContextMenu = document.activeElement;
    contextMenu.querySelector("button").focus();
  }

  function closeContextMenu() {
    contextBackdrop.hidden = true;
    if (focusBeforeContextMenu && document.body.contains(focusBeforeContextMenu)) {
      focusBeforeContextMenu.focus();
    }
    focusBeforeContextMenu = null;
  }

  contextBackdrop.addEventListener("click", (e) => {
    if (e.target === contextBackdrop) closeContextMenu();
  });

  const toastEl = document.getElementById("toast");
  let toastTimer = null;

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    // Reflow so the transition re-triggers on rapid repeated calls.
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
      setTimeout(() => {
        toastEl.hidden = true;
      }, 200);
    }, 1600);
  }

  // What kind of board a typed sentence-bar value belongs on.
  function classifySentenceContent(text) {
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (/^[0-9+\-*/=.,()\s]+$/.test(trimmed)) return "numbers"; // number or formula
    if (/\s/.test(trimmed)) return "sentences"; // more than one word
    return "words"; // a single typed word
  }

  /* ---------------- Moods rendering ---------------- */

  function renderMoods() {
    moodRow.innerHTML = "";
    MOODS.forEach((m) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mood-toggle";
      btn.dataset.mood = m.id;
      updateMoodButton(btn, m);
      btn.addEventListener("click", () => {
        moodState[m.id] = (moodState[m.id] + 1) % 3;
        saveMoods();
        updateMoodButton(btn, m);
      });
      moodRow.appendChild(btn);
    });
  }

  function updateMoodButton(btn, m) {
    const state = moodState[m.id];
    btn.dataset.state = String(state);
    if (state === 0) {
      btn.textContent = `${m.neg} Off`;
    } else if (state === 1) {
      btn.textContent = `${m.neg} ${m.negLabel}`;
    } else {
      btn.textContent = `${m.pos} ${m.posLabel}`;
    }
  }

  /* ---------------- Fast nav rendering ---------------- */

  function renderFastNav() {
    fastnav.innerHTML = "";
    NAV_BLOCKS.forEach((block) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-block";
      btn.style.background = block.color;
      btn.innerHTML = `<span class="nav-emoji">${block.icon}</span><span>${block.label}</span>`;
      btn.addEventListener("click", () => openNavPopover(block));
      fastnav.appendChild(btn);
    });
  }

  function itemLabel(item) {
    return typeof item === "object" ? item.word : item;
  }

  // isOnBoard: false means this chip is a hidden-vocabulary search hit
  // that isn't actually on the board yet (see Emoji-Speak's hiddenItems) —
  // its press-and-hold menu offers "Add to <board>" instead of the normal
  // Remove/Pin options for an item that's already there.
  function makeItemChip(item, block, isOnBoard) {
    const isObj = typeof item === "object";
    const label = itemLabel(item);
    const key = label.toLowerCase();
    const state = getBoardState(block.id);
    const pinned = isOnBoard && state.pinned.includes(key);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "item-chip" + (pinned ? " is-pinned" : "");
    // Built with createElement/textContent rather than innerHTML: item.word
    // (and plain-string items) can be arbitrary text a user typed and
    // added to a board, or restored from an imported backup file — never
    // trust it as markup.
    if (isObj) {
      const emojiSpan = document.createElement("span");
      emojiSpan.className = "item-emoji";
      emojiSpan.textContent = item.emoji;
      const wordSpan = document.createElement("span");
      wordSpan.textContent = item.word;
      btn.append(emojiSpan, wordSpan);
    } else {
      const span = document.createElement("span");
      span.textContent = item;
      btn.appendChild(span);
    }
    makeInteractive(btn, {
      onClick: () => {
        if (block.mode === "replace") {
          sentenceBar.value = label;
          closePopover(navBackdrop);
          if (settings.speakOnPress) speak(label);
        } else {
          appendToSentence(label);
        }
      },
      onLongPress: () => {
        if (!isOnBoard) {
          showContextMenu([
            { label: `➕ Add to ${block.label}`, onClick: () => addItemToBoard(block, item) },
          ]);
          return;
        }
        showContextMenu([
          {
            label: pinned ? "📌 Remove Pin" : "📌 Pin to Board",
            onClick: () => toggleBoardPin(block, key),
          },
          { label: "🗑️ Remove", danger: true, onClick: () => removeFromBoard(block, item) },
        ]);
      },
    });
    return btn;
  }

  function activeBlock() {
    return NAV_BLOCKS.find((b) => b.id === navState.activeBlockId) || NAV_BLOCKS[0];
  }

  // Opens the shared browse pop-over, pre-selecting one category's tab.
  function openNavPopover(block) {
    navState.activeBlockId = block.id;
    navState.query = "";
    navSearch.value = "";
    updateNavSearchPlaceholder();
    renderNavCategoryTabs();
    renderNavFrequentRow();
    renderNavGrid();
    openPopover(navBackdrop);
  }

  // Search is scoped to whichever category tab is active — searching
  // "within Sentences" only ever matches Sentences, never Words or
  // Numbers — so the placeholder says so and switching tabs clears it.
  function updateNavSearchPlaceholder() {
    navSearch.placeholder = `Search ${activeBlock().label}…`;
  }

  function renderNavCategoryTabs() {
    navCategoryTabs.innerHTML = "";
    NAV_BLOCKS.forEach((block) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-tab" + (block.id === navState.activeBlockId ? " active" : "");
      btn.style.background = block.color;
      btn.innerHTML = `<span>${block.icon}</span><span>${block.label}</span>`;
      btn.addEventListener("click", () => {
        navState.activeBlockId = block.id;
        navState.query = "";
        navSearch.value = "";
        updateNavSearchPlaceholder();
        renderNavCategoryTabs();
        renderNavFrequentRow();
        renderNavGrid();
      });
      navCategoryTabs.appendChild(btn);
    });
  }

  // "Most used" here is scoped to the active category: only usage entries
  // whose text matches one of that category's own items (its current
  // board contents, plus its hidden, search-only ones) count, so this row
  // is specific to what you're currently browsing rather than a repeat of
  // the home screen's global suggestions.
  function renderNavFrequentRow() {
    navFrequentRow.innerHTML = "";
    const block = activeBlock();
    const categoryLabels = new Set(
      boardItems(block).concat(block.hiddenItems || []).map((item) => itemLabel(item).toLowerCase())
    );
    const top = Object.values(usage)
      .filter((entry) => categoryLabels.has(entry.display.toLowerCase()))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((e) => e.display);

    if (!top.length) {
      const hint = document.createElement("p");
      hint.className = "nav-empty-hint";
      hint.textContent = "Words you speak often will show up here.";
      navFrequentRow.appendChild(hint);
      return;
    }
    top.forEach((text) => navFrequentRow.appendChild(makeChip(text, false)));
  }

  // Shows the active category's board, or — while searching — whichever
  // of that SAME category's items (board plus its hidden, search-only
  // ones) match the query. Never reaches into other categories.
  function renderNavGrid() {
    navPopoutGrid.innerHTML = "";
    const block = activeBlock();
    const board = boardItems(block);
    let items;
    if (navState.query) {
      const pool = dedupeItems(board.concat(block.hiddenItems || []));
      items = pool.filter((item) => itemLabel(item).toLowerCase().includes(navState.query));
    } else {
      items = board;
    }
    const boardKeys = new Set(board.map((item) => itemLabel(item).toLowerCase()));
    items.forEach((item) => {
      const isOnBoard = boardKeys.has(itemLabel(item).toLowerCase());
      navPopoutGrid.appendChild(makeItemChip(item, block, isOnBoard));
    });
    applyAdaptiveColumns(navPopoutGrid, items);
  }

  // A plain fixed-width auto-fill grid can't tell "Words" (short items —
  // fits 3+ per row) apart from "Sentences" (long ones — fits 1-2): the
  // CSS auto-repeat count can't be computed from intrinsic content sizing
  // like max-content. So instead we measure this set's own labels with a
  // canvas (using the item-chip's real, already-rendered font) and pick
  // however many columns of that width actually fit the popover.
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");

  function applyAdaptiveColumns(grid, items) {
    if (!items.length) return;
    const sample = grid.querySelector(".item-chip");
    const font = sample
      ? getComputedStyle(sample).font
      : '700 12.75px -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    measureCtx.font = font;

    const chipChrome = 22; // item-chip's own horizontal padding + border
    const gap = 8;
    let maxChipWidth = 60;
    items.forEach((item) => {
      const isObj = typeof item === "object";
      const textWidth = measureCtx.measureText(itemLabel(item)).width;
      // Emoji sits on its own line above the text (flex-direction: column),
      // so it only matters when it's wider than the text itself.
      const width = Math.max(textWidth, isObj ? 22 : 0) + chipChrome;
      if (width > maxChipWidth) maxChipWidth = width;
    });

    // 900 matches .popout's own max-width (see style.css) — kept in sync
    // manually since this is the one place JS needs that number.
    const containerWidth = grid.clientWidth || Math.min(window.innerWidth, 900) - 28;
    const colsThatFit = Math.floor((containerWidth + gap) / (maxChipWidth + gap));
    // Cap at the item count too — no point spreading 11 numbers across 14
    // computed columns and leaving a mostly-empty trailing track.
    const cols = Math.max(1, Math.min(colsThatFit, items.length, 10));
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  }

  navSearch.addEventListener("input", () => {
    navState.query = navSearch.value.trim().toLowerCase();
    renderNavGrid();
  });

  /* ---------------- Popover helpers ---------------- */

  // Popovers never cover the sentence bar: each backdrop's own box is
  // shrunk to start just below it, rather than the usual full-screen
  // inset. That leaves the sentence bar visible AND tappable (Speak,
  // Clear, the bar itself) while a popover is open, since the backdrop
  // simply doesn't occupy that strip of the screen anymore.
  function repositionBackdrop(backdrop) {
    const rect = sentenceArea.getBoundingClientRect();
    backdrop.style.top = `${Math.max(0, Math.round(rect.bottom) + 4)}px`;
  }

  // Tracks, per backdrop, whatever had focus right before it opened, so
  // closing it (via ✕, Escape, or tapping outside) can put focus back
  // there instead of leaving keyboard/screen-reader users stranded.
  const focusBeforePopover = new Map();
  const MANAGED_BACKDROPS = { settings: settingsBackdrop, nav: navBackdrop, help: helpBackdrop };

  function openPopover(backdrop) {
    repositionBackdrop(backdrop);
    backdrop.hidden = false;
    focusBeforePopover.set(backdrop, document.activeElement);
    // Move focus into the dialog (its close button) rather than leaving
    // it wherever it was on the page behind the now-open popover.
    const closeBtn = backdrop.querySelector("[data-close]");
    if (closeBtn) closeBtn.focus();
  }

  function closePopover(backdrop) {
    backdrop.hidden = true;
    const previous = focusBeforePopover.get(backdrop);
    if (previous && document.body.contains(previous)) previous.focus();
    focusBeforePopover.delete(backdrop);
  }

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closePopover(MANAGED_BACKDROPS[btn.dataset.close]));
  });

  Object.values(MANAGED_BACKDROPS).forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closePopover(backdrop);
    });
  });

  // Escape closes whatever's topmost: the press-and-hold menu first (it
  // can open on top of a popover), otherwise whichever popover is open.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!contextBackdrop.hidden) {
      closeContextMenu();
      return;
    }
    const open = Object.values(MANAGED_BACKDROPS).find((b) => !b.hidden);
    if (open) closePopover(open);
  });

  window.addEventListener("resize", () => {
    Object.values(MANAGED_BACKDROPS).forEach((backdrop) => {
      if (!backdrop.hidden) repositionBackdrop(backdrop);
    });
    if (!navBackdrop.hidden) renderNavGrid();
  });

  /* ---------------- Settings popover wiring ---------------- */

  function applySettingsToControls() {
    themeSelect.value = settings.theme;
    rateRange.value = settings.rate;
    pitchRange.value = settings.pitch;
    volumeRange.value = settings.volume;
    rateOutput.textContent = `${Number(settings.rate).toFixed(2)}×`;
    pitchOutput.textContent = Number(settings.pitch).toFixed(2);
    volumeOutput.textContent = `${Math.round(settings.volume * 100)}%`;
    moodModifiersToggle.checked = !!settings.applyMoodModifiers;
    speakOnPressToggle.checked = !!settings.speakOnPress;
    printSizeSelect.value = settings.printCardSize;
  }

  settingsBtn.addEventListener("click", () => {
    applySettingsToControls();
    openPopover(settingsBackdrop);
  });

  rateRange.addEventListener("input", () => {
    settings.rate = parseFloat(rateRange.value);
    rateOutput.textContent = `${settings.rate.toFixed(2)}×`;
    saveSettings();
  });

  pitchRange.addEventListener("input", () => {
    settings.pitch = parseFloat(pitchRange.value);
    pitchOutput.textContent = settings.pitch.toFixed(2);
    saveSettings();
  });

  volumeRange.addEventListener("input", () => {
    settings.volume = parseFloat(volumeRange.value);
    volumeOutput.textContent = `${Math.round(settings.volume * 100)}%`;
    saveSettings();
  });

  voiceSelect.addEventListener("change", () => {
    settings.voiceURI = voiceSelect.value;
    saveSettings();
  });

  moodModifiersToggle.addEventListener("change", () => {
    settings.applyMoodModifiers = moodModifiersToggle.checked;
    saveSettings();
  });

  speakOnPressToggle.addEventListener("change", () => {
    settings.speakOnPress = speakOnPressToggle.checked;
    saveSettings();
  });

  themeSelect.addEventListener("change", () => {
    settings.theme = themeSelect.value;
    saveSettings();
    applyTheme();
  });

  testVoiceBtn.addEventListener("click", () => speak("Hi! This is how I sound."));

  resetBoardsBtn.addEventListener("click", () => {
    const ok = confirm(
      "Reset every category board and the suggestion strip's pinned words back to their defaults? Anything you've added, removed, or pinned will be lost. Voice settings, moods, and usage history are not affected."
    );
    if (!ok) return;
    Object.keys(boardState).forEach((k) => delete boardState[k]);
    saveBoards();
    renderSuggestions();
    if (!navBackdrop.hidden) {
      renderNavCategoryTabs();
      renderNavFrequentRow();
      renderNavGrid();
    }
    showToast("Boards reset to defaults");
  });

  printSizeSelect.addEventListener("change", () => {
    settings.printCardSize = printSizeSelect.value;
    saveSettings();
  });

  // Builds a printable sheet of every button currently on the
  // Emoji-Speak board (the live, customized set — same as boardItems()
  // renders on screen) and hands off to the browser's own print dialog,
  // where "Save as PDF" produces a PDF with no PDF library needed.
  // Cards per row, per size — must match each .print-size-* card width in
  // style.css (small 1.4in×4, medium 2in×3, large 2.8in×2 fit a portrait
  // page). Used to build real row elements below rather than relying on
  // CSS Grid to wrap them, since browsers don't reliably keep a grid row
  // intact across a page break (a row straddling the boundary gets sliced
  // in half instead of pushed whole to the next page) — see printEmojiBoard.
  const PRINT_COLUMNS = { small: 4, medium: 3, large: 2 };

  function printEmojiBoard() {
    const emojiBlock = NAV_BLOCKS.find((b) => b.id === "emoji");
    const items = boardItems(emojiBlock);
    const columns = PRINT_COLUMNS[settings.printCardSize] || PRINT_COLUMNS.medium;

    printSheetEl.innerHTML = "";
    printSheetEl.className = "print-sheet print-size-" + settings.printCardSize;

    const title = document.createElement("h1");
    title.className = "print-title";
    title.textContent = "G-Speak — Emoji-Speak";
    printSheetEl.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "print-grid";

    let row = null;
    items.forEach((item, i) => {
      if (i % columns === 0) {
        row = document.createElement("div");
        row.className = "print-row";
        grid.appendChild(row);
      }
      const card = document.createElement("div");
      card.className = "print-card";
      // Every Emoji-Speak board item is always an {emoji, word} object —
      // it's the one category where an icon is mandatory (see NAV_BLOCKS).
      const emojiSpan = document.createElement("span");
      emojiSpan.className = "print-card-emoji";
      emojiSpan.textContent = item.emoji;
      const wordSpan = document.createElement("span");
      wordSpan.className = "print-card-word";
      wordSpan.textContent = itemLabel(item);
      card.append(emojiSpan, wordSpan);
      row.appendChild(card);
    });
    printSheetEl.appendChild(grid);

    closePopover(settingsBackdrop);
    // Let the newly-injected content lay out before the print dialog
    // (and the browser's own print-layout pass) takes over.
    requestAnimationFrame(() => window.print());
  }

  printEmojiBtn.addEventListener("click", printEmojiBoard);

  /* ---------------- Import sanitization ----------------
     An imported file is untrusted input — it can be handed around
     between people ("here's a starter vocabulary pack!"), not just
     round-tripped by the same person who exported it. Every field is
     checked for type/shape and capped in size before it's trusted,
     rather than handing the parsed JSON straight to Object.assign:
     that would also let a crafted "__proto__" key repoint one of our
     own objects' prototype. Building a fresh object field-by-field like
     this never even reads such a key, so that's closed off for free. */

  function isPlainObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function sanitizeSettingsImport(raw) {
    if (!isPlainObject(raw)) return {};
    const out = {};
    if (typeof raw.rate === "number" && isFinite(raw.rate)) out.rate = clamp(raw.rate, 0.1, 10);
    if (typeof raw.pitch === "number" && isFinite(raw.pitch)) out.pitch = clamp(raw.pitch, 0, 2);
    if (typeof raw.volume === "number" && isFinite(raw.volume)) out.volume = clamp(raw.volume, 0, 1);
    if (typeof raw.voiceURI === "string") out.voiceURI = raw.voiceURI.slice(0, 300);
    if (typeof raw.applyMoodModifiers === "boolean") out.applyMoodModifiers = raw.applyMoodModifiers;
    if (typeof raw.speakOnPress === "boolean") out.speakOnPress = raw.speakOnPress;
    if (raw.theme === "light" || raw.theme === "dark" || raw.theme === "system") out.theme = raw.theme;
    if (["small", "medium", "large"].includes(raw.printCardSize)) out.printCardSize = raw.printCardSize;
    return out;
  }

  function sanitizeMoodsImport(raw) {
    if (!isPlainObject(raw)) return {};
    const out = {};
    MOODS.forEach((m) => {
      if (raw[m.id] === 0 || raw[m.id] === 1 || raw[m.id] === 2) out[m.id] = raw[m.id];
    });
    return out;
  }

  function sanitizeUsageImport(raw) {
    if (!isPlainObject(raw)) return {};
    const out = {};
    Object.keys(raw)
      .slice(0, 1000)
      .forEach((key) => {
        const entry = raw[key];
        if (!isPlainObject(entry)) return;
        if (typeof entry.count !== "number" || !isFinite(entry.count)) return;
        if (typeof entry.display !== "string") return;
        // Re-derive the storage key from the (capped) display text rather
        // than trusting the file's own key, so the two can never disagree.
        // Also reject a couple of literal strings that would otherwise
        // reach the final Object.assign as real object keys.
        const display = entry.display.trim().slice(0, 200);
        const storageKey = display.toLowerCase();
        if (!display || storageKey === "__proto__" || storageKey === "constructor" || storageKey === "prototype") {
          return;
        }
        out[storageKey] = { count: Math.max(0, Math.floor(entry.count)), display };
      });
    return out;
  }

  // A board item is either a plain string, or {emoji, word} — always
  // just text, capped in length so nothing absurd gets stored.
  function sanitizeBoardItem(raw) {
    if (typeof raw === "string") return raw.slice(0, 200);
    if (isPlainObject(raw) && typeof raw.emoji === "string" && typeof raw.word === "string") {
      return { emoji: raw.emoji.slice(0, 20), word: raw.word.slice(0, 200) };
    }
    return null;
  }

  function sanitizeStringArray(raw, maxLen, maxItems) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((v) => typeof v === "string")
      .map((v) => v.slice(0, maxLen))
      .slice(0, maxItems);
  }

  function sanitizeBoardsImport(raw) {
    if (!isPlainObject(raw)) return {};
    const out = {};
    const validIds = new Set(["home"].concat(NAV_BLOCKS.map((b) => b.id)));
    Object.keys(raw).forEach((blockId) => {
      if (!validIds.has(blockId)) return; // also excludes __proto__/constructor/etc.
      const entry = raw[blockId];
      if (!isPlainObject(entry)) return;
      if (blockId === "home") {
        out.home = { pinned: sanitizeStringArray(entry.pinned, 200, 100) };
        return;
      }
      out[blockId] = {
        removed: sanitizeStringArray(entry.removed, 200, 500),
        pinned: sanitizeStringArray(entry.pinned, 200, 200),
        added: Array.isArray(entry.added)
          ? entry.added.map(sanitizeBoardItem).filter(Boolean).slice(0, 500)
          : [],
      };
    });
    return out;
  }

  /* ---------------- Import / export (backup) ---------------- */

  exportBtn.addEventListener("click", () => {
    const payload = {
      app: "g-speak",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      usage,
      moods: moodState,
      boards: boardState,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gspeak-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener("click", () => importFileInput.click());

  importFileInput.addEventListener("change", () => {
    const file = importFileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(String(reader.result));
      } catch (e) {
        data = null;
      }
      if (!isPlainObject(data)) {
        alert("That file doesn't look like a valid G-Speak backup.");
        importFileInput.value = "";
        return;
      }

      // Sanitize before ever touching real state: type/shape-check every
      // field and cap array/string sizes, rather than trusting the file.
      const cleanSettings = sanitizeSettingsImport(data.settings);
      const cleanMoods = sanitizeMoodsImport(data.moods);
      const cleanUsage = sanitizeUsageImport(data.usage);
      const cleanBoards = sanitizeBoardsImport(data.boards);
      const looksValid =
        Object.keys(cleanSettings).length ||
        Object.keys(cleanMoods).length ||
        Object.keys(cleanUsage).length ||
        Object.keys(cleanBoards).length;
      if (!looksValid) {
        alert("That file doesn't look like a valid G-Speak backup.");
        importFileInput.value = "";
        return;
      }
      const ok = confirm(
        "This will replace the voice settings, moods, most-used words, and any board customizations currently saved on this device. Continue?"
      );
      if (!ok) {
        importFileInput.value = "";
        return;
      }

      Object.assign(settings, cleanSettings);

      Object.keys(moodState).forEach((k) => delete moodState[k]);
      Object.assign(moodState, cleanMoods);
      MOODS.forEach((m) => {
        if (typeof moodState[m.id] !== "number") moodState[m.id] = 0;
      });

      Object.keys(usage).forEach((k) => delete usage[k]);
      Object.assign(usage, cleanUsage);

      Object.keys(boardState).forEach((k) => delete boardState[k]);
      Object.assign(boardState, cleanBoards);

      saveSettings();
      saveMoods();
      saveJSON(LS_USAGE, usage);
      saveBoards();

      applySettingsToControls();
      refreshVoices();
      renderSuggestions();
      renderMoods();
      if (!navBackdrop.hidden) {
        renderNavCategoryTabs();
        renderNavFrequentRow();
        renderNavGrid();
      }
      importFileInput.value = "";
      alert("Import complete!");
    };
    reader.readAsText(file);
  });

  /* ---------------- Main sentence bar + speak wiring ---------------- */

  function doSpeak() {
    const text = sentenceBar.value.trim();
    if (!text) return;
    speak(text);
    recordUsage(text);
    renderSuggestions();
    sentenceBar.value = "";
  }

  speakBtn.addEventListener("click", doSpeak);

  sentenceBar.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSpeak();
    }
  });

  clearBtn.addEventListener("click", () => {
    sentenceBar.value = "";
  });

  // Press-and-hold whatever's typed to add it to the matching board:
  // a number or formula -> Numbers, a single word -> Words, anything
  // with more than one word -> Sentences.
  makeLongPressOnly(sentenceBar, () => {
    const text = sentenceBar.value;
    const kind = classifySentenceContent(text);
    if (!kind) return;
    sentenceBar.blur(); // avoid the keyboard popping up behind the menu
    const block = NAV_BLOCKS.find((b) => b.id === kind);
    showContextMenu([
      { label: `➕ Add to ${block.label}`, onClick: () => addItemToBoard(block, text.trim()) },
    ]);
  });

  // The one deliberate, explicit way to summon the on-screen keyboard
  // besides tapping the sentence bar directly — a visible hint for anyone
  // who doesn't know tapping the bar itself works.
  keyboardBtn.addEventListener("click", () => sentenceBar.focus());

  helpBtn.addEventListener("click", () => openPopover(helpBackdrop));

  /* ---------------- Theme config (branding) ----------------
     js/theme.config.js already applied the title and palette (before
     first paint, so there's no flash). All that's left once the DOM
     exists is the header's logo and visible text. */

  function applyThemeConfig() {
    const config = window.GSPEAK_THEME_CONFIG || {};
    const headerText = config.headerTitle || config.title;
    const h1 = document.querySelector(".brand h1");
    if (headerText && h1) h1.textContent = headerText;

    const logo = config.logo;
    const logoEl = document.querySelector(".brand-emoji");
    if (logo && logo.value && logoEl) {
      if (logo.type === "svg") {
        logoEl.innerHTML = logo.value; // trusted: your own config file, not user input
      } else if (logo.type === "image") {
        logoEl.innerHTML = "";
        const img = document.createElement("img");
        img.src = logo.value;
        img.alt = "";
        logoEl.appendChild(img);
      } else {
        logoEl.textContent = logo.value;
      }
    }
  }

  /* ---------------- Init ---------------- */

  applyTheme();
  applyThemeConfig();
  renderSuggestions();
  renderMoods();
  renderFastNav();
  refreshVoices();
  if (synth) synth.onvoiceschanged = refreshVoices;
})();
