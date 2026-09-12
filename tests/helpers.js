// Shared helpers for the G-Speak test suite. Kept dependency-free (just
// thin wrappers over Playwright) so the suite stays as simple as the app.

// Call BEFORE page.goto() to capture every SpeechSynthesisUtterance the
// app creates, in order, as plain {text, rate, pitch, volume} objects
// readable via page.evaluate(() => window.__utterances).
async function spyOnSpeech(page) {
  await page.addInitScript(() => {
    window.__utterances = [];
    const OrigUtter = window.SpeechSynthesisUtterance;
    window.SpeechSynthesisUtterance = function (text) {
      const u = new OrigUtter(text);
      const record = { text };
      Object.defineProperty(u, 'rate', {
        get: () => record.rate,
        set: (v) => (record.rate = v),
      });
      Object.defineProperty(u, 'pitch', {
        get: () => record.pitch,
        set: (v) => (record.pitch = v),
      });
      Object.defineProperty(u, 'volume', {
        get: () => record.volume,
        set: (v) => (record.volume = v),
      });
      window.__utterances.push(record);
      return u;
    };
    window.SpeechSynthesisUtterance.prototype = OrigUtter.prototype;
  });
}

async function lastUtterance(page) {
  return page.evaluate(() => window.__utterances[window.__utterances.length - 1]);
}

// Press-and-hold: a real pointerdown/pointerup pair with a pause between,
// matching the app's own long-press threshold (550ms) — not a synthetic
// event dispatch, so it exercises the exact same code path a real touch
// or mouse press would.
async function longPress(page, locator, ms = 650) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('longPress: element has no bounding box (not visible?)');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

// Clicks the category tab whose visible text contains `label` (e.g. "Words").
async function clickCategoryTab(page, label) {
  await page.locator('.category-tab', { hasText: label }).click();
}

// Reads the current board's item-chip labels (visible text, emoji+word
// concatenated with no separator — e.g. a promoted "dog" reads "🐶dog").
async function boardLabels(page) {
  return page.locator('#nav-popout-grid .item-chip').allTextContents();
}

module.exports = { spyOnSpeech, lastUtterance, longPress, clickCategoryTab, boardLabels };
