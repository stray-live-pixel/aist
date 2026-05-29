import { type Frame } from '@playwright/test';

import { expect, expectAistScreenshot, openAistSettings, test } from '../../fixtures';

type SettingsPageScenario = {
  /** Название пункта в sidebar, по которому пользователь переходит на страницу. */
  navLabel: string;
  /** Заголовок страницы, который подтверждает успешный переход. */
  heading: string;
  /** Уникальный текст страницы, который защищает тест от пустого или неверного контента. */
  expectedText: string;
  /** Имя screenshot snapshot для конкретной страницы настроек. */
  screenshotName: string;
};

const settingsPages: SettingsPageScenario[] = [
  {
    navLabel: 'Обзор',
    heading: 'Обзор',
    expectedText: 'Текущий профиль агента',
    screenshotName: 'settings-overview.png'
  },
  {
    navLabel: 'Разрешения',
    heading: 'Разрешения',
    expectedText: 'Профили разрешений',
    screenshotName: 'settings-permissions.png'
  },
  {
    navLabel: 'Провайдеры',
    heading: 'Провайдеры',
    expectedText: 'Профили провайдеров',
    screenshotName: 'settings-providers.png'
  },
  {
    navLabel: 'Уведомления',
    heading: 'Уведомления',
    expectedText: 'Уведомления о подтверждении',
    screenshotName: 'settings-notifications.png'
  },
  {
    navLabel: 'Телеметрия',
    heading: 'Телеметрия',
    expectedText: 'Локальные метрики для сравнения изменений prompt и tools.',
    screenshotName: 'settings-telemetry.png'
  },
  {
    navLabel: 'Сжатие',
    heading: 'Сжатие',
    expectedText: 'Сжатие контекста',
    screenshotName: 'settings-compaction.png'
  },
  {
    navLabel: 'Система',
    heading: 'Система',
    expectedText: 'Управляет ответами агента, объяснениями tool-call и языком интерфейса расширения.',
    screenshotName: 'settings-system.png'
  },
  {
    navLabel: 'Навыки',
    heading: 'Навыки',
    expectedText: 'Пользовательские навыки',
    screenshotName: 'settings-skills.png'
  },
  {
    navLabel: 'Роли',
    heading: 'Роли',
    expectedText: 'Роль — основной системный образ агента.',
    screenshotName: 'settings-roles.png'
  },
  {
    navLabel: 'Инструкции',
    heading: 'Инструкции',
    expectedText: 'Соберите активный набор дополнительных правил',
    screenshotName: 'settings-instructions.png'
  },
  {
    navLabel: 'Пресеты',
    heading: 'Пресеты',
    expectedText: 'Активный пресет',
    screenshotName: 'settings-presets.png'
  },
  {
    navLabel: 'Память',
    heading: 'Память',
    expectedText: 'Заметки, явно сохранённые из approval prompt.',
    screenshotName: 'settings-memory.png'
  }
];

/**
 * Что это: открывает нужный раздел настроек через sidebar и проверяет, что страница действительно сменилась.
 * Зачем нужно: каждый screenshot должен фиксировать конкретный раздел, а не случайно оставшийся предыдущий экран.
 * Какую продуктовую проблему решает: тест ловит поломки навигации настроек и пустые страницы до визуального сравнения.
 */
async function openSettingsPage({
  webview,
  scenario
}: {
  webview: Frame;
  scenario: SettingsPageScenario;
}): Promise<void> {
  await webview.getByRole('button', { name: scenario.navLabel, exact: true }).click();
  await expect(webview.locator('h1').filter({ hasText: scenario.heading })).toBeVisible();
  await expect(webview.getByText(scenario.expectedText).first()).toBeVisible();
}

test.describe('Фича: Settings / Pages snapshots', () => {
  test(`
    Пользователь проходит все страницы настроек и видит стабильный интерфейс каждого раздела.

    Задача пользователя: я как оператор AIST хочу открыть настройки и проверить, что каждый раздел доступен,
    содержит ожидаемый контент и визуально не сломан.

    Зачем это важно: настройки управляют моделями, правами инструментов, памятью, навыками и системным поведением агента,
    поэтому регрессия любой страницы может заблокировать рабочий процесс без ошибки в chat flow.

    Как тест проверяет решение: тест открывает настройки из реального webview, переключает все пункты sidebar,
    проверяет заголовок и уникальный текст страницы, затем делает screenshot каждого раздела.
  `, async ({ workbench }) => {
    const webview = await openAistSettings({ page: workbench });

    for (const scenario of settingsPages) {
      await openSettingsPage({ webview, scenario });
      await expectAistScreenshot({ webview, name: scenario.screenshotName });
    }
  });
});
