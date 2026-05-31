import { expect, expectAistScreenshot, openAistChat, openAistSettings, test } from '../../fixtures';
import { findMemorySubagentRequests } from './utils/findMemorySubagentRequests';
import { getMockRequestModel } from './utils/getMockRequestModel';
import { saveMemoryNoteThroughApproval } from './utils/saveMemoryNoteThroughApproval';
import { selectByLabel } from './utils/selectByLabel';
import { submitPrompt } from './utils/submitPrompt';

test.describe('Фича: Memory subagent / Settings', () => {
  test(`
    Пользователь настраивает отдельную модель memory-субагента и видит её в реальном mock-запросе.

    Задача пользователя: я хочу открыть настройки, выбрать специальную модель для субагента памяти
    и убедиться, что именно она используется при подборе заметок.

    Зачем это важно: memory-субагент должен быть независимым помощником с собственной моделью,
    а не всегда тратить основную модель чата.

    Как тест проверяет решение: тест открывает страницу «Память», видит блок «Субагент памяти», выбирает модель,
    сохраняет заметку памяти через approval, отправляет запрос и проверяет поле model в запросе memory-субагента
    на локальном OpenRouter mock.
  `, async ({ workbench, openRouterMock }) => {
    openRouterMock.reset();
    const settings = await openAistSettings({ page: workbench });

    await settings.getByRole('button', { name: 'Память', exact: true }).click();
    await expect(settings.getByText('Субагент памяти')).toBeVisible();
    await expect(settings.getByText('Модель субагента памяти')).toBeVisible();
    await expectAistScreenshot({ webview: settings, name: 'memory-subagent-memory-settings-default.png' });

    await selectByLabel({
      webview: settings,
      label: 'Модель субагента памяти',
      optionName: 'GPT-4o mini (openai/gpt-4o-mini)'
    });
    await expectAistScreenshot({ webview: settings, name: 'memory-subagent-memory-settings-specific-model.png' });

    const chat = await openAistChat({ page: workbench });
    await saveMemoryNoteThroughApproval({ webview: chat });

    openRouterMock.reset();
    await submitPrompt({ webview: chat, text: 'memory subagent e2e: используй сохраненную заметку памяти' });

    await expect.poll(() => findMemorySubagentRequests({ requests: openRouterMock.requests }).length).toBe(1);
    const [memoryRequest] = findMemorySubagentRequests({ requests: openRouterMock.requests });
    expect(getMockRequestModel({ request: memoryRequest })).toBe('openai/gpt-4o-mini');
  });
});
