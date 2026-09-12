const { test, expect } = require('@playwright/test');
const { longPress, clickCategoryTab, boardLabels } = require('./helpers');

test.describe('press-and-hold: home chips', () => {
  test('long-press pins/unpins a suggestion chip', async ({ page }) => {
    await page.goto('/');
    const yes = page.locator('#suggestions-row .chip', { hasText: 'Yes' });
    await longPress(page, yes);
    await expect(page.locator('#context-menu button').first()).toHaveText('📌 Unpin');
    await page.locator('#context-menu button').first().click();

    const chips = (await page.locator('#suggestions-row .chip').allTextContents()).map((c) => c.trim());
    expect(chips).not.toContain('📌 Yes');
  });

  test('a long-press never also fires the short-tap action', async ({ page }) => {
    await page.goto('/');
    const chip = page.locator('#suggestions-row .chip').first();
    await longPress(page, chip);
    // The context menu opened instead of the chip's normal append-to-bar click.
    await expect(page.locator('#sentence-bar')).toHaveValue('');
    await page.locator('#context-menu .cancel').click();
  });
});

test.describe('press-and-hold: sentence bar -> add to board', () => {
  const cases = [
    { text: 'banana', board: 'Words' },
    { text: '12+7', board: 'Numbers' },
    { text: 'I want to play outside', board: 'Sentences' },
  ];

  for (const { text, board } of cases) {
    test(`"${text}" offers Add to ${board}`, async ({ page }) => {
      await page.goto('/');
      await page.fill('#sentence-bar', text);
      await longPress(page, page.locator('#sentence-bar'));
      await expect(page.locator('#context-menu button').first()).toHaveText(`➕ Add to ${board}`);
      await page.locator('#context-menu button').first().click();

      await page.locator('.nav-block').first().click();
      await clickCategoryTab(page, board);
      const labels = await boardLabels(page);
      expect(labels.some((l) => l.includes(text.split(' ')[0]) || l === text)).toBe(true);
    });
  }

  test('an empty bar has nothing to add (long-press is a no-op)', async ({ page }) => {
    await page.goto('/');
    await longPress(page, page.locator('#sentence-bar'));
    await expect(page.locator('#context-backdrop')).toBeHidden();
  });
});

test.describe('press-and-hold: board items', () => {
  test('Pin to Board moves an item to the front', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-block').first().click();
    await clickCategoryTab(page, 'Words');
    const come = page.locator('#nav-popout-grid .item-chip', { hasText: 'come' });
    await longPress(page, come);
    await expect(page.locator('#context-menu button').first()).toHaveText('📌 Pin to Board');
    await page.locator('#context-menu button').first().click();

    const first = await page.locator('#nav-popout-grid .item-chip').first().textContent();
    expect(first.trim()).toBe('come');
  });

  test('pinning then re-opening the menu offers Remove Pin', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-block').first().click();
    await clickCategoryTab(page, 'Words');
    const come = page.locator('#nav-popout-grid .item-chip', { hasText: 'come' });
    await longPress(page, come);
    await page.locator('#context-menu button').first().click(); // pin

    const pinnedFirst = page.locator('#nav-popout-grid .item-chip').first();
    await longPress(page, pinnedFirst);
    await expect(page.locator('#context-menu button').first()).toHaveText('📌 Remove Pin');
  });

  test('Remove takes a default item off the board', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-block').first().click();
    await clickCategoryTab(page, 'Words');
    const come = page.locator('#nav-popout-grid .item-chip', { hasText: 'come' });
    await longPress(page, come);
    await page.locator('#context-menu button.danger').click(); // Remove

    const labels = await boardLabels(page);
    expect(labels).not.toContain('come');
  });

  test('a hidden Emoji-Speak search hit offers "Add to Emoji-Speak", and promoting it puts it on the board', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('.nav-block', { hasText: 'Emoji-Speak' }).click();
    await page.fill('#nav-search', 'cat');
    const hit = page.locator('#nav-popout-grid .item-chip').first();
    await longPress(page, hit);
    await expect(page.locator('#context-menu button').first()).toHaveText('➕ Add to Emoji-Speak');
    await page.locator('#context-menu button').first().click();

    await page.fill('#nav-search', '');
    const labels = await boardLabels(page);
    expect(labels.some((l) => l.includes('cat'))).toBe(true);
  });
});

test.describe('Reset All Boards', () => {
  test('restores customizations to defaults without touching moods/settings', async ({ page }) => {
    await page.goto('/');

    // Customize: unpin Yes, add a word, remove a word, pin a word.
    await longPress(page, page.locator('#suggestions-row .chip', { hasText: 'Yes' }));
    await page.locator('#context-menu button').first().click();

    await page.fill('#sentence-bar', 'banana');
    await longPress(page, page.locator('#sentence-bar'));
    await page.locator('#context-menu button').first().click();

    await page.locator('.mood-toggle').first().click(); // a mood change, should survive reset

    await page.click('#settings-btn');
    page.once('dialog', (d) => d.accept());
    await page.click('#reset-boards-btn');
    await page.click('[data-close="settings"]');

    const chips = (await page.locator('#suggestions-row .chip').allTextContents()).map((c) => c.trim());
    expect(chips).toContain('📌 Yes');

    await page.locator('.nav-block').first().click();
    await clickCategoryTab(page, 'Words');
    const labels = await boardLabels(page);
    expect(labels).not.toContain('banana');

    // Mood state (a different subsystem) must be untouched by the reset.
    expect(await page.locator('.mood-toggle').first().getAttribute('data-state')).toBe('1');
  });
});
