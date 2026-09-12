const { test, expect } = require('@playwright/test');

test.describe('appearance (light/dark/system)', () => {
  test('defaults to System, with no data-theme attribute', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    await page.click('#settings-btn');
    await expect(page.locator('#theme-select')).toHaveValue('system');
  });

  test('choosing Dark sets data-theme and persists across reload', async ({ page }) => {
    await page.goto('/');
    await page.click('#settings-btn');
    await page.selectOption('#theme-select', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.click('#settings-btn');
    await expect(page.locator('#theme-select')).toHaveValue('dark');
  });

  test('choosing Light sets data-theme="light"', async ({ page }) => {
    await page.goto('/');
    await page.click('#settings-btn');
    await page.selectOption('#theme-select', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('switching back to System removes the attribute', async ({ page }) => {
    await page.goto('/');
    await page.click('#settings-btn');
    await page.selectOption('#theme-select', 'dark');
    await page.selectOption('#theme-select', 'system');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  });

  test('an explicit choice applies before first paint on reload (no flash)', async ({ page }) => {
    await page.goto('/');
    await page.click('#settings-btn');
    await page.selectOption('#theme-select', 'dark');

    // Check the attribute is present as early as possible, not just
    // after app.js has had a chance to run.
    await page.reload({ waitUntil: 'commit' });
    const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(themeAttr).toBe('dark');
  });

  test('dark mode actually changes the rendered background color', async ({ page }) => {
    await page.goto('/');
    const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await page.click('#settings-btn');
    await page.selectOption('#theme-select', 'dark');
    await page.click('[data-close="settings"]');
    const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    expect(darkBg).not.toBe(lightBg);
  });
});
