const { test, expect } = require('@playwright/test');
const { clickCategoryTab } = require('./helpers');
const fs = require('fs');
const os = require('os');
const path = require('path');

function writeBackup(obj) {
  const p = path.join(os.tmpdir(), `gspeak-test-backup-${Date.now()}-${Math.random()}.json`);
  fs.writeFileSync(p, JSON.stringify(obj));
  return p;
}

test.describe('Content-Security-Policy', () => {
  test('a restrictive CSP is present', async ({ page }) => {
    await page.goto('/');
    const content = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    expect(content).toContain("script-src 'self'");
    expect(content).not.toContain('unsafe-inline\' \'unsafe-eval'); // sanity, not a real check of script-src specifically
  });

  test('normal use of the app triggers no CSP violations', async ({ page }) => {
    const violations = [];
    await page.goto('/');
    await page.exposeFunction('__reportCspViolation', (v) => violations.push(v));
    await page.evaluate(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        window.__reportCspViolation({ directive: e.violatedDirective, blockedURI: e.blockedURI });
      });
    });

    // Exercise a broad slice of the app.
    await page.fill('#sentence-bar', 'hello');
    await page.click('#speak-btn');
    await page.locator('.mood-toggle').first().click();
    await page.click('#settings-btn');
    await page.selectOption('#theme-select', 'dark');
    await page.click('[data-close="settings"]');
    await page.locator('.nav-block').first().click();
    await clickCategoryTab(page, 'Words');
    await page.fill('#nav-search', 'help');
    await page.click('[data-close="nav"]');

    expect(violations).toEqual([]);
  });
});

test.describe('board item rendering is XSS-safe', () => {
  test('a malicious label imported via a backup file renders as literal text, not markup', async ({
    page,
  }) => {
    page.on('dialog', (d) => d.accept());
    let alertFired = false;
    page.on('dialog', (d) => {
      if (d.type() === 'alert' && /XSS/.test(d.message())) alertFired = true;
    });

    await page.goto('/');
    const backup = writeBackup({
      boards: { words: { removed: [], pinned: [], added: ['<img src=x onerror="alert(\'XSS\')">'] } },
    });
    await page.click('#settings-btn');
    await page.setInputFiles('#import-file-input', backup);
    await page.click('[data-close="settings"]');

    await page.locator('.nav-block').first().click();
    await clickCategoryTab(page, 'Words');
    await page.waitForTimeout(300); // give a real bug a chance to fire

    expect(alertFired).toBe(false);
    // The payload is still there as inert text, not silently dropped.
    const labels = await page.locator('#nav-popout-grid .item-chip').allTextContents();
    expect(labels.some((l) => l.includes('<img'))).toBe(true);
    // And critically, no actual <img> element exists in the grid.
    expect(await page.locator('#nav-popout-grid img').count()).toBe(0);
  });

  test('a malicious {emoji, word} object imported for Emoji-Speak is also inert', async ({ page }) => {
    // Only flag the payload's own alert(1) — the app's legitimate
    // "Import complete!" success alert also fires during this test.
    let alertFired = false;
    page.on('dialog', (d) => {
      if (d.type() === 'alert' && d.message() === '1') alertFired = true;
      d.accept();
    });

    await page.goto('/');
    const backup = writeBackup({
      boards: {
        emoji: {
          removed: [],
          pinned: [],
          added: [{ emoji: '<svg onload="alert(1)">', word: '<b onmouseover="alert(1)">hover</b>' }],
        },
      },
    });
    await page.click('#settings-btn');
    await page.setInputFiles('#import-file-input', backup);
    await page.click('[data-close="settings"]');

    await page.locator('.nav-block', { hasText: 'Emoji-Speak' }).click();
    await page.waitForTimeout(300);

    expect(alertFired).toBe(false);
    expect(await page.locator('#nav-popout-grid svg, #nav-popout-grid b').count()).toBe(0);
  });
});

test.describe('import sanitization', () => {
  test('unknown/dangerous keys and wrong-typed fields are dropped, not crashed on', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto('/');

    // Written as a raw JSON string rather than via JSON.stringify(objectLiteral):
    // "__proto__" as an object-literal *key* is special-cased by JS itself
    // (it sets the prototype at construction, producing no own property at
    // all), so that would never actually reach the file as a literal key.
    const rawJson = `{
      "settings": { "rate": "not-a-number", "pitch": 999, "volume": 1, "theme": "not-a-theme", "extra": "nope" },
      "moods": { "hunger": 5, "__proto__": { "polluted": true } },
      "usage": { "x": { "count": "nope", "display": 123 } },
      "boards": {
        "__proto__": { "removed": [], "pinned": [], "added": [] },
        "notarealboard": { "removed": [], "pinned": [], "added": ["x"] },
        "words": "not-an-object"
      }
    }`;
    const backup = path.join(os.tmpdir(), `gspeak-raw-backup-${Date.now()}.json`);
    fs.writeFileSync(backup, rawJson);
    await page.click('#settings-btn');
    await page.setInputFiles('#import-file-input', backup);
    await page.click('[data-close="settings"]');

    // The app must still be completely functional afterward.
    await expect(page.locator('#speak-btn')).toBeVisible();
    const polluted = await page.evaluate(() => ({}).polluted);
    expect(polluted).toBeUndefined();

    await page.locator('.mood-toggle').first(); // hunger mood pill still renders fine
    expect(await page.locator('.mood-toggle').first().getAttribute('data-state')).toBe('0'); // invalid value (5) was rejected
  });

  test('an oversized added-items array is capped rather than accepted wholesale', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto('/');

    const hugeList = Array.from({ length: 5000 }, (_, i) => `word${i}`);
    const backup = writeBackup({ boards: { words: { removed: [], pinned: [], added: hugeList } } });
    await page.click('#settings-btn');
    await page.setInputFiles('#import-file-input', backup);
    await page.click('[data-close="settings"]');

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gspeak.boards')).words.added.length);
    expect(stored).toBeLessThanOrEqual(500);
  });

  test('a completely unrelated JSON file is rejected as invalid', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto('/');
    const p = writeBackup({ totally: 'unrelated', numbers: [1, 2, 3] });
    await page.click('#settings-btn');
    await page.setInputFiles('#import-file-input', p);
    await page.click('[data-close="settings"]');
    await expect(page.locator('#speak-btn')).toBeVisible(); // no crash
  });
});
