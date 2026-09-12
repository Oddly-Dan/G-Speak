const { test, expect } = require('@playwright/test');
const { clickCategoryTab } = require('./helpers');

test.describe('browse pop-over', () => {
  test('a nav tile opens the pop-over pre-selecting its own category', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-block', { hasText: 'Words' }).click();
    await expect(page.locator('.category-tab.active')).toHaveText(/Words/);
    await expect(page.locator('#nav-popout-grid .item-chip').first()).toBeVisible();
  });

  test('search is scoped to the active category only', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-block').first().click();

    // "help" exists in Emoji-Speak, Words, and Sentences, but not Numbers.
    await clickCategoryTab(page, 'Numbers');
    await page.fill('#nav-search', 'help');
    await expect(page.locator('#nav-popout-grid .item-chip')).toHaveCount(0);

    await clickCategoryTab(page, 'Words');
    await expect(page.locator('#nav-search')).toHaveValue(''); // switching tabs clears the query
    await page.fill('#nav-search', 'help');
    await expect(page.locator('#nav-popout-grid .item-chip')).toHaveCount(1);
  });

  test('search placeholder names the active category', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-block').first().click();
    await clickCategoryTab(page, 'Sentences');
    await expect(page.locator('#nav-search')).toHaveAttribute('placeholder', 'Search Sentences…');
  });

  test("Emoji-Speak's hidden vocabulary is findable by search but absent from the default grid", async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('.nav-block', { hasText: 'Emoji-Speak' }).click();
    const defaultGrid = await page.locator('#nav-popout-grid .item-chip').allTextContents();
    expect(defaultGrid.some((t) => t.includes('dog'))).toBe(false);

    await page.fill('#nav-search', 'dog');
    const results = await page.locator('#nav-popout-grid .item-chip').allTextContents();
    expect(results.some((t) => t.includes('dog'))).toBe(true);
  });

  test('column count adapts to content: Words gets more columns than Sentences', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-block').first().click();

    await clickCategoryTab(page, 'Words');
    const wordsCols = await page
      .locator('#nav-popout-grid')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);

    await clickCategoryTab(page, 'Sentences');
    const sentenceCols = await page
      .locator('#nav-popout-grid')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);

    expect(wordsCols).toBeGreaterThan(sentenceCols);
  });

  test('the sentence bar stays visible and usable while the pop-over is open', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-block').first().click();
    await expect(page.locator('#sentence-bar')).toBeVisible();

    // It must also not be covered: a hit-test at its center should land
    // on the bar itself, not the dimmed backdrop behind it.
    const box = await page.locator('#sentence-bar').boundingBox();
    const topEl = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return el && el.id;
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    );
    expect(topEl).toBe('sentence-bar');
  });

  test('"Most used" is scoped to the active category', async ({ page }) => {
    await page.goto('/');
    // Speak a plain Emoji-Speak word (not pinned) enough to register usage.
    await page.fill('#sentence-bar', 'eat');
    await page.click('#speak-btn');

    await page.locator('.nav-block', { hasText: 'Emoji-Speak' }).click();
    await expect(page.locator('#nav-frequent-row .chip')).toHaveText(['eat']);

    await clickCategoryTab(page, 'Numbers');
    await expect(page.locator('#nav-frequent-row .nav-empty-hint')).toBeVisible();
  });
});
