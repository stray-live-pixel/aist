import { type Page, test as base, expect } from '@playwright/test';

import type { OpenRouterMock } from './sources/OpenRouterMock';
import type { VscodeWorkbenchSession } from './sources/VscodeWorkbenchSession';
import { closeVscodeWorkbench } from './sources/closeVscodeWorkbench';
import { expectAistScreenshot } from './sources/expectAistScreenshot';
import { findFrameByText } from './sources/findFrameByText';
import { launchVscodeWorkbench } from './sources/launchVscodeWorkbench';
import { openAistChat } from './sources/openAistChat';
import { openAistSettings } from './sources/openAistSettings';
import { openFreshAistChat } from './sources/openFreshAistChat';
import { runCommand } from './sources/runCommand';
import { startOpenRouterMock } from './sources/startOpenRouterMock';
import { stopOpenRouterMock } from './sources/stopOpenRouterMock';

type TestFixtures = {
  workbench: Page;
};

type WorkerFixtures = {
  openRouterMock: OpenRouterMock;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
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
  workbench: async ({ openRouterMock }, use) => {
    let session: VscodeWorkbenchSession | undefined;

    try {
      session = await launchVscodeWorkbench({ openRouterEndpoint: openRouterMock.endpoint });
      await use(session.page);
    } finally {
      await closeVscodeWorkbench({ session });
    }
  }
});

export { expect, expectAistScreenshot, findFrameByText, openAistChat, openAistSettings, openFreshAistChat, runCommand };
export type { OpenRouterMock };
