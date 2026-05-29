import { expect, expectAistScreenshot, openAistChat, test } from '../../fixtures';

test.describe('Фича: Chat / Agent tools visibility', () => {
  test(`
    Агент вызывает инструмент и явно показывает пользователю причину и следующий шаг.

    Задача пользователя: я как оператор ИИ-агента должен понимать, почему агент вызывает инструмент
    и что он собирается делать после результата.

    Зачем это важно: при автономной работе агент может менять проект, поэтому reason и nextStep
    у tool-call являются продуктовым контрактом прозрачности.

    Как тест проверяет решение: тест просит показать файлы, mock-модель возвращает tool-call
    list_files, а UI показывает компактный блок инструментов, раскрываемые Зачем/Дальше и финальный ответ.
  `, async ({ workbench, openRouterMock }) => {
    openRouterMock.reset();
    const webview = await openAistChat({ page: workbench });
    const prompt = webview.locator(
      'textarea[placeholder="Попросите агента проверить, создать, изменить или удалить файлы проекта..."]:not([readonly])'
    );

    await prompt.fill('покажи файлы проекта и объясни результат');
    await webview
      .locator(
        'textarea[placeholder="Попросите агента проверить, создать, изменить или удалить файлы проекта..."]:not([readonly])'
      )
      .locator('xpath=ancestor::div[contains(@aria-expanded, "true") or not(@aria-expanded)][1]')
      .getByRole('button', { name: 'Отправить сообщение' })
      .click();

    const showToolCalls = webview.getByRole('button', { name: 'Показать вызовы инструментов' });
    await expect(showToolCalls).toBeVisible({ timeout: 60_000 });
    await showToolCalls.click();

    await expect(webview.getByText('СПИСОК ФАЙЛОВ')).toBeVisible();
    await expect(webview.getByText('Зачем')).toBeVisible();
    await expect(
      webview.getByText(
        'Нужно увидеть файлы проекта так же, как это сделал бы пользователь при первичной проверке workspace.'
      )
    ).toBeVisible();
    await expect(webview.getByText('Дальше')).toBeVisible();
    await expect(
      webview.getByText('После списка файлов я кратко объясню пользователю, что нашёл в проекте.')
    ).toBeVisible();
    await expect(webview.getByText('README.md')).toBeVisible();
    await expect(
      webview.getByText(
        'Я проверил структуру проекта через list_files. В workspace есть README.md, значит расширение смогло выполнить инструмент и вернуться к финальному ответу без внешней ИИ-модели.'
      )
    ).toBeVisible();
    await expect.poll(() => openRouterMock.requests.length).toBe(2);
    await expectAistScreenshot({ webview, name: 'chat-tool-call-expanded.png' });
  });
});
