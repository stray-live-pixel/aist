import { type Frame, expect } from '@playwright/test';

const AIST_SCREENSHOT_WIDTH = 800;
const AIST_SCREENSHOT_SETTLE_MS = 500;

/**
 * Что это: делает стабильную screenshot-проверку видимой области AIST webview.
 * Зачем нужно: user flow e2e должен подсвечивать не только поломку логики, но и неожиданные изменения ключевого интерфейса.
 */
export async function expectAistScreenshot({ webview, name }: { webview: Frame; name: string }): Promise<void> {
  await expect
    .poll(() => webview.evaluate(() => window.innerWidth), {
      message: `AIST webview должен быть не уже ${AIST_SCREENSHOT_WIDTH}px перед screenshot`,
      timeout: 5_000
    })
    .toBeGreaterThanOrEqual(AIST_SCREENSHOT_WIDTH);

  await setScreenshotViewportWidth({ webview, width: AIST_SCREENSHOT_WIDTH });

  // Даем VS Code webview и React layout спокойно завершить перерасчет после навигации или resize.
  await webview.waitForTimeout(AIST_SCREENSHOT_SETTLE_MS);

  await expect(webview.locator('body')).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.02,
    mask: [webview.locator('strong').filter({ hasText: /\d{2}:\d{2}:\d{2}/ })]
  });

  await resetScreenshotViewportWidth({ webview });
}

/**
 * Что это: фиксирует ширину документа webview для screenshot-сравнения.
 * Зачем нужно: VS Code sash нельзя стабильно выставить ровно в 800px, но сам снимок должен иметь один layout.
 */
async function setScreenshotViewportWidth({ webview, width }: { webview: Frame; width: number }): Promise<void> {
  await webview.evaluate((targetWidth) => {
    const html = document.documentElement;
    const body = document.body;
    html.dataset.aistScreenshotWidth = String(targetWidth);
    html.style.width = `${targetWidth}px`;
    html.style.maxWidth = `${targetWidth}px`;
    body.style.width = `${targetWidth}px`;
    body.style.maxWidth = `${targetWidth}px`;
    body.style.marginLeft = '0';
    body.style.marginRight = '0';
  }, width);
}

/**
 * Что это: снимает временную фиксацию ширины после screenshot.
 * Зачем нужно: дальнейшие пользовательские действия в этом же test должны снова видеть обычный responsive webview.
 */
async function resetScreenshotViewportWidth({ webview }: { webview: Frame }): Promise<void> {
  await webview.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    delete html.dataset.aistScreenshotWidth;
    html.style.width = '';
    html.style.maxWidth = '';
    body.style.width = '';
    body.style.maxWidth = '';
    body.style.marginLeft = '';
    body.style.marginRight = '';
  });
}
