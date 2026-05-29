import { type Frame, type Page } from '@playwright/test';

/**
 * Что это: ищет webview frame по видимому тексту.
 * Зачем нужно: VS Code webview живет в отдельном iframe, и пользовательские проверки должны работать внутри него.
 */
export async function findFrameByText({
  page,
  text,
  timeout = 60_000
}: {
  page: Page;
  text: string;
  timeout?: number;
}): Promise<Frame> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      if (frame.isDetached()) {
        continue;
      }

      const match = frame.getByText(text, { exact: true }).first();
      if ((await match.count().catch(() => 0)) > 0 && (await match.isVisible().catch(() => false))) {
        return frame;
      }
    }

    await page.waitForTimeout(250);
  }

  throw new Error(`Could not find a frame containing text: ${text}`);
}
