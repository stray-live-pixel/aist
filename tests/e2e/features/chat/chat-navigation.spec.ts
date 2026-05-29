import { expect, expectAistScreenshot, openAistChat, test } from '../../fixtures';

const composerPlaceholder = 'Попросите агента проверить, создать, изменить или удалить файлы проекта...';

/**
 * Что это: возвращает активный composer текущего чата.
 * Зачем нужно: тесты навигации проверяют, что смена чата не оставляет пользователя без поля ввода.
 * Какую продуктовую проблему решает: пользователь всегда должен понимать, куда вводить следующую задачу после действий с чатами.
 */
function activePrompt(webview: Awaited<ReturnType<typeof openAistChat>>) {
  return webview.locator(`textarea[placeholder="${composerPlaceholder}"]:not([readonly])`);
}

test.describe('Фича: Chat / Navigation and workspace controls', () => {
  test(`
    Пользователь создаёт новый чат из composer-панели.

    Задача пользователя: я хочу начать отдельную задачу без ручной очистки старой переписки.

    Зачем это важно: кнопка «Новый чат» находится в главной зоне composer и должна сразу переводить пользователя
    в чистый контекст работы.

    Как тест проверяет решение: тест отправляет сообщение, нажимает «Новый чат» и проверяет пустое состояние нового чата.
  `, async ({ workbench }) => {
    const webview = await openAistChat({ page: workbench });

    await activePrompt(webview).fill('Сообщение перед созданием нового чата.');
    await webview.getByRole('button', { name: 'Отправить сообщение' }).last().click();
    await expect(webview.getByRole('article').getByText('Сообщение перед созданием нового чата.')).toBeVisible();
    await expect(
      webview
        .getByText('Это ответ локальной мок-модели AIST: запрос обработан без внешнего ИИ и сохранён в истории чата.')
        .last()
    ).toBeVisible({ timeout: 60_000 });

    await webview.getByTitle('Новый чат').last().click();

    await expect(activePrompt(webview)).toHaveValue('');
  });

  test(`
    Пользователь открывает список чатов и закрывает его клавишей Escape.

    Задача пользователя: я хочу быстро посмотреть историю чатов и вернуться к активному composer без мыши.

    Зачем это важно: модалка списка чатов не должна блокировать работу, если пользователь передумал переключаться.

    Как тест проверяет решение: тест открывает список, проверяет заголовок и закрывает модалку Escape.
  `, async ({ workbench }) => {
    const webview = await openAistChat({ page: workbench });

    await webview.getByTitle('Открыть чаты').last().click();
    await expect(webview.getByRole('dialog').getByText('Чаты')).toBeVisible();
    await expect(webview.getByText('История скрыта по умолчанию')).toBeVisible();
    await expectAistScreenshot({ webview, name: 'chat-list-modal-open.png' });

    await webview.getByRole('dialog').focus();
    await workbench.keyboard.press('Escape');

    await expect(webview.getByRole('dialog')).toBeHidden();
    await expect(activePrompt(webview)).toBeVisible();
  });

  test(`
    Пользователь видит подтверждение перед удалением чата и может отменить действие.

    Задача пользователя: я хочу быть защищён от случайного удаления истории работы агента.

    Зачем это важно: удаление чата необратимо для пользователя, поэтому UI обязан показать явный второй шаг.

    Как тест проверяет решение: тест открывает список чатов, нажимает удаление у строки и проверяет кнопки подтверждения/отмены.
  `, async ({ workbench }) => {
    const webview = await openAistChat({ page: workbench });

    await webview.getByTitle('Открыть чаты').last().click();
    await webview.getByTitle('Удалить чат').first().click();

    await expect(webview.getByTitle('Подтвердить удаление')).toBeVisible();
    await expect(webview.getByTitle('Отменить удаление')).toBeVisible();

    await webview.getByTitle('Отменить удаление').click();

    await expect(webview.getByTitle('Подтвердить удаление')).toBeHidden();
    await expect(webview.getByRole('dialog').getByText('Чаты')).toBeVisible();
    await webview.getByTitle('Закрыть чаты').click();
    await expect(webview.getByRole('dialog')).toBeHidden();
  });

  test(`
    Пользователь раскрывает VCS-панель текущего workspace.

    Задача пользователя: я хочу видеть ветку и доступные git-действия рядом с composer.

    Зачем это важно: агент часто работает с изменениями в репозитории, поэтому VCS controls должны быть доступны из чата.

    Как тест проверяет решение: тест нажимает кнопку ветки, проверяет floating-панель VCS и основные действия с git.
  `, async ({ workbench }) => {
    const webview = await openAistChat({ page: workbench });

    await webview
      .getByTitle(/Show VCS controls/)
      .last()
      .click();

    await expect(webview.locator('div[aria-label="VCS controls"][aria-hidden="false"]')).toBeVisible();
    await expect(webview.getByTitle('New isolated branch')).toBeVisible();
    await expect(webview.getByTitle('Commit and push -f')).toBeVisible();
    await expect(webview.getByTitle('Merge to main through current agent')).toBeVisible();
    await expectAistScreenshot({ webview, name: 'chat-vcs-controls-open.png' });
  });
});
