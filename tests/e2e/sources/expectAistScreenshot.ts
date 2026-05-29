import { type Frame, expect } from '@playwright/test';

/**
 * Что это: делает стабильную screenshot-проверку видимой области AIST webview.
 * Зачем нужно: user flow e2e должен подсвечивать не только поломку логики, но и неожиданные изменения ключевого интерфейса.
 */
export async function expectAistScreenshot({ webview, name }: { webview: Frame; name: string }): Promise<void> {
  await expect
    .poll(() => webview.evaluate(() => window.innerWidth), {
      message: 'AIST screenshot должен сниматься при ширине webview около 800px',
      timeout: 5_000
    })
    .toBeGreaterThanOrEqual(790);

  await expect(webview.locator('body')).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.02,
    mask: [webview.locator('strong').filter({ hasText: /\d{2}:\d{2}:\d{2}/ })]
  });
}
