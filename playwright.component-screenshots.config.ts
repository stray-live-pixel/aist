import { defineConfig } from '@playwright/test';

/**
 * Отдельный конфиг нужен, чтобы screenshot-тесты компонентов не запускали VS Code e2e
 * и открывали только статический harness с изолированным компонентом.
 */
export default defineConfig({
  testDir: './tests/component-screenshots',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01
    }
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/component-screenshots' }]],
  use: {
    baseURL: 'http://127.0.0.1:4177',
    actionTimeout: 5_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off'
  },
  webServer: {
    command: 'node tests/component-screenshots/server.mjs',
    url: 'http://127.0.0.1:4177/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
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
