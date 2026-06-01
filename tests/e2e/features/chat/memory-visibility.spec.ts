import { expect, expectAistScreenshot, openAistChat, test } from '../../fixtures';
import type { MockModelRequest } from '../../sources/MockModelRequest';
import { findPrimaryChatRequests } from '../memory-subagent/utils/findPrimaryChatRequests';

const composerPlaceholder = 'Попросите агента проверить, создать, изменить или удалить файлы проекта...';
const memoryNote = 'E2E memory visibility: всегда показывать примененную память в чате.';

/**
 * Что это: находит активное поле prompt в Composer.
 * Зачем нужно: во время анимаций в DOM может быть readonly-копия textarea, а тест должен работать с реальным вводом.
 */
function getComposerPrompt(webview: Awaited<ReturnType<typeof openAistChat>>) {
  return webview.locator(`textarea[placeholder="${composerPlaceholder}"]:not([readonly])`);
}

/**
 * Что это: отправляет пользовательский prompt через публичный shortcut Composer.
 * Зачем нужно: shortcut стабильнее клика по кнопке, когда Composer анимируется или меняет состояние busy.
 */
async function submitPrompt(webview: Awaited<ReturnType<typeof openAistChat>>, text: string): Promise<void> {
  const prompt = getComposerPrompt(webview);
  await prompt.fill(text);
  await prompt.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
}

/**
 * Что это: выбирает permission preset в Composer.
 * Зачем нужно: память сохраняется через approval flow, поэтому тест должен попасть в реальный пользовательский путь подтверждения.
 */
async function selectPermissionPreset(webview: Awaited<ReturnType<typeof openAistChat>>, label: string): Promise<void> {
  await webview.getByRole('button', { name: 'Профиль разрешений инструментов' }).click();
  await webview.getByRole('option', { name: label }).click();
}

/**
 * Что это: достает model messages из запроса локальному mock.
 * Зачем нужно: e2e должен доказать не только UI-карточку, но и реальную отправку memory tool-result модели.
 */
function getRequestMessages(request: MockModelRequest | undefined): Array<Record<string, unknown>> {
  const messages = request?.body.messages;
  return Array.isArray(messages) ? (messages as Array<Record<string, unknown>>) : [];
}

test.describe('Фича: Chat / Memory visibility', () => {
  test(`
    Примененная память явно показывается в чате как tool-call.

    Задача пользователя: я сохраняю проектную заметку памяти через approval и ожидаю, что в следующем запросе
    агент явно покажет, что эта память была применена.

    Зачем это важно: память меняет контекст модели, поэтому пользователь должен видеть не скрытую магию,
    а прозрачный блок с конкретными заметками, которые влияют на текущий ответ.

    Как тест проверяет решение: тест сохраняет memory note через поле «Запомнить для проекта», отправляет
    следующий prompt, проверяет карточку ПАМЯТЬ в чате и убеждается, что model request получил synthetic
    get_relevant_memory tool-result после user prompt.
  `, async ({ workbench, openRouterMock }) => {
    openRouterMock.reset();
    const webview = await openAistChat({ page: workbench });

    await selectPermissionPreset(webview, 'Быстрое редактирование');
    await submitPrompt(webview, 'e2e fast-edit approval bash: сохрани заметку памяти через approval');

    const approvalDialog = webview.getByRole('dialog', { name: 'Требуется подтверждение' });
    await expect(approvalDialog).toBeVisible({ timeout: 60_000 });
    await approvalDialog.getByPlaceholder('Урок или предпочтение для этого проекта...').fill(memoryNote);
    await expectAistScreenshot({ webview, name: 'chat-memory-approval-note-filled.png' });
    await approvalDialog.getByRole('button', { name: 'Разрешить' }).click();

    await expect(
      webview
        .getByRole('article')
        .filter({ hasText: 'Агент' })
        .filter({ hasText: 'Инструмент run_bash_script выполнен автоматически' })
        .last()
    ).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => openRouterMock.requests.length).toBe(2);

    openRouterMock.reset();
    await submitPrompt(webview, 'memory visibility e2e: проверь, что сохраненная память применяется');

    const memoryPromptArticle = webview
      .getByRole('article')
      .filter({ hasText: 'memory visibility e2e: проверь, что сохраненная память применяется' })
      .last();
    const memoryToolGroup = memoryPromptArticle
      .locator('xpath=ancestor::div[1]/following-sibling::div[1]//article')
      .first();
    await expect(memoryToolGroup.getByRole('button', { name: 'Показать вызовы инструментов' })).toBeVisible({
      timeout: 60_000
    });
    await memoryToolGroup.getByRole('button', { name: 'Показать вызовы инструментов' }).click();

    const memoryArticle = memoryToolGroup.getByRole('article').filter({ hasText: 'ПАМЯТЬ' }).last();
    await expect(memoryArticle).toBeVisible({ timeout: 60_000 });
    await expect(memoryArticle.getByText('релевантные заметки')).toBeVisible();
    await expectAistScreenshot({ webview, name: 'chat-memory-tool-collapsed.png' });
    await memoryArticle.locator('button[aria-expanded]').first().click();
    await expect(memoryArticle.getByText('Применённые заметки памяти')).toBeVisible();
    await expect(memoryArticle.getByText(memoryNote)).toBeVisible();
    await expectAistScreenshot({ webview, name: 'chat-memory-tool-expanded.png' });

    await expect.poll(() => findPrimaryChatRequests({ requests: openRouterMock.requests }).length).toBe(1);
    const [primaryChatRequest] = findPrimaryChatRequests({ requests: openRouterMock.requests });
    const firstMemoryRequestMessages = getRequestMessages(primaryChatRequest);
    const userMessageIndex = firstMemoryRequestMessages.findIndex(
      (message) => message.role === 'user' && String(message.content || '').includes('memory visibility e2e')
    );
    const memoryToolMessageIndex = firstMemoryRequestMessages.findIndex(
      (message) => message.role === 'tool' && String(message.content || '').includes('user-approved-memory')
    );

    expect(userMessageIndex).toBeGreaterThanOrEqual(0);
    expect(memoryToolMessageIndex).toBeGreaterThan(userMessageIndex);
    expect(JSON.stringify(firstMemoryRequestMessages[memoryToolMessageIndex])).toContain(memoryNote);
  });
});
