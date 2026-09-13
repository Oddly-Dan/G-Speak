const { test, expect } = require('@playwright/test');
const { spyOnSpeech, lastUtterance } = require('./helpers');

test.describe('Speak on Press', () => {
  test('is off by default', async ({ page }) => {
    await page.goto('/');
    await page.click('#settings-btn');
    await expect(page.locator('#speak-on-press-toggle')).not.toBeChecked();
  });

  test('off: tapping a suggestion chip does not speak', async ({ page }) => {
    await spyOnSpeech(page);
    await page.goto('/');
    await page.locator('#suggestions-row .chip', { hasText: 'Hi' }).click();
    const count = await page.evaluate(() => window.__utterances.length);
    expect(count).toBe(0);
  });

  test('on: tapping a suggestion chip speaks just that word', async ({ page }) => {
    await spyOnSpeech(page);
    await page.goto('/');
    await page.click('#settings-btn');
    await page.locator('label:has(#speak-on-press-toggle) .toggle-track').click();
    await page.click('[data-close="settings"]');

    await page.locator('#suggestions-row .chip', { hasText: 'Hi' }).click();
    expect(await lastUtterance(page)).toMatchObject({ text: 'Hi' });
    // It still populates the sentence bar as normal.
    await expect(page.locator('#sentence-bar')).toHaveValue('Hi');
  });

  test('on: tapping a board item (append mode) speaks just that item, not the whole bar', async ({
    page,
  }) => {
    await spyOnSpeech(page);
    await page.goto('/');
    await page.click('#settings-btn');
    await page.locator('label:has(#speak-on-press-toggle) .toggle-track').click();
    await page.click('[data-close="settings"]');

    await page.locator('.nav-block').first().click(); // Emoji-Speak
    await page.locator('#nav-popout-grid .item-chip', { hasText: 'go' }).click();
    expect(await lastUtterance(page)).toMatchObject({ text: 'go' });

    await page.click('[data-close="nav"]');
    await page.locator('#suggestions-row .chip', { hasText: 'Hi' }).click();
    // Speaks the newly-tapped word alone, not "go Hi".
    expect(await lastUtterance(page)).toMatchObject({ text: 'Hi' });
  });

  test('on: tapping a Sentences item (replace mode) speaks that whole sentence', async ({ page }) => {
    await spyOnSpeech(page);
    await page.goto('/');
    await page.click('#settings-btn');
    await page.locator('label:has(#speak-on-press-toggle) .toggle-track').click();
    await page.click('[data-close="settings"]');

    await page.locator('.nav-block').first().click();
    await page.locator('.category-tab', { hasText: 'Sentences' }).click();
    const first = page.locator('#nav-popout-grid .item-chip').first();
    const text = (await first.textContent()).trim();
    await first.click();
    expect(await lastUtterance(page)).toMatchObject({ text });
  });

  test('typing into the sentence bar never triggers Speak on Press', async ({ page }) => {
    await spyOnSpeech(page);
    await page.goto('/');
    await page.click('#settings-btn');
    await page.locator('label:has(#speak-on-press-toggle) .toggle-track').click();
    await page.click('[data-close="settings"]');

    await page.locator('#sentence-bar').pressSequentially('hello');
    const count = await page.evaluate(() => window.__utterances.length);
    expect(count).toBe(0);
  });

  test('turning it back off stops the per-tap speech', async ({ page }) => {
    await spyOnSpeech(page);
    await page.goto('/');
    await page.click('#settings-btn');
    const track = page.locator('label:has(#speak-on-press-toggle) .toggle-track');
    await track.click(); // on
    await page.click('[data-close="settings"]');
    await page.locator('#suggestions-row .chip', { hasText: 'Hi' }).click();
    expect(await page.evaluate(() => window.__utterances.length)).toBe(1);

    await page.click('#settings-btn');
    await track.click(); // off
    await page.click('[data-close="settings"]');
    await page.locator('#suggestions-row .chip', { hasText: 'Greetings' }).click();
    expect(await page.evaluate(() => window.__utterances.length)).toBe(1); // unchanged
  });
});
