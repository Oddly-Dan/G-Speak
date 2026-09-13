const { test, expect } = require('@playwright/test');

test.describe('Help', () => {
  test('the ? button sits to the left of the keyboard icon', async ({ page }) => {
    await page.goto('/');
    const ids = await page.$$eval('.topbar-actions > button', (els) => els.map((e) => e.id));
    expect(ids.indexOf('help-btn')).toBeLessThan(ids.indexOf('keyboard-btn'));
  });

  test('opens with the GitHub link, license, and a usage guide', async ({ page }) => {
    await page.goto('/');
    await page.click('#help-btn');
    await expect(page.locator('#help-backdrop')).toBeVisible();
    await expect(page.locator('#help-popout')).toContainText('GPL-3.0-or-later');
    const link = page.locator('#help-popout a');
    await expect(link).toHaveAttribute('href', 'https://github.com/Oddly-Dan/G-Speak');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    expect(await page.locator('#help-popout .help-list li').count()).toBeGreaterThan(3);
  });

  test('closes via the ✕ button and via Escape', async ({ page }) => {
    await page.goto('/');
    await page.click('#help-btn');
    await page.click('[data-close="help"]');
    await expect(page.locator('#help-backdrop')).toBeHidden();

    await page.click('#help-btn');
    await page.keyboard.press('Escape');
    await expect(page.locator('#help-backdrop')).toBeHidden();
  });

  test('closing returns focus to the ? button', async ({ page }) => {
    await page.goto('/');
    await page.click('#help-btn');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.activeElement.id)).toBe('help-btn');
  });

  test('opening moves focus into the dialog', async ({ page }) => {
    await page.goto('/');
    await page.click('#help-btn');
    const activeIsInsideHelp = await page.evaluate(() =>
      document.getElementById('help-popout').contains(document.activeElement)
    );
    expect(activeIsInsideHelp).toBe(true);
  });
});

test.describe('Print My Emoji-Speak', () => {
  test.beforeEach(async ({ page }) => {
    // Prevent the real OS print dialog from ever trying to open.
    await page.addInitScript(() => {
      window.__printCalled = 0;
      window.print = () => {
        window.__printCalled += 1;
      };
    });
  });

  test('defaults to Medium', async ({ page }) => {
    await page.goto('/');
    await page.click('#settings-btn');
    await expect(page.locator('#print-size-select')).toHaveValue('medium');
  });

  test('builds one card per Emoji-Speak board item, in the chosen size, and calls print', async ({
    page,
  }) => {
    await page.goto('/');
    // Get the on-screen board size as ground truth for comparison.
    await page.locator('.nav-block').first().click();
    const onScreenCount = await page.locator('#nav-popout-grid .item-chip').count();
    await page.click('[data-close="nav"]');

    await page.click('#settings-btn');
    await page.selectOption('#print-size-select', 'large');
    await page.click('#print-emoji-btn');
    await page.waitForTimeout(100);

    expect(await page.evaluate(() => window.__printCalled)).toBe(1);
    await expect(page.locator('#print-sheet')).toHaveClass(/print-size-large/);
    expect(await page.locator('#print-sheet .print-card').count()).toBe(onScreenCount);
    // Settings closes automatically so the print dialog isn't backed by it.
    await expect(page.locator('#settings-backdrop')).toBeHidden();
  });

  test('reflects board customization: a promoted hidden item appears on the printed sheet', async ({
    page,
  }) => {
    await page.goto('/');
    // Promote "dog" (hidden-only) onto the Emoji-Speak board.
    await page.locator('.nav-block').first().click();
    await page.fill('#nav-search', 'dog');
    const box = await page.getByRole('button', { name: '🐶 dog', exact: true }).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(650);
    await page.mouse.up();
    await page.click('#context-menu button');
    await page.click('[data-close="nav"]');

    await page.click('#settings-btn');
    await page.click('#print-emoji-btn');
    await page.waitForTimeout(100);
    const printedWords = await page.locator('#print-sheet .print-card-word').allTextContents();
    expect(printedWords).toContain('dog');
  });

  test('the print size choice is remembered', async ({ page }) => {
    await page.goto('/');
    await page.click('#settings-btn');
    await page.selectOption('#print-size-select', 'small');
    await page.reload();
    await page.click('#settings-btn');
    await expect(page.locator('#print-size-select')).toHaveValue('small');
  });

  test('a faint dot-grid cutting guide is present on the printed sheet', async ({ page }) => {
    await page.goto('/');
    await page.click('#settings-btn');
    await page.click('#print-emoji-btn');
    await page.waitForTimeout(100);
    const bgImage = await page.locator('.print-grid').evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bgImage).toContain('radial-gradient');
  });
});
