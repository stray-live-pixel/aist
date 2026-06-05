import { expect, test } from '@playwright/test';

/**
 * Web e2e на mock adapter: проверяет, что общий UI монтируется в обычном браузере, получает
 * фикстур-снапшот AgentState от in-memory AgentHost и проводит пользователя через ключевой
 * chat-сценарий без VS Code и без daemon.
 */
test.describe('web chat on the mock adapter', () => {
  test('renders the shared chat UI and submits a prompt optimistically', async ({ page }) => {
    await page.goto('/index.html');

    const input = page.getByTestId('composer-input');
    await expect(input).toBeVisible();

    const prompt = 'Inspect the workspace from web e2e';
    await input.fill(prompt);
    await page.getByTestId('composer-send').click();

    // Mock host ничего не отвечает, поэтому видимый prompt — это оптимистичный user message,
    // который подтверждает, что send-flow общего UI работает в браузере.
    await expect(page.getByText(prompt).first()).toBeVisible();
  });
});
