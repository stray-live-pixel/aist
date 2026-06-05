import { defineConfig } from '@playwright/test';

/**
 * Web e2e на mock adapter.
 *
 * Поднимает общий UI в обычном браузере на in-memory AgentHost (полный фикстур-снапшот AgentState)
 * и проверяет реальные пользовательские сценарии без VS Code и без daemon. Это основная площадка
 * быстрых e2e для общего UI.
 */
export default defineConfig({
  testDir: './tests/web-e2e',
  fullyParallel: true,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4178',
    testIdAttribute: 'data-test-id',
    actionTimeout: 5_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off'
  },
  webServer: {
    command: 'npm run build:web-e2e && node tests/web-e2e/server.mjs',
    url: 'http://127.0.0.1:4178/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium'
      }
    }
  ]
});
