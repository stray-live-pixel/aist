import { VscodeCodexLoginAdapter } from '../../codex/vscodeLogin';
import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';

/** Что это: login ChatGPT Codex; зачем нужно: Codex transport требует auth session; проблема: пользователь может включить Codex из UI. */
export async function loginCodex({
  state,
  callbacks
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
}): Promise<void> {
  await new VscodeCodexLoginAdapter(state.codexAuthProvider, state.logger).login();
  await refreshCodexAuthState({ state, callbacks });
  callbacks.sendState();
}

/** Что это: logout ChatGPT Codex; зачем нужно: пользователь может сбросить auth session; проблема: UI отражает актуальный auth state. */
export async function logoutCodex({
  state,
  callbacks
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
}): Promise<void> {
  await new VscodeCodexLoginAdapter(state.codexAuthProvider, state.logger).logout();
  await refreshCodexAuthState({ state, callbacks });
  callbacks.sendState();
}

/** Что это: refresh Codex auth state; зачем нужно: statePresenter показывает доступность Codex; проблема: UI не предлагает недоступный auth-dependent запуск. */
export async function refreshCodexAuthState({
  state,
  callbacks
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
}): Promise<void> {
  try {
    state.codexAuthenticated = await state.codexAuthProvider.isAuthenticated();
    callbacks.sendState();
  } catch (error) {
    state.codexAuthenticated = false;
    state.logger.error('Failed to read ChatGPT Codex auth state', error);
  }
}
