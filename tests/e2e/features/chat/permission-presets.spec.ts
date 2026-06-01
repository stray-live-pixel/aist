import { expect, expectAistScreenshot, openAistChat, test } from '../../fixtures';
import type { MockModelRequest } from '../../sources/MockModelRequest';

const composerPlaceholder = 'Попросите агента проверить, создать, изменить или удалить файлы проекта...';

/**
 * Что это: находит активное поле prompt в Composer.
 * Зачем нужно: во время анимации отправки в DOM есть read-only копия textarea, а тест должен печатать только в настоящий ввод.
 */
function getComposerPrompt(webview: Awaited<ReturnType<typeof openAistChat>>) {
  return webview.locator(`textarea[placeholder="${composerPlaceholder}"]:not([readonly])`);
}

/**
 * Что это: отправляет prompt через пользовательский shortcut Composer.
 * Зачем нужно: click по кнопке может быть нестабильным из-за анимации, а shortcut является публичным UX-контрактом.
 */
async function submitPrompt(webview: Awaited<ReturnType<typeof openAistChat>>, text: string): Promise<void> {
  const prompt = getComposerPrompt(webview);
  await prompt.fill(text);
  await prompt.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
}

/**
 * Что это: выбирает preset разрешений в Composer.
 * Зачем нужно: e2e проверяет реальный пользовательский путь, а не внутренний config API.
 */
async function selectPermissionPreset(webview: Awaited<ReturnType<typeof openAistChat>>, label: string): Promise<void> {
  const expectedValue = label === 'Быстрое редактирование' ? 'fast-edit' : 'autonomous';
  await webview.getByRole('button', { name: 'Профиль разрешений инструментов' }).click();
  await webview.getByRole('option', { name: label }).click();
  await expect(webview.locator('select[aria-label="Профиль разрешений инструментов"]')).toHaveValue(expectedValue);
}

/**
 * Что это: достает messages из запроса mock-модели.
 * Зачем нужно: комментарий approval должен реально попасть в следующий model request, а не только отобразиться в UI.
 */
function getRequestMessages(request: MockModelRequest | undefined): Array<Record<string, unknown>> {
  const messages = request?.body.messages;
  return Array.isArray(messages) ? (messages as Array<Record<string, unknown>>) : [];
}

test.describe('Фича: Chat / Permission presets', () => {
  test(`
    Fast edit запускает разрешённое редактирование автоматически без approval-модалки.

    Задача пользователя: я выбираю пресет быстрого редактирования и прошу агента создать файл.

    Зачем это важно: fast-edit должен убирать лишние подтверждения для write_file/replace_in_file,
    чтобы быстрые правки не останавливались на каждом безопасном шаге.

    Как тест проверяет решение: тест выбирает preset в Composer, mock-модель вызывает write_file,
    UI не показывает модалку подтверждения, а агент возвращается к финальному ответу после tool result.
  `, async ({ workbench, openRouterMock }) => {
    openRouterMock.reset();
    const webview = await openAistChat({ page: workbench });

    await selectPermissionPreset(webview, 'Быстрое редактирование');
    await submitPrompt(webview, 'e2e fast-edit auto write: создай небольшой файл');

    await expect(webview.getByRole('dialog', { name: 'Требуется подтверждение' })).toBeHidden({ timeout: 5_000 });
    await expect(
      webview
        .getByRole('article')
        .filter({ hasText: 'Агент' })
        .filter({ hasText: 'Инструмент write_file выполнен автоматически по выбранному permission preset.' })
        .last()
    ).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => openRouterMock.requests.length).toBe(2);
    await expectAistScreenshot({ webview, name: 'chat-permission-fast-edit-auto.png' });
  });

  test(`
    Fast edit спрашивает подтверждение для shell-команды и отправляет комментарий пользователя модели.

    Задача пользователя: я выбираю fast-edit, агент просит выполнить shell-команду, а я разрешаю её
    с пояснением, что нужно учесть дальше.

    Зачем это важно: быстрый режим не должен автоматически запускать risky shell, а комментарий approval
    является частью контекста для следующего шага модели.

    Как тест проверяет решение: тест видит approval-модалку с описанием tool call, проверяет кнопки решения,
    вводит комментарий, разрешает tool, затем проверяет следующий mock model request и финальный ответ.
  `, async ({ workbench, openRouterMock }) => {
    openRouterMock.reset();
    const webview = await openAistChat({ page: workbench });

    await selectPermissionPreset(webview, 'Быстрое редактирование');
    await submitPrompt(webview, 'e2e fast-edit approval bash: выполни проверочную команду');

    const approvalDialog = webview.getByRole('dialog', { name: 'Требуется подтверждение' });
    await expect(approvalDialog).toBeVisible({ timeout: 60_000 });
    await expect(approvalDialog.getByText('Агент хочет выполнить инструмент run_bash_script.')).toBeVisible();
    await expect(approvalDialog.getByText('fast-edit должен запросить явное подтверждение пользователя')).toBeVisible();
    await expect(approvalDialog.getByText('printf "approval-ok"')).toBeVisible();
    await expect(approvalDialog.getByRole('button', { name: 'Разрешить' })).toBeVisible();
    await expect(approvalDialog.getByRole('button', { name: 'Остановить агента' })).toBeVisible();
    await expect(approvalDialog.getByRole('button', { name: 'Не разрешать' })).toBeVisible();
    await expectAistScreenshot({ webview, name: 'chat-permission-approval-modal.png' });

    await approvalDialog
      .getByPlaceholder('Что агенту учесть дальше?')
      .fill('E2E комментарий: команду можно выполнить один раз.');
    await approvalDialog.getByRole('button', { name: 'Разрешить' }).click();

    await expect(
      webview
        .getByRole('article')
        .filter({ hasText: 'Агент' })
        .filter({
          hasText: 'Модель получила комментарий пользователя из approval и продолжила работу после run_bash_script.'
        })
        .last()
    ).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => openRouterMock.requests.length).toBe(2);

    const secondRequestMessages = getRequestMessages(openRouterMock.requests[1]);
    const toolMessage = secondRequestMessages.find(
      (message) => message.role === 'tool' && message.tool_call_id === 'call_e2e_bash_approval'
    );
    expect(JSON.stringify(toolMessage)).toContain('E2E комментарий: команду можно выполнить один раз.');
    await expectAistScreenshot({ webview, name: 'chat-permission-approved-comment.png' });
  });

  test(`
    Autonomous запускает shell-команду автоматически без approval-модалки.

    Задача пользователя: я выбираю автономный режим и ожидаю, что агент не будет останавливаться на tool approval.

    Зачем это важно: autonomous — режим без ручного подтверждения, поэтому его правила должны совпадать
    с общим permission preset и применяться в webview flow.

    Как тест проверяет решение: тест выбирает preset в Composer, mock-модель вызывает run_bash_script,
    модалка подтверждения не появляется, а следующий запрос модели приходит после tool result.
  `, async ({ workbench, openRouterMock }) => {
    openRouterMock.reset();
    const webview = await openAistChat({ page: workbench });

    await selectPermissionPreset(webview, 'Автономный');
    await submitPrompt(webview, 'e2e fast-edit approval bash: выполни проверочную команду');

    await expect(webview.getByRole('dialog', { name: 'Требуется подтверждение' })).toBeHidden({ timeout: 5_000 });
    await expect(
      webview.getByText('Инструмент run_bash_script выполнен автоматически по выбранному permission preset.')
    ).toBeVisible({
      timeout: 60_000
    });
    await expect.poll(() => openRouterMock.requests.length).toBe(2);
  });
});
