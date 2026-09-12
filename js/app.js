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

  /* ---------------- Config ---------------- */

  // Words that are always shown in the suggestion strip, in this order.
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

  // Fast-nav categories. Each has placeholder items to be built out later.
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
    { rate: 1, pitch: 1, volume: 1, voiceURI: "", applyMoodModifiers: false },
    loadJSON(LS_SETTINGS, {})
  );

  function saveSettings() {
    saveJSON(LS_SETTINGS, settings);
  }

  /* ---------------- Usage tracking (for suggestions) ---------------- */

  const usage = loadJSON(LS_USAGE, {}); // { "lowercase text": { count, display } }

  function recordUsage(text) {
    const key = text.trim().toLowerCase();
    if (!key) return;
    if (PINNED_WORDS.some((w) => w.toLowerCase() === key)) return; // already pinned
    const entry = usage[key] || { count: 0, display: text.trim() };
    entry.count += 1;
    entry.display = text.trim(); // keep most recent casing
    usage[key] = entry;
    saveJSON(LS_USAGE, usage);
  }

  function topUsageEntries(limit) {
    return Object.values(usage)
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

  /* ---------------- DOM refs ---------------- */

  const sentenceArea = document.getElementById("sentence-area");
  const sentenceBar = document.getElementById("sentence-bar");
  const speakBtn = document.getElementById("speak-btn");
  const clearBtn = document.getElementById("clear-btn");
  const keyboardBtn = document.getElementById("keyboard-btn");
  const suggestionsRow = document.getElementById("suggestions-row");
  const moodRow = document.getElementById("mood-row");
  const fastnav = document.getElementById("fastnav");

  const settingsBtn = document.getElementById("settings-btn");
  const settingsBackdrop = document.getElementById("settings-backdrop");
  const voiceSelect = document.getElementById("voice-select");
  const rateRange = document.getElementById("rate-range");
  const pitchRange = document.getElementById("pitch-range");
  const volumeRange = document.getElementById("volume-range");
  const rateOutput = document.getElementById("rate-output");
  const pitchOutput = document.getElementById("pitch-output");
  const volumeOutput = document.getElementById("volume-output");
  const moodModifiersToggle = document.getElementById("mood-modifiers-toggle");
  const testVoiceBtn = document.getElementById("test-voice-btn");
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const importFileInput = document.getElementById("import-file-input");

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
    const usedCount = Object.keys(usage).length;
    const dynamicSlots = Math.min(
      MAX_DYNAMIC_SUGGESTIONS,
      Math.max(STARTER_DYNAMIC.length, usedCount)
    );

    const top = topUsageEntries(dynamicSlots);
    const dynamic = top.slice();
    STARTER_DYNAMIC.forEach((w) => {
      if (dynamic.length < dynamicSlots && !dynamic.some((d) => d.toLowerCase() === w.toLowerCase())) {
        dynamic.push(w);
      }
    });

    suggestionsRow.innerHTML = "";

    // Pinned words sit at the start of the row; the dynamic/learned
    // suggestions follow after them.
    PINNED_WORDS.forEach((text) => {
      suggestionsRow.appendChild(makeChip(text, true));
    });
    dynamic.slice(0, dynamicSlots).forEach((text) => {
      suggestionsRow.appendChild(makeChip(text, false));
    });
  }

  function makeChip(text, pinned) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (pinned ? " pinned" : "");
    btn.textContent = (pinned ? "📌 " : "") + text;
    btn.addEventListener("click", () => appendToSentence(text));
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

  function makeItemChip(item, block) {
    const isObj = typeof item === "object";
    const label = itemLabel(item);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "item-chip";
    btn.innerHTML = isObj
      ? `<span class="item-emoji">${item.emoji}</span><span>${item.word}</span>`
      : `<span>${item}</span>`;
    btn.addEventListener("click", () => {
      if (block.mode === "replace") {
        sentenceBar.value = label;
        closePopover(navBackdrop);
      } else {
        appendToSentence(label);
      }
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
  // whose text matches one of that category's own items (including its
  // hidden, search-only ones) count, so this row is specific to what
  // you're currently browsing rather than a repeat of the home screen's
  // global suggestions.
  function renderNavFrequentRow() {
    navFrequentRow.innerHTML = "";
    const block = activeBlock();
    const categoryLabels = new Set(
      block.items.concat(block.hiddenItems || []).map((item) => itemLabel(item).toLowerCase())
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

  // Shows the active category's visible items, or — while searching —
  // whichever of that SAME category's items (visible plus its hidden,
  // search-only ones) match the query. Never reaches into other categories.
  function renderNavGrid() {
    navPopoutGrid.innerHTML = "";
    const block = activeBlock();
    let items;
    if (navState.query) {
      const pool = block.items.concat(block.hiddenItems || []);
      items = pool.filter((item) => itemLabel(item).toLowerCase().includes(navState.query));
    } else {
      items = block.items;
    }
    items.forEach((item) => navPopoutGrid.appendChild(makeItemChip(item, block)));
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

  function openPopover(backdrop) {
    repositionBackdrop(backdrop);
    backdrop.hidden = false;
  }

  function closePopover(backdrop) {
    backdrop.hidden = true;
  }

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.close === "settings" ? settingsBackdrop : navBackdrop;
      closePopover(target);
    });
  });

  [settingsBackdrop, navBackdrop].forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closePopover(backdrop);
    });
  });

  window.addEventListener("resize", () => {
    [settingsBackdrop, navBackdrop].forEach((backdrop) => {
      if (!backdrop.hidden) repositionBackdrop(backdrop);
    });
    if (!navBackdrop.hidden) renderNavGrid();
  });

  /* ---------------- Settings popover wiring ---------------- */

  function applySettingsToControls() {
    rateRange.value = settings.rate;
    pitchRange.value = settings.pitch;
    volumeRange.value = settings.volume;
    rateOutput.textContent = `${Number(settings.rate).toFixed(2)}×`;
    pitchOutput.textContent = Number(settings.pitch).toFixed(2);
    volumeOutput.textContent = `${Math.round(settings.volume * 100)}%`;
    moodModifiersToggle.checked = !!settings.applyMoodModifiers;
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

  testVoiceBtn.addEventListener("click", () => speak("Hi! This is how I sound."));

  /* ---------------- Import / export (backup) ---------------- */

  exportBtn.addEventListener("click", () => {
    const payload = {
      app: "g-speak",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      usage,
      moods: moodState,
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
      const looksValid = data && typeof data === "object" && (data.settings || data.usage || data.moods);
      if (!looksValid) {
        alert("That file doesn't look like a valid G-Speak backup.");
        importFileInput.value = "";
        return;
      }
      const ok = confirm(
        "This will replace the voice settings, moods, and most-used words currently saved on this device. Continue?"
      );
      if (!ok) {
        importFileInput.value = "";
        return;
      }

      if (data.settings && typeof data.settings === "object") {
        Object.assign(settings, data.settings);
      }
      if (data.moods && typeof data.moods === "object") {
        Object.keys(moodState).forEach((k) => delete moodState[k]);
        Object.assign(moodState, data.moods);
        MOODS.forEach((m) => {
          if (typeof moodState[m.id] !== "number") moodState[m.id] = 0;
        });
      }
      if (data.usage && typeof data.usage === "object") {
        Object.keys(usage).forEach((k) => delete usage[k]);
        Object.assign(usage, data.usage);
      }

      saveSettings();
      saveMoods();
      saveJSON(LS_USAGE, usage);

      applySettingsToControls();
      refreshVoices();
      renderSuggestions();
      renderMoods();
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

  // The one deliberate, explicit way to summon the on-screen keyboard
  // besides tapping the sentence bar directly — a visible hint for anyone
  // who doesn't know tapping the bar itself works.
  keyboardBtn.addEventListener("click", () => sentenceBar.focus());

  /* ---------------- Init ---------------- */

  renderSuggestions();
  renderMoods();
  renderFastNav();
  refreshVoices();
  if (synth) synth.onvoiceschanged = refreshVoices;
})();
