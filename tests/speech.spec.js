const { test, expect } = require('@playwright/test');
const { spyOnSpeech, lastUtterance } = require('./helpers');

test.describe('speaking', () => {
  test('Speak! button speaks the typed text and clears the bar', async ({ page }) => {
    await spyOnSpeech(page);
    await page.goto('/');
    await page.fill('#sentence-bar', 'hello world');
    await page.click('#speak-btn');
    expect(await lastUtterance(page)).toMatchObject({ text: 'hello world' });
    await expect(page.locator('#sentence-bar')).toHaveValue('');
  });

  test('Enter key speaks too', async ({ page }) => {
    await spyOnSpeech(page);
    await page.goto('/');
    await page.fill('#sentence-bar', 'enter test');
    await page.locator('#sentence-bar').press('Enter');
    expect(await lastUtterance(page)).toMatchObject({ text: 'enter test' });
  });

  test('empty bar does nothing', async ({ page }) => {
    await spyOnSpeech(page);
    await page.goto('/');
    await page.click('#speak-btn');
    const count = await page.evaluate(() => window.__utterances.length);
    expect(count).toBe(0);
  });

  test('mood modifiers are off by default', async ({ page }) => {
    await spyOnSpeech(page);
    await page.goto('/');
    // Turn hunger on (negative state); with modifiers off this must not
    // touch the base rate of 1.
    await page.locator('.mood-toggle').first().click();
    await page.fill('#sentence-bar', 'x');
    await page.click('#speak-btn');
    expect((await lastUtterance(page)).rate).toBe(1);
  });

  test('a single active mood applies its documented multiplier', async ({ page }) => {
    await spyOnSpeech(page);
    await page.goto('/');
    await page.click('#settings-btn');
    await page.locator('label:has(#mood-modifiers-toggle) .toggle-track').click(); // Apply Mood Modifiers on
    await page.click('[data-close="settings"]');

    await page.locator('.mood-toggle').first().click(); // hunger -> Hungry (x0.95 rate)
    await page.fill('#sentence-bar', 'x');
    await page.click('#speak-btn');
    expect((await lastUtterance(page)).rate).toBeCloseTo(0.95, 5);
  });

  test('two active moods stack multiplicatively (rate and pitch)', async ({ page }) => {
    await spyOnSpeech(page);
    await page.goto('/');
    await page.click('#settings-btn');
    await page.locator('label:has(#mood-modifiers-toggle) .toggle-track').click();
    await page.click('[data-close="settings"]');

    const moods = page.locator('.mood-toggle');
    await moods.nth(0).click(); // hunger -> Hungry: rate x0.95
    await moods.nth(2).click(); // sadness -> Sad: rate x0.95, pitch x0.95
    await page.fill('#sentence-bar', 'x');
    await page.click('#speak-btn');
    const u = await lastUtterance(page);
    expect(u.rate).toBeCloseTo(0.95 * 0.95, 5);
    expect(u.pitch).toBeCloseTo(0.95, 5);
  });

  test('turning mood modifiers back off removes the effect', async ({ page }) => {
    await spyOnSpeech(page);
    await page.goto('/');
    await page.click('#settings-btn');
    const toggle = page.locator('label:has(#mood-modifiers-toggle) .toggle-track');
    await toggle.click(); // on
    await page.click('[data-close="settings"]');
    await page.locator('.mood-toggle').first().click();

    await page.click('#settings-btn');
    await toggle.click(); // off again
    await page.click('[data-close="settings"]');

    await page.fill('#sentence-bar', 'x');
    await page.click('#speak-btn');
    expect((await lastUtterance(page)).rate).toBe(1);
  });
});
