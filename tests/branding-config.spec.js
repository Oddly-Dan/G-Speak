const { test, expect } = require('@playwright/test');

// js/theme.config.js is meant to be edited directly by a deployer — these
// tests simulate that by swapping the file's response, rather than by
// poking at window globals, so they exercise the real load path.

test('default config reproduces the current title, header text, and logo', async ({ page }) => {
  await page.goto('/');
  expect(await page.title()).toBe('G-Speak');
  await expect(page.locator('.brand h1')).toHaveText('G-Speak');
  await expect(page.locator('.brand-emoji')).toHaveText('🗣️');
});

test('a custom config overrides title, header text, logo, and palette', async ({ page }) => {
  await page.route('**/js/theme.config.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      // Mirrors the real file's own apply logic (title + injected
      // palette <style>), since the route fully replaces it rather
      // than layering on top of it.
      body: `
        window.GSPEAK_THEME_CONFIG = {
          title: "Test Brand",
          headerTitle: "Custom Header",
          logo: { type: "emoji", value: "🎯" },
          palette: { light: { accent: "#ff00ff" } },
        };
        document.title = window.GSPEAK_THEME_CONFIG.title;
        var style = document.createElement("style");
        style.textContent = ":root { --accent: #ff00ff; }";
        document.head.appendChild(style);
      `,
    })
  );
  await page.goto('/');

  expect(await page.title()).toBe('Test Brand');
  await expect(page.locator('.brand h1')).toHaveText('Custom Header');
  await expect(page.locator('.brand-emoji')).toHaveText('🎯');
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent).toBe('#ff00ff');
});

test('an SVG logo is inlined as markup, not shown as literal text', async ({ page }) => {
  await page.route('**/js/theme.config.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.GSPEAK_THEME_CONFIG = {
          title: "SVG Brand",
          logo: { type: "svg", value: '<svg data-testid="custom-logo" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>' },
        };
      `,
    })
  );
  await page.goto('/');
  await expect(page.locator('.brand-emoji svg[data-testid="custom-logo"]')).toBeVisible();
});
