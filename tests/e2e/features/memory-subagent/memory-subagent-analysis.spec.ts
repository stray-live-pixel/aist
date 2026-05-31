import { expect, expectAistScreenshot, openFreshAistChat, test } from '../../fixtures';
import { findMemorySubagentRequests } from './utils/findMemorySubagentRequests';
import { submitPrompt } from './utils/submitPrompt';

test.describe('Фича: Memory subagent / Manual analysis', () => {
  test(`
    После ответа агента пользователь видит кнопку анализа памяти и подтверждает запуск субагента.

    Задача пользователя: я получил ответ в чате и хочу вручную запустить поиск полезных заметок для памяти.

    Зачем это важно: анализ памяти может потребовать отдельный model request, поэтому запуск должен быть явным,
    с понятным подтверждением и видимым результатом в inbox памяти.

    Как тест проверяет решение: тест получает обычный ответ модели, проверяет кнопку анализа рядом с ответом,
    открывает approval-модалку, подтверждает запуск, проверяет mock-запрос memory-субагента и видит кандидата
    на странице настроек памяти.
  `, async ({ workbench, openRouterMock }) => {
    openRouterMock.reset();
    const webview = await openFreshAistChat({ page: workbench });

    await submitPrompt({ webview, text: 'memory analysis e2e: дай ответ, после которого можно найти заметки' });
    await expect(webview.getByText('Это ответ локальной мок-модели AIST')).toBeVisible({ timeout: 60_000 });

    const lastAssistant = webview
      .getByRole('article')
      .filter({ hasText: 'Это ответ локальной мок-модели AIST' })
      .last();
    await expect(lastAssistant.getByTitle('Проанализировать чат для новых заметок памяти')).toBeVisible();
    await expectAistScreenshot({ webview, name: 'memory-subagent-analysis-button-visible.png' });

    await lastAssistant.getByTitle('Проанализировать чат для новых заметок памяти').click();
    const approvalDialog = webview.getByRole('dialog', { name: 'Запуск субагента памяти' });
    await expect(approvalDialog).toBeVisible();
    await expect(approvalDialog.getByText('Запустить субагента памяти?')).toBeVisible();
    await expectAistScreenshot({ webview, name: 'memory-subagent-analysis-approval.png' });

    openRouterMock.reset();
    await approvalDialog.getByRole('button', { name: 'Запустить анализ' }).click();
    await expect.poll(() => findMemorySubagentRequests({ requests: openRouterMock.requests }).length).toBe(1);

    await expect(webview.getByText('Настройки агента')).toBeVisible({ timeout: 60_000 });
    await webview.getByRole('button', { name: 'Память', exact: true }).click();
    await expect(webview.getByText('E2E memory analysis candidate')).toBeVisible({ timeout: 60_000 });
    await expect(webview.getByText('E2E анализ памяти: после изменения UI нужно проверить скриншотами')).toBeVisible();
    await expectAistScreenshot({ webview, name: 'memory-subagent-analysis-candidate.png' });
  });
});
