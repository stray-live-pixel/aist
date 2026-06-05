import { beforeEach, describe, expect, it } from 'vitest';

import { setAgentHost } from '../../api/agentHost';
import { createMockAgentHost } from '../../api/mock/createMockAgentHost';
import { storyAgentState } from '../../storybook/fixtures';
import { useAgentStore } from '../agentStore';

// Возвращаем store к исходному состоянию между тестами, чтобы переходы проверялись изолированно.
function resetStore() {
  useAgentStore.setState({
    state: null,
    autonomousState: null,
    page: 'chat',
    settingsInitialPage: 'overview',
    autonomousRouteRequest: null,
    autonomousOperation: null,
    errorModal: null,
    autonomousError: null
  });
}

describe('agentStore', () => {
  beforeEach(() => {
    setAgentHost(createMockAgentHost());
    resetStore();
  });

  it('projects a daemon state snapshot from the host', () => {
    useAgentStore.getState().ingest({ type: 'state', ...storyAgentState });

    expect(useAgentStore.getState().state?.activeChat.id).toBe(storyAgentState.activeChat.id);
  });

  it('opens settings on a section and returns to chat', () => {
    useAgentStore.getState().openSettings('vcs');
    expect(useAgentStore.getState().page).toBe('settings');
    expect(useAgentStore.getState().settingsInitialPage).toBe('vcs');

    useAgentStore.getState().closeSettings();
    expect(useAgentStore.getState().page).toBe('chat');
  });

  it('shows and dismisses errors through a single surface', () => {
    useAgentStore.getState().ingest({ type: 'errorModal', message: 'boom' });
    expect(useAgentStore.getState().errorModal).toBe('boom');

    useAgentStore.getState().dismissError();
    expect(useAgentStore.getState().errorModal).toBeNull();
  });

  it('applies a chat patch onto the active chat', () => {
    useAgentStore.getState().ingest({ type: 'state', ...storyAgentState });
    useAgentStore.getState().ingest({
      type: 'chat.patch',
      chatId: storyAgentState.activeChat.id,
      chat: { busy: true }
    });

    expect(useAgentStore.getState().state?.activeChat.busy).toBe(true);
  });

  it('persists the active editor chat through the host', () => {
    const host = createMockAgentHost();
    setAgentHost(host);

    useAgentStore.getState().ingest({ type: 'state', ...storyAgentState, viewKind: 'editor' });

    expect(host.getPersistedState()?.chatId).toBe(storyAgentState.activeChat.id);
  });
});
