/* ============================================================
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

  // Ternary mood toggles: state 0 = off, 1 = negative, 2 = positive.
  const MOODS = [
    { id: "hunger", off: "😐", neg: "🍽️", pos: "😋", negLabel: "Hungry", posLabel: "Full" },
    { id: "thirst", off: "😐", neg: "🥵", pos: "💧", negLabel: "Thirsty", posLabel: "Hydrated" },
    { id: "sadness", off: "😐", neg: "😢", pos: "😊", negLabel: "Sad", posLabel: "Happy" },
    { id: "anger", off: "😐", neg: "😠", pos: "🤩", negLabel: "Mad", posLabel: "Joyful" },
    { id: "nerves", off: "😐", neg: "😰", pos: "🤗", negLabel: "Nervous", posLabel: "Excited" },
    { id: "pain", off: "😐", neg: "🤕", pos: "💪", negLabel: "Hurt", posLabel: "Great" },
  ];

  // Fast-nav categories. Each has placeholder items to be built out later.
  // mode "append" adds the item to whatever is already typed; "replace" sets
  // the whole sentence bar (used for complete sentences).
  const NAV_BLOCKS = [
    {
      id: "emoji",
      label: "Emoji-Speak",
      icon: "😀",
      color: "#f4a300",
      mode: "append",
      items: [
        { emoji: "😀", word: "happy" }, { emoji: "😢", word: "sad" },
        { emoji: "😡", word: "angry" }, { emoji: "😴", word: "tired" },
        { emoji: "❤️", word: "love" }, { emoji: "👍", word: "yes" },
        { emoji: "👎", word: "no" }, { emoji: "🙏", word: "please" },
        { emoji: "🤒", word: "sick" }, { emoji: "😨", word: "scared" },
        { emoji: "😂", word: "funny" }, { emoji: "😮", word: "surprised" },
        { emoji: "🥵", word: "hot" }, { emoji: "🥶", word: "cold" },
        { emoji: "🤕", word: "hurt" }, { emoji: "👋", word: "hello" },
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
    { rate: 1, pitch: 1, volume: 1, voiceURI: "" },
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

  const sentenceBar = document.getElementById("sentence-bar");
  const speakBtn = document.getElementById("speak-btn");
  const clearBtn = document.getElementById("clear-btn");
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
  const testVoiceBtn = document.getElementById("test-voice-btn");

  const navBackdrop = document.getElementById("nav-backdrop");
  const navPopoutTitle = document.getElementById("nav-popout-title");
  const navPopoutGrid = document.getElementById("nav-popout-grid");

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
    utter.rate = settings.rate;
    utter.pitch = settings.pitch;
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

    dynamic.slice(0, dynamicSlots).forEach((text) => {
      suggestionsRow.appendChild(makeChip(text, false));
    });
    PINNED_WORDS.forEach((text) => {
      suggestionsRow.appendChild(makeChip(text, true));
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

  function appendToSentence(text) {
    const current = sentenceBar.value.trim();
    sentenceBar.value = current ? current + " " + text : text;
    sentenceBar.focus();
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
      btn.textContent = `${m.off} Off`;
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

  function openNavPopover(block) {
    navPopoutTitle.textContent = `${block.icon} ${block.label}`;
    navPopoutGrid.innerHTML = "";
    block.items.forEach((item) => {
      const isObj = typeof item === "object";
      const label = isObj ? item.word : item;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "item-chip";
      btn.innerHTML = isObj
        ? `<span class="item-emoji">${item.emoji}</span><span>${item.word}</span>`
        : `<span>${item}</span>`;
      btn.addEventListener("click", () => {
        if (block.mode === "replace") {
          sentenceBar.value = label;
          sentenceBar.focus();
          closePopover(navBackdrop);
        } else {
          appendToSentence(label);
        }
      });
      navPopoutGrid.appendChild(btn);
    });
    openPopover(navBackdrop);
  }

  /* ---------------- Popover helpers ---------------- */

  function openPopover(backdrop) {
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

  /* ---------------- Settings popover wiring ---------------- */

  function applySettingsToControls() {
    rateRange.value = settings.rate;
    pitchRange.value = settings.pitch;
    volumeRange.value = settings.volume;
    rateOutput.textContent = `${Number(settings.rate).toFixed(2)}×`;
    pitchOutput.textContent = Number(settings.pitch).toFixed(2);
    volumeOutput.textContent = `${Math.round(settings.volume * 100)}%`;
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

  testVoiceBtn.addEventListener("click", () => speak("Hi! This is how I sound."));

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
    sentenceBar.focus();
  });

  /* ---------------- Init ---------------- */

  renderSuggestions();
  renderMoods();
  renderFastNav();
  refreshVoices();
  if (synth) synth.onvoiceschanged = refreshVoices;
})();
