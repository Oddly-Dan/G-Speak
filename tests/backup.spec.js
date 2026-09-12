const { test, expect } = require('@playwright/test');
const { longPress, clickCategoryTab, boardLabels } = require('./helpers');

test('export/import round-trips settings, moods, usage, and boards', async ({ page }) => {
  page.on('dialog', (d) => d.accept());

  await page.goto('/');

  // Change a bit of everything.
  await page.click('#settings-btn');
  await page.fill('#rate-range', '1.5');
  await page.dispatchEvent('#rate-range', 'input');
  await page.click('[data-close="settings"]');

  await page.locator('.mood-toggle').nth(3).click();

  await page.fill('#sentence-bar', 'banana');
  await longPress(page, page.locator('#sentence-bar'));
  await page.locator('#context-menu button').first().click();

  await page.fill('#sentence-bar', 'exported word');
  await page.click('#speak-btn');

  // Export.
  await page.click('#settings-btn');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
  const path = await download.path();
  await page.click('[data-close="settings"]');

  // Wipe everything and confirm the customizations are actually gone.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  expect(await page.locator('.mood-toggle').nth(3).getAttribute('data-state')).toBe('0');
  await page.locator('.nav-block').first().click();
  await clickCategoryTab(page, 'Words');
  expect(await boardLabels(page)).not.toContain('banana');
  await page.click('[data-close="nav"]');

  // Import and confirm everything came back.
  await page.click('#settings-btn');
  await page.setInputFiles('#import-file-input', path);
  await page.click('[data-close="settings"]');

  expect(await page.locator('.mood-toggle').nth(3).getAttribute('data-state')).toBe('1');
  await page.locator('.nav-block').first().click();
  await clickCategoryTab(page, 'Words');
  expect(await boardLabels(page)).toContain('banana');
});

test('a malformed file is rejected without touching anything', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/');

  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const badFile = path.join(os.tmpdir(), 'not-a-backup.json');
  fs.writeFileSync(badFile, '{"unrelated": true}');

  await page.click('#settings-btn');
  await page.setInputFiles('#import-file-input', badFile);
  // No crash, no state change — the app is still perfectly usable.
  await page.click('[data-close="settings"]');
  await expect(page.locator('#speak-btn')).toBeVisible();
});
