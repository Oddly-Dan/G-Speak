const { test, expect } = require('@playwright/test');

// Regression guards for a deliberate, easy-to-accidentally-break rule:
// the on-screen keyboard should only ever appear from an explicit tap on
// the sentence bar itself (or the dedicated ⌨️ button) — never as a side
// effect of tapping a suggestion or board item.

test('tapping the sentence bar directly focuses it', async ({ page }) => {
  await page.goto('/');
  await page.click('#sentence-bar');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('sentence-bar');
});

test('the ⌨️ button focuses the sentence bar', async ({ page }) => {
  await page.goto('/');
  await page.click('#keyboard-btn');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('sentence-bar');
});

test('tapping a board item in the browse pop-over does not focus the sentence bar', async ({ page }) => {
  await page.goto('/');
  await page.locator('.nav-block').first().click();
  await page.locator('#nav-popout-grid .item-chip').first().click();
  const activeId = await page.evaluate(() => document.activeElement.id);
  expect(activeId).not.toBe('sentence-bar');
});

test('the clear button does not focus the sentence bar', async ({ page }) => {
  await page.goto('/');
  await page.fill('#sentence-bar', 'x');
  await page.click('#clear-btn');
  const activeId = await page.evaluate(() => document.activeElement.id);
  expect(activeId).not.toBe('sentence-bar');
});
