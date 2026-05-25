import { expect, test } from '@playwright/test';

const SCENARIOS = [
  'feature-agent-mode-select',
  'feature-model-select',
  'feature-permission-preset-select',
  'feature-tool-permission-select',
  'feature-copy-message-button',
  'feature-composer'
] as const;

/**
 * Что это: screenshot-тесты feature-компонентов через лёгкий React harness.
 * Зачем нужно: проверяем переносимые компоненты отдельно от Storybook shell и страниц webview.
 */
for (const scenario of SCENARIOS) {
  test(`feature component screenshot: ${scenario}`, async ({ page }) => {
    // 1. Фиксируем viewport, чтобы размеры dropdown/card не зависели от окружения.
    await page.setViewportSize({ width: 1024, height: 768 });
    // 2. Открываем harness с конкретным feature-компонентом через query-параметр.
    await page.goto(`/index.html?scenario=${scenario}`);
    // 3. Ждём видимый контейнер компонента, иначе скриншот может попасть в промежуточный render.
    await page.locator('[data-testid="component-shot"]').waitFor({ state: 'visible' });
    // 4. Сравниваем только изолированный компонент, а не весь HTML harness.
    await expect(page.locator('[data-testid="component-shot"]')).toHaveScreenshot(`${scenario}.png`, {
      animations: 'disabled'
    });
  });
}
