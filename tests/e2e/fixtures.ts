import { type Page, test as base, expect } from '@playwright/test';

import type { OpenRouterMock } from './sources/OpenRouterMock';
import type { VscodeWorkbenchSession } from './sources/VscodeWorkbenchSession';
import { closeVscodeWorkbench } from './sources/closeVscodeWorkbench';
import { expectAistScreenshot } from './sources/expectAistScreenshot';
import { findFrameByText } from './sources/findFrameByText';
import { launchVscodeWorkbench } from './sources/launchVscodeWorkbench';
import { openAistChat } from './sources/openAistChat';
import { runCommand } from './sources/runCommand';
import { startOpenRouterMock } from './sources/startOpenRouterMock';
import { stopOpenRouterMock } from './sources/stopOpenRouterMock';

type WorkerFixtures = {
  openRouterMock: OpenRouterMock;
  workbench: Page;
};

export const test = base.extend<{}, WorkerFixtures>({
  openRouterMock: [
    async ({}, use) => {
      const mock = await startOpenRouterMock();

      try {
        await use(mock);
      } finally {
        await stopOpenRouterMock({ mock });
      }
    },
    { scope: 'worker', timeout: 30_000 }
  ],
  workbench: [
    async ({ openRouterMock }, use) => {
      let session: VscodeWorkbenchSession | undefined;

      try {
        session = await launchVscodeWorkbench({ openRouterEndpoint: openRouterMock.endpoint });
        await use(session.page);
      } finally {
        await closeVscodeWorkbench({ session });
      }
    },
    { scope: 'worker', timeout: 120_000 }
  ]
});

export { expect, expectAistScreenshot, findFrameByText, openAistChat, runCommand };
export type { OpenRouterMock };
