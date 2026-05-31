import { type Frame } from '@playwright/test';

import { expect, expectAistScreenshot, openAistSettings, test } from '../../fixtures';

const openRouterApiKey = 'sk-or-e2e-provider-profile-key';

/**
 * Что это: открывает страницу Providers внутри Settings.
 * Зачем нужно: тест проверяет пользовательский путь через sidebar, а не прямое изменение React state.
 * Какую продуктовую проблему решает: если навигация настроек сломается, сценарий ввода ключа не даст ложноположительный результат.
 */
async function openProvidersSettingsPage({ webview }: { webview: Frame }): Promise<void> {
  await webview.getByRole('button', { name: 'Провайдеры', exact: true }).click();
  await expect(webview.locator('h1').filter({ hasText: 'Провайдеры' })).toBeVisible();
  await expect(webview.getByText('Профили провайдеров').first()).toBeVisible();
}

test.describe('Фича: Settings / Provider API key', () => {
  test(`
    Пользователь вводит API key для OpenRouter provider profile и может проверить его через кнопку показа.

    Задача пользователя: я как оператор AIST хочу задать OpenRouter API key прямо в webview настройках
    конкретного provider profile, чтобы не настраивать shell env или CLI вручную.

    Зачем это важно: у разных OpenRouter профилей могут быть разные аккаунты и лимиты, поэтому UI должен сохранять
    ключ профиля отдельно и давать безопасную проверку введённого значения перед сохранением.

    Как тест проверяет решение: тест открывает Settings → Providers в реальном VS Code webview, вводит ключ в password-поле,
    проверяет скрытое состояние, нажимает кнопку показа, убеждается что input стал text и делает screenshot панели.
  `, async ({ workbench }) => {
    const webview = await openAistSettings({ page: workbench });
    await openProvidersSettingsPage({ webview });

    const apiKeyField = webview.getByLabel('API key').first();
    await expect(apiKeyField).toBeVisible();
    await expect(apiKeyField).toHaveAttribute('type', 'password');

    await apiKeyField.fill(openRouterApiKey);
    await expect(apiKeyField).toHaveValue(openRouterApiKey);
    await expect(apiKeyField).toHaveAttribute('type', 'password');

    await webview.getByRole('button', { name: 'Показать API key' }).first().click();
    await expect(apiKeyField).toHaveAttribute('type', 'text');
    await expect(apiKeyField).toHaveValue(openRouterApiKey);
    await expect(webview.getByRole('button', { name: 'Скрыть API key' }).first()).toBeVisible();

    await expectAistScreenshot({ webview, name: 'settings-provider-api-key-entered.png' });
  });
});
