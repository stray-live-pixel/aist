import { type Frame, type Page } from '@playwright/test';

/**
 * Что это: ищет webview frame по placeholder поля ввода.
 * Зачем нужно: AIST chat может быть пустым или уже содержать сообщения, но composer остаётся стабильной точкой входа пользователя.
 */
export async function findFrameByPlaceholder({
  page,
  placeholder,
  timeout = 60_000
}: {
  page: Page;
  placeholder: string;
  timeout?: number;
}): Promise<Frame> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (page.isClosed()) {
      throw new Error(
        `Could not find AIST webview: VS Code page was closed while waiting for placeholder: ${placeholder}`
      );
    }

    for (const frame of page.frames()) {
      if (frame.isDetached()) {
        continue;
      }

      const match = frame.getByPlaceholder(placeholder).first();
      if ((await match.count().catch(() => 0)) > 0 && (await match.isVisible().catch(() => false))) {
        return frame;
      }
    }

    await delay(250);
  }

  throw new Error(`Could not find a frame containing placeholder: ${placeholder}`);
}

/**
 * Что это: задержка polling без привязки к живому Playwright Page.
 * Зачем нужно: если VS Code page закрылась, helper должен сам дать понятную ошибку на следующей итерации.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
