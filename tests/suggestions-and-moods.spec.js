const { test, expect } = require('@playwright/test');

test.describe('home suggestions strip', () => {
  test('starts with Yes/No/Help pinned first, then Hi/Greetings', async ({ page }) => {
    await page.goto('/');
    const chips = await page.locator('#suggestions-row .chip').allTextContents();
    expect(chips.map((c) => c.trim())).toEqual(['📌 Yes', '📌 No', '📌 Help', 'Hi', 'Greetings']);
  });

  test('tapping a chip appends it to the sentence bar', async ({ page }) => {
    await page.goto('/');
    await page.locator('#suggestions-row .chip', { hasText: 'Hi' }).click();
    await page.locator('#suggestions-row .chip', { hasText: 'Help' }).click();
    await expect(page.locator('#sentence-bar')).toHaveValue('Hi Help');
  });

  test('a short click does not focus the sentence bar (no stray keyboard)', async ({ page }) => {
    await page.goto('/');
    await page.locator('#suggestions-row .chip').first().click();
    const activeId = await page.evaluate(() => document.activeElement.id);
    expect(activeId).not.toBe('sentence-bar');
  });
});

test.describe('mood toggles', () => {
  test('cycle Off -> negative -> positive -> Off, with distinct default icons', async ({ page }) => {
    await page.goto('/');
    const first = page.locator('.mood-toggle').first();
    const offText = await first.textContent();
    expect(offText).toContain('Off');
    expect(offText).not.toBe('😐 Off'); // each pill has its own resting icon, not a shared neutral one

    await first.click();
    expect(await first.getAttribute('data-state')).toBe('1');
    await first.click();
    expect(await first.getAttribute('data-state')).toBe('2');
    await first.click();
    expect(await first.getAttribute('data-state')).toBe('0');
  });

  test('all six moods have visually distinct resting icons', async ({ page }) => {
    await page.goto('/');
    const texts = await page.locator('.mood-toggle').allTextContents();
    const icons = texts.map((t) => t.trim().split(' ')[0]);
    expect(new Set(icons).size).toBe(icons.length);
  });

  test('mood state persists across reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('.mood-toggle').nth(1).click();
    await page.reload();
    expect(await page.locator('.mood-toggle').nth(1).getAttribute('data-state')).toBe('1');
  });
});
