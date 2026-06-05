import type { AgentHost } from '../../shared/api/AgentHost.types';
import type { HostToUiMessage, PersistedUiState, UiToHostMessage } from '../../shared/api/hostMessages';

type VsCodeApi = {
  postMessage(message: UiToHostMessage): void;
  getState(): PersistedUiState | undefined;
  setState(state: PersistedUiState): void;
};

declare global {
  function acquireVsCodeApi(): VsCodeApi;
}

/**
 * VS Code реализация AgentHost.
 *
 * Оборачивает acquireVsCodeApi() и window 'message': действия уходят через postMessage в extension
 * host, входящие снапшоты/патчи приходят postMessage-ом обратно. Это единственное место в UI,
 * которое знает про VS Code webview API.
 */
export function createVscodeAgentHost(): AgentHost {
  const vscode = acquireVsCodeApi();

  return {
    postMessage(message) {
      vscode.postMessage(message);
    },
    subscribe(listener) {
      const handler = (event: MessageEvent<HostToUiMessage>) => listener(event.data);
      window.addEventListener('message', handler);

      return () => {
        window.removeEventListener('message', handler);
      };
    },
    getPersistedState() {
      return vscode.getState();
    },
    setPersistedState(state) {
      vscode.setState(state);
    }
  };
}
