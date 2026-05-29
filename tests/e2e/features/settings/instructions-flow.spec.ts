import { type Frame } from '@playwright/test';

import { expect, expectAistScreenshot, openAistChat, openAistSettings, test } from '../../fixtures';
import { getSystemPromptFromMockRequest } from '../../sources/getSystemPromptFromMockRequest';

const composerPlaceholder = 'Попросите агента проверить, создать, изменить или удалить файлы проекта...';
const instructionLabel = 'E2E правило применения инструкций';
const instructionContent =
  'E2E_APPLIED_INSTRUCTION_MARKER: если пользователь спрашивает про инструкции, обязательно учитывай это правило.';

/**
 * Что это: открывает конкретный раздел настроек через sidebar.
 * Зачем нужно: тест инструкций проходит реальный пользовательский путь между библиотекой локальных инструкций и активным набором.
 * Какую продуктовую проблему решает: проверяем не только форму, но и навигацию, через которую пользователь реально включает правила агента.
 */
async function openSettingsSection({ webview, label, heading }: { webview: Frame; label: string; heading: string }) {
  await webview.getByRole('button', { name: label, exact: true }).click();
  await expect(webview.locator('h1').filter({ hasText: heading })).toBeVisible();
}

/**
 * Что это: возвращает активное поле composer чата.
 * Зачем нужно: после выхода из настроек тест отправляет prompt тем же способом, что и пользователь.
 * Какую продуктовую проблему решает: подтверждает, что применённая инструкция влияет на следующий реальный запрос модели.
 */
function activePrompt(webview: Frame) {
  return webview.locator(`textarea[placeholder="${composerPlaceholder}"]:not([readonly])`);
}

test.describe('Фича: Settings / Instructions flow', () => {
  test(`
    Пользователь добавляет локальную инструкцию, сохраняет её, включает в активный набор и инструкция уходит модели.

    Задача пользователя: я хочу добавить правило поведения агента в настройках и быть уверенным, что следующий запрос
    действительно отправится модели с этим правилом в system prompt.

    Зачем это важно: видимая галочка в настройках бесполезна, если инструкция не попадает в daemon/model request;
    это главный регрессионный риск prompt-настроек.

    Как тест проверяет решение: тест создаёт локальную инструкцию через UI, сохраняет её, включает в активных инструкциях,
    отправляет prompt в чат и проверяет OpenRouter mock request на наличие текста инструкции в system prompt.
  `, async ({ workbench, openRouterMock }) => {
    openRouterMock.reset();
    const settings = await openAistSettings({ page: workbench });

    await openSettingsSection({ webview: settings, label: 'Инструкции', heading: 'Инструкции' });
    await settings.getByRole('tab', { name: 'Проектные инструкции' }).click();
    await settings.getByRole('button', { name: 'Добавить инструкцию' }).click();

    await settings.getByLabel('Название').fill(instructionLabel);
    await settings.getByLabel('Текст инструкции').fill(instructionContent);
    await settings.getByRole('button', { name: 'Сохранить' }).click();

    await expect(settings.getByText(instructionLabel).first()).toBeVisible();
    await expect(settings.getByText(instructionContent).first()).toBeVisible();
    await expectAistScreenshot({ webview: settings, name: 'settings-instruction-saved.png' });

    await settings.getByRole('tab', { name: 'Активные инструкции' }).click();
    await expect(settings.getByText('Что получит агент сейчас')).toBeVisible();
    await settings.getByLabel(`Проектный · ${instructionLabel}`).check();
    await expect(settings.getByText('Есть неприменённые изменения')).toBeVisible();
    await settings.getByRole('button', { name: 'Применить набор' }).click();
    await expect(settings.getByText('Применено').first()).toBeVisible();
    await expectAistScreenshot({ webview: settings, name: 'settings-instruction-active.png' });

    await settings.getByTitle('Назад к чату').click();
    const chat = await openAistChat({ page: workbench });
    const prompt = activePrompt(chat);

    await prompt.fill('Проверь, применяются ли пользовательские инструкции.');
    await prompt.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');

    await expect(
      chat
        .getByText('Это ответ локальной мок-модели AIST: запрос обработан без внешнего ИИ и сохранён в истории чата.')
        .last()
    ).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => openRouterMock.requests.length).toBe(1);

    const systemPrompt = getSystemPromptFromMockRequest({ request: openRouterMock.requests[0] });
    expect(systemPrompt).toContain(instructionLabel);
    expect(systemPrompt).toContain(instructionContent);

    const settingsAfterAsk = await openAistSettings({ page: workbench });
    await openSettingsSection({ webview: settingsAfterAsk, label: 'Инструкции', heading: 'Инструкции' });
    await settingsAfterAsk.getByRole('tab', { name: 'Проектные инструкции' }).click();
    await settingsAfterAsk
      .locator('section')
      .filter({ has: settingsAfterAsk.getByRole('heading', { name: instructionLabel }) })
      .getByRole('button', { name: 'Удалить' })
      .click();
    await expect(settingsAfterAsk.getByText(instructionLabel)).toBeHidden();
  });
});
