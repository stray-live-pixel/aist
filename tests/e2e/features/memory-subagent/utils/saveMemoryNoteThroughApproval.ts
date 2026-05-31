import type { Frame } from '@playwright/test';

import { expect, expectAistScreenshot } from '../../../fixtures';
import { submitPrompt } from './submitPrompt';

export const e2eMemoryNote =
  'E2E memory subagent note: использовать заметку памяти только для проверки memory subagent.';

/**
 * Что это: сохраняет проектную заметку памяти через реальное approval-окно.
 * Зачем нужно: e2e подготавливает память пользовательским путём, а не внутренним API приложения.
 */
export async function saveMemoryNoteThroughApproval({
  webview,
  screenshotName
}: {
  webview: Frame;
  screenshotName?: string;
}): Promise<void> {
  await webview.getByRole('button', { name: 'Профиль разрешений инструментов' }).click();
  await webview.getByRole('option', { name: 'Быстрое редактирование' }).click();
  await submitPrompt({ webview, text: 'e2e fast-edit approval bash: сохрани заметку для memory subagent' });

  const approvalDialog = webview.getByRole('dialog', { name: 'Требуется подтверждение' });
  await expect(approvalDialog).toBeVisible({ timeout: 60_000 });
  await approvalDialog.getByPlaceholder('Урок или предпочтение для этого проекта...').fill(e2eMemoryNote);
  if (screenshotName) {
    await expectAistScreenshot({ webview, name: screenshotName });
  }
  await approvalDialog.getByRole('button', { name: 'Разрешить' }).click();

  await expect(
    webview
      .getByRole('article')
      .filter({ hasText: 'Агент' })
      .filter({ hasText: 'Инструмент run_bash_script выполнен автоматически' })
      .last()
  ).toBeVisible({ timeout: 60_000 });
}
