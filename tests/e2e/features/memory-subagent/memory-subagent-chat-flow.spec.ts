import { expect, expectAistScreenshot, openFreshAistChat, test } from '../../fixtures';
import { findMemorySubagentRequests } from './utils/findMemorySubagentRequests';
import { findPrimaryChatRequests } from './utils/findPrimaryChatRequests';
import { getMemoryToolPayload } from './utils/getMemoryToolPayload';
import { getMockRequestModel } from './utils/getMockRequestModel';
import { e2eMemoryNote, saveMemoryNoteThroughApproval } from './utils/saveMemoryNoteThroughApproval';
import { submitPrompt } from './utils/submitPrompt';

test.describe('Фича: Memory subagent / Chat flow', () => {
  test(`
    Без отдельной настройки memory-субагент использует модель чата и показывает результат как tool-call.

    Задача пользователя: я сохраняю заметку памяти и отправляю новый запрос, ожидая прозрачный блок памяти в чате.

    Зачем это важно: если отдельная модель memory-субагента не настроена, поведение должно быть понятным —
    помощник использует модель текущего чата, а результат его работы виден как обычный вызов инструмента.

    Как тест проверяет решение: тест сохраняет заметку через approval, запускает новый запрос, проверяет model
    у запроса memory-субагента, раскрывает tool-call «ПАМЯТЬ» и проверяет, что основной model request получил
    synthetic user-approved-memory tool-result.
  `, async ({ workbench, openRouterMock }) => {
    openRouterMock.reset();
    const webview = await openFreshAistChat({ page: workbench });

    await saveMemoryNoteThroughApproval({ webview, screenshotName: 'memory-subagent-save-note-approval.png' });

    openRouterMock.reset();
    await submitPrompt({ webview, text: 'memory subagent fallback e2e: проверь заметку памяти' });

    await expect.poll(() => findMemorySubagentRequests({ requests: openRouterMock.requests }).length).toBe(1);
    await expect.poll(() => findPrimaryChatRequests({ requests: openRouterMock.requests }).length).toBe(1);

    const [memoryRequest] = findMemorySubagentRequests({ requests: openRouterMock.requests });
    expect(getMockRequestModel({ request: memoryRequest })).toBe('openai/gpt-4o-mini');

    const memoryPromptArticle = webview
      .getByRole('article')
      .filter({ hasText: 'memory subagent fallback e2e: проверь заметку памяти' })
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
    await expectAistScreenshot({ webview, name: 'memory-subagent-tool-call-collapsed.png' });

    await memoryArticle.locator('button[aria-expanded]').first().click();
    await expect(memoryArticle.getByText('Применённые заметки памяти')).toBeVisible();
    await expect(memoryArticle.getByText(e2eMemoryNote)).toBeVisible();
    await expectAistScreenshot({ webview, name: 'memory-subagent-tool-call-expanded.png' });

    const [primaryRequest] = findPrimaryChatRequests({ requests: openRouterMock.requests });
    expect(getMemoryToolPayload({ request: primaryRequest })).toContain(e2eMemoryNote);
  });
});
