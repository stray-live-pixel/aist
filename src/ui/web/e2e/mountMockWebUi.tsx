import { setAgentHost } from '../../shared/api/agentHost';
import { createMockAgentHost } from '../../shared/api/mock/createMockAgentHost';
import { mountApp } from '../../shared/app/mountApp';
import { storyAgentState } from '../../shared/storybook/fixtures';

/**
 * Mock web entry для web e2e и локального превью.
 *
 * Поднимает общий UI в обычном браузере на in-memory AgentHost с полным фикстур-снапшотом
 * AgentState. Не ходит в сеть и не требует daemon: Playwright проверяет реальные пользовательские
 * сценарии общего UI (формы, состояния, навигация) на стабильных данных.
 */
setAgentHost(
  createMockAgentHost({
    initialMessages: [{ type: 'state', ...storyAgentState }]
  })
);

mountApp();
