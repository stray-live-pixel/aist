import type { Browser, Page } from '@playwright/test';
import type { ChildProcess } from 'node:child_process';

/**
 * Что это: активная e2e-сессия реального VS Code workbench.
 * Зачем нужно: fixture должна отдать тестам Page и гарантированно очистить browser, процесс и временные директории.
 */
export type VscodeWorkbenchSession = {
  browser: Browser;
  page: Page;
  process: ChildProcess;
  tmpRoot: string;
  userDataDir: string;
};
