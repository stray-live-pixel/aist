import { expect, expectAistScreenshot, openAistChat, test } from '../../fixtures';

const composerPlaceholder = 'Попросите агента проверить, создать, изменить или удалить файлы проекта...';

test.describe('Фича: Chat / Markdown rendering', () => {
  test(`
    Пользователь получает markdown-ответ со списком и кодом.

    Задача пользователя: я хочу читать структурированный ответ агента прямо в VS Code, не разбирая сырой markdown.

    Зачем это важно: ответы агента часто содержат чек-листы и команды, поэтому форматирование должно работать в реальном webview.

    Как тест проверяет решение: тест отправляет prompt для markdown, mock-модель возвращает список и code block,
    а UI показывает заголовок, пункты и команду без внешней ИИ-сети.
  `, async ({ workbench, openRouterMock }) => {
    openRouterMock.reset();
    const webview = await openAistChat({ page: workbench });

    const prompt = webview.locator(`textarea[placeholder="${composerPlaceholder}"]:not([readonly])`);

    await prompt.fill('покажи markdown ответ');
    await prompt.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');

    await expect(webview.getByRole('heading', { name: 'План проверки AIST' })).toBeVisible({ timeout: 60_000 });
    await expect(webview.getByText('Проверить composer в реальном VS Code')).toBeVisible();
    await expect(webview.getByText('Убедиться, что модель замокана локально')).toBeVisible();
    await expect(webview.getByText('npm run test:e2e')).toBeVisible();
    await expect.poll(() => openRouterMock.requests.length).toBe(1);
    await expectAistScreenshot({ webview, name: 'chat-markdown-response.png' });
  });
});
