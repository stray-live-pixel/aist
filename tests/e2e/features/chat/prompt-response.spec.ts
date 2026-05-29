import { expect, expectAistScreenshot, openAistChat, test } from '../../fixtures';

test.describe('Фича: Chat / Messaging', () => {
  test(`
    Пользователь отправляет prompt и получает ответ без внешней ИИ-сети.

    Задача пользователя: я как разработчик ИИ-агента хочу проверить полный путь отправки prompt
    без реальных запросов к ИИ-моделям.

    Зачем это важно: e2e должен проверять интеграцию VS Code extension, webview, daemon и истории
    чата, но сетевой слой модели обязан быть детерминированным mock.

    Как тест проверяет решение: тест вводит prompt, отправляет его через UI, ждёт ответ локальной
    mock-модели и проверяет, что daemon действительно сделал HTTP-запрос только в mock server.
  `, async ({ workbench, openRouterMock }) => {
    openRouterMock.reset();
    const webview = await openAistChat({ page: workbench });
    const prompt = webview.getByPlaceholder(
      'Попросите агента проверить, создать, изменить или удалить файлы проекта...'
    );
    const send = webview.getByRole('button', { name: 'Отправить сообщение' });

    await prompt.fill('Ответь коротко: e2e проверяет реальный VS Code без внешней модели.');
    await expect(send).toBeEnabled();
    await send.click();

    await expect(webview.getByText('Вы', { exact: true }).first()).toBeVisible();
    await expect(webview.getByText('Агент', { exact: true })).toBeVisible();
    await expect(
      webview.getByText(
        'Это ответ локальной мок-модели AIST: запрос обработан без внешнего ИИ и сохранён в истории чата.'
      )
    ).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => openRouterMock.requests.length).toBe(1);
    expect(openRouterMock.requests[0]?.url).toBe('/api/v1/chat/completions');
    await expectAistScreenshot({ webview, name: 'chat-mock-response.png' });
  });
});
