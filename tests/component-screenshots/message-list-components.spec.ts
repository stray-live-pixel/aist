import { expect, test } from '@playwright/test';

const SCENARIOS = [
  'empty-state',
  'agent-activity-status',
  'system-instruction-label',
  'tool-calls-cut',
  'message-list'
] as const;

/**
 * Что это: screenshot-тесты виджетов message-list через лёгкий React harness.
 * Зачем нужно: эталоны фиксируют внешний вид конкретного компонента, а не весь Storybook shell.
 */
for (const scenario of SCENARIOS) {
  test(`message-list component screenshot: ${scenario}`, async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`/index.html?scenario=${scenario}`);
    await page.locator('[data-testid="component-shot"]').waitFor({ state: 'visible' });
    await expect(page.locator('[data-testid="component-shot"]')).toHaveScreenshot(`${scenario}.png`, {
      animations: 'disabled'
    });
  });
}
