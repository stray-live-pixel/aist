import { type Frame, type Page, expect } from '@playwright/test';

/**
 * Что это: расширяет левую область VS Code с AIST webview до минимальной ширины через настоящий sash resize.
 * Зачем нужно: screenshots должны сниматься с рабочей шириной webview, а не с узким sidebar, который VS Code ставит по умолчанию.
 */
export async function ensureAistWebviewMinWidth({
  page,
  webview,
  minWidth = 800
}: {
  page: Page;
  webview: Frame;
  minWidth?: number;
}): Promise<void> {
  const currentWidth = await getFrameViewportWidth({ webview });
  if (currentWidth >= minWidth) {
    return;
  }

  const resizeModel = await getSidebarResizeModel({ page, minWidth });
  if (!resizeModel) {
    throw new Error('Не удалось найти VS Code sidebar/sash для расширения AIST webview.');
  }

  await page.mouse.move(resizeModel.sashX, resizeModel.sashY);
  await page.mouse.down();
  await page.mouse.move(resizeModel.targetSashX, resizeModel.sashY, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  await expect
    .poll(() => getFrameViewportWidth({ webview }), {
      message: `AIST webview должен быть не уже ${minWidth}px для screenshot e2e`,
      timeout: 5_000
    })
    .toBeGreaterThanOrEqual(minWidth - 10);
}

async function getFrameViewportWidth({ webview }: { webview: Frame }): Promise<number> {
  return webview.evaluate(() => window.innerWidth).catch(() => 0);
}

async function getSidebarResizeModel({
  page,
  minWidth
}: {
  page: Page;
  minWidth: number;
}): Promise<{ sashX: number; sashY: number; targetSashX: number } | undefined> {
  return page.evaluate(
    ({ targetWidth }) => {
      const sidebar = document.querySelector<HTMLElement>('.part.sidebar');
      const workbench = document.querySelector<HTMLElement>('.monaco-workbench');
      if (!sidebar || !workbench) {
        return undefined;
      }

      const sidebarBox = sidebar.getBoundingClientRect();
      const workbenchBox = workbench.getBoundingClientRect();
      const currentRight = sidebarBox.right;
      const targetRight = Math.min(sidebarBox.left + targetWidth, workbenchBox.right - 360);

      return {
        sashX: currentRight - 2,
        sashY: sidebarBox.top + Math.min(120, sidebarBox.height / 2),
        targetSashX: Math.max(currentRight, targetRight)
      };
    },
    { targetWidth: minWidth }
  );
}
