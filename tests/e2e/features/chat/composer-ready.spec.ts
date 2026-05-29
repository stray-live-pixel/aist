import { expect, expectAistScreenshot, openFreshAistChat, test } from '../../fixtures';

test.describe('Фича: Chat / Composer', () => {
  test(`
    Пользователь открывает чат и видит готовый composer.

    Задача пользователя: я как разработчик ИИ-агента хочу открыть AIST в реальном VS Code
    и сразу понять, что чат готов принимать задачу по проекту.

    Зачем это важно: если webview не открылся или composer недоступен, пользователь не сможет
    начать работу с агентом даже при исправных unit-тестах.

    Как тест проверяет решение: тест открывает команду aist: Open Chat через Command Palette,
    ждёт реальный webview и проверяет пустое состояние, поле ввода и доступную кнопку отправки.
  `, async ({ workbench }) => {
    const webview = await openFreshAistChat({ page: workbench });

    await expect(webview.getByText('Готов работать с вашим кодом')).toBeVisible();
    await expect(
      webview.getByText('Попросите внести правки, найти что-то в репозитории, проверить файлы или выполнить команду.')
    ).toBeVisible();
    await expect(
      webview.getByPlaceholder('Попросите агента проверить, создать, изменить или удалить файлы проекта...')
    ).toBeVisible();
    await expect(webview.getByRole('button', { name: 'Отправить сообщение' })).toBeEnabled();
    await expectAistScreenshot({ webview, name: 'chat-composer-ready.png' });
  });
});
