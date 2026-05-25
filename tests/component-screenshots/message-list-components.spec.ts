import { expect, test } from '@playwright/test';

const SCENARIOS = [
  'empty-state',
  'agent-activity-status',
  'system-instruction-label',
  'tool-calls-cut',
  'message-list',
  'message-card-user',
  'message-card-assistant',
  'tool-message-card-approval',
  'tool-message-card-bash',
  'tool-result-preview-bash',
  'tool-approval-actions',
  'workspace-file-link'
] as const;

/**
 * Что это: screenshot-тесты виджетов message-list и отдельных message-компонентов через лёгкий React harness.
 * Зачем нужно: эталоны фиксируют внешний вид конкретного компонента, а не весь Storybook shell.
 */
for (const scenario of SCENARIOS) {
  test(`message component screenshot: ${scenario}`, async ({ page }) => {
    // 1. Устанавливаем viewport для стабильных скриншотов.
    await page.setViewportSize({ width: 1024, height: 768 });
    // 2. Открываем harness с нужным сценарием через query-параметр.
    await page.goto(`/index.html?scenario=${scenario}`);
    // 3. Ждём, пока компонент отрендерится.
    await page.locator('[data-testid="component-shot"]').waitFor({ state: 'visible' });
    // 4. Сравниваем с эталоном (анимации отключены для стабильности).
    await expect(page.locator('[data-testid="component-shot"]')).toHaveScreenshot(`${scenario}.png`, {
      animations: 'disabled'
    });
  });
}
