import { expect, expectAistScreenshot, openAistChat, test } from '../../fixtures';

const composerPlaceholder = 'Попросите агента проверить, создать, изменить или удалить файлы проекта...';

/**
 * Что это: возвращает активное поле composer, которое принимает ввод пользователя.
 * Зачем нужно: во время анимации отправки в DOM может быть read-only копия, поэтому тесты явно работают с живым textarea.
 * Какую продуктовую проблему решает: e2e проверяет реальный пользовательский ввод, а не декоративный слой анимации.
 */
function activePrompt(webview: Awaited<ReturnType<typeof openAistChat>>) {
  return webview.locator(`textarea[placeholder="${composerPlaceholder}"]:not([readonly])`);
}

/**
 * Что это: нажимает основную кнопку отправки рядом с активным composer.
 * Зачем нужно: в webview может быть несколько одноимённых кнопок во время transition, поэтому выбираем доступную кнопку.
 * Какую продуктовую проблему решает: тест не флейкает из-за анимации «улёта» отправленного prompt.
 */
async function sendActivePrompt(webview: Awaited<ReturnType<typeof openAistChat>>) {
  await webview.getByRole('button', { name: 'Отправить сообщение' }).last().click();
}

test.describe('Фича: Chat / Composer interactions', () => {
  test(`
    Пользователь набирает черновик и видит, что кнопка отправки остаётся доступной.

    Задача пользователя: я хочу спокойно подготовить prompt в composer и понимать, что чат готов его принять.

    Зачем это важно: если controlled textarea или кнопка отправки ломаются после загрузки webview,
    пользователь не сможет начать работу даже без обращения к модели.

    Как тест проверяет решение: тест вводит текст в активный composer, проверяет значение поля и доступность отправки.
  `, async ({ workbench }) => {
    const webview = await openAistChat({ page: workbench });
    const prompt = activePrompt(webview);

    await prompt.fill('Черновик задачи: проверь README и предложи улучшения.');

    await expect(prompt).toHaveValue('Черновик задачи: проверь README и предложи улучшения.');
    await expect(webview.getByRole('button', { name: 'Отправить сообщение' }).last()).toBeEnabled();
  });

  test(`
    Пользователь отправляет prompt горячей клавишей Ctrl/Cmd+Enter.

    Задача пользователя: я как разработчик привык отправлять запросы с клавиатуры и не хочу тянуться к мыши.

    Зачем это важно: shortcut указан прямо в composer, поэтому он должен выполнять тот же flow, что и кнопка.

    Как тест проверяет решение: тест фокусирует поле, нажимает системный shortcut и ждёт ответ mock-модели.
  `, async ({ workbench, openRouterMock }) => {
    openRouterMock.reset();
    const webview = await openAistChat({ page: workbench });
    const prompt = activePrompt(webview);

    await prompt.fill('Отправь ответ через горячую клавишу.');
    await prompt.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');

    await expect(webview.getByRole('article').getByText('Отправь ответ через горячую клавишу.')).toBeVisible();
    await expect(
      webview
        .getByText('Это ответ локальной мок-модели AIST: запрос обработан без внешнего ИИ и сохранён в истории чата.')
        .last()
    ).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => openRouterMock.requests.length).toBe(1);
  });

  test(`
    Пользователь открывает историю prompt и возвращает последний запрос в composer.

    Задача пользователя: я хочу быстро повторить или доработать предыдущий prompt без ручного копирования.

    Зачем это важно: история prompt ускоряет итерации, а её поломка выглядит как потеря пользовательского ввода.

    Как тест проверяет решение: тест отправляет prompt, открывает историю, выбирает запись и проверяет, что она подставилась в поле.
  `, async ({ workbench }) => {
    const webview = await openAistChat({ page: workbench });
    const prompt = activePrompt(webview);
    const reusablePrompt = 'История prompt должна вернуть этот текст в composer.';

    await prompt.fill(reusablePrompt);
    await sendActivePrompt(webview);
    await expect(webview.getByRole('article').getByText(reusablePrompt)).toBeVisible();
    await expect(
      webview
        .getByText('Это ответ локальной мок-модели AIST: запрос обработан без внешнего ИИ и сохранён в истории чата.')
        .last()
    ).toBeVisible({ timeout: 60_000 });

    await webview.getByTitle('История prompt').last().click();
    await expect(webview.getByText('Выберите недавний prompt')).toBeVisible();
    await webview.getByRole('button', { name: reusablePrompt }).click();

    await expect(activePrompt(webview)).toHaveValue(reusablePrompt);
  });

  test(`
    Пользователь фильтрует историю prompt по части текста.

    Задача пользователя: я хочу найти нужный старый запрос, когда история уже содержит несколько похожих задач.

    Зачем это важно: без поиска длинная история становится бесполезной и мешает быстрому повтору flow.

    Как тест проверяет решение: тест создаёт две записи, открывает историю, вводит фильтр и видит только подходящий prompt.
  `, async ({ workbench }) => {
    const webview = await openAistChat({ page: workbench });
    const firstPrompt = 'История поиск: проверить документацию.';
    const secondPrompt = 'История поиск: обновить unit-тесты.';

    await activePrompt(webview).fill(firstPrompt);
    await sendActivePrompt(webview);
    await activePrompt(webview).fill(secondPrompt);
    await sendActivePrompt(webview);

    await webview.getByTitle('История prompt').last().click();
    await webview.getByPlaceholder('Поиск по истории...').fill('unit-тесты');

    await expect(webview.getByRole('button', { name: secondPrompt })).toBeVisible();
    await expect(webview.getByRole('button', { name: firstPrompt })).toBeHidden();
    await expectAistScreenshot({ webview, name: 'chat-prompt-history-filtered.png' });
  });

  test(`
    Пользователь отправляет пустой prompt как продолжение диалога.

    Задача пользователя: я хочу нажать отправку без текста и попросить агента продолжить последний ход.

    Зачем это важно: composer обещает continue-сценарий для пустого prompt, а не ошибку в UI.

    Как тест проверяет решение: тест нажимает отправку на пустом composer и ждёт обычный ответ mock-модели.
  `, async ({ workbench, openRouterMock }) => {
    openRouterMock.reset();
    const webview = await openAistChat({ page: workbench });

    const prompt = activePrompt(webview);

    await prompt.fill('');
    await prompt.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');

    await expect(webview.getByText('Агент', { exact: true }).last()).toBeVisible({ timeout: 60_000 });
    await expect(
      webview
        .getByText('Это ответ локальной мок-модели AIST: запрос обработан без внешнего ИИ и сохранён в истории чата.')
        .last()
    ).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => openRouterMock.requests.length).toBe(1);
  });
});
