import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { getAgentHost } from '../api/agentHost';
import type { HostToUiMessage } from '../api/hostMessages';
import { translate } from '../i18n';
import { applyAgentPatch } from '../lib/agentPatches';
import type { SettingsPageId } from '../pages/permissions/permissions-page/types';
import type { AgentState, AutonomousState } from '../types';

export type UiPage = 'chat' | 'settings' | 'autonomous';

export type AutonomousRouteRequest = { route: 'flows'; nonce: number };

export type AutonomousOperation = {
  operation: 'deleteFlow';
  flowId: string;
  status: 'done' | 'cancelled' | 'error';
  nonce: number;
};

/**
 * Общий UI store (Zustand + devtools).
 *
 * Держит projection daemon-состояния, выбранную страницу, autonomous-состояние и единый error
 * surface. Истина остаётся в daemon: store только проецирует входящие сообщения хоста через
 * ingest() и хранит временное состояние интерфейса. Экшены названы как пользовательские/daemon
 * события, чтобы их было видно в devtools.
 */
export type AgentStore = {
  state: AgentState | null;
  autonomousState: AutonomousState | null;
  page: UiPage;
  settingsInitialPage: SettingsPageId;
  autonomousRouteRequest: AutonomousRouteRequest | null;
  autonomousOperation: AutonomousOperation | null;
  errorModal: string | null;
  autonomousError: string | null;
  loadingMessage: string;

  /** Проецирует входящее сообщение хоста (snapshot/patch/событие) в UI-состояние. */
  ingest: (message: HostToUiMessage) => void;
  /** Открыть страницу настроек на нужном разделе. */
  openSettings: (page?: SettingsPageId) => void;
  /** Вернуться из настроек в чат. */
  closeSettings: () => void;
  /** Показать критическую ошибку в общем error surface. */
  showError: (message: string) => void;
  /** Закрыть error surface. */
  dismissError: () => void;
};

// Монотонный счётчик для route/operation запросов: страницы по нему отличают новое требование
// действия от повторного рендера. Не зависит от Date.now(), поэтому стабилен в тестах.
let requestNonce = 0;
function nextNonce(): number {
  requestNonce += 1;
  return requestNonce;
}

export const useAgentStore = create<AgentStore>()(
  devtools(
    (set, get) => ({
      state: null,
      autonomousState: null,
      page: 'chat',
      settingsInitialPage: 'overview',
      autonomousRouteRequest: null,
      autonomousOperation: null,
      errorModal: null,
      autonomousError: null,
      loadingMessage: translate('ru', 'app.loadingAgent'),

      ingest: (message) => {
        if (message.type === 'state') {
          const current = get().state;
          set(
            {
              state: {
                ...message,
                isolationEventsBySessionId:
                  current?.isolationEventsBySessionId || message.isolationEventsBySessionId || {}
              },
              loadingMessage: translate(message.agentLanguage, 'app.loadingAgent')
            },
            false,
            'daemon/stateLoaded'
          );
          // editor-view запоминает активный чат, чтобы переоткрытие вкладки вернуло тот же диалог.
          if (message.viewKind === 'editor') {
            getAgentHost().setPersistedState({ chatId: message.activeChat.id });
          }
          return;
        }

        if (message.type === 'loading') {
          set({ state: null, loadingMessage: message.message }, false, 'daemon/loading');
          return;
        }

        if (message.type === 'chat.patch') {
          set({ state: applyAgentPatch(get().state, message) }, false, 'daemon/eventReceived');
          return;
        }

        if (message.type === 'page') {
          set({ page: message.page }, false, 'ui/pageSelected');
          return;
        }

        if (message.type === 'errorModal') {
          set({ errorModal: message.message }, false, 'ui/errorShown');
          return;
        }

        if (message.type === 'showIsolation' && message.flowModes) {
          const current = get().state;
          if (current) {
            set(
              { state: { ...current, isolationFlowModes: [...message.flowModes] } },
              false,
              'isolation/flowModesLoaded'
            );
          }
          return;
        }

        if (message.type === 'autonomous.state') {
          set({ autonomousState: message.state, autonomousError: null }, false, 'autonomous/stateLoaded');
          return;
        }

        if (message.type === 'autonomous.error') {
          set({ autonomousError: message.message }, false, 'autonomous/error');
          return;
        }

        if (message.type === 'autonomous.route') {
          set({ autonomousRouteRequest: { route: message.route, nonce: nextNonce() } }, false, 'autonomous/route');
          return;
        }

        if (message.type === 'autonomous.operation') {
          set(
            {
              autonomousOperation: {
                operation: message.operation,
                flowId: message.flowId,
                status: message.status,
                nonce: nextNonce()
              }
            },
            false,
            'autonomous/operation'
          );
          return;
        }

        if (message.type === 'isolation.events') {
          const current = get().state;
          if (current) {
            set(
              {
                state: {
                  ...current,
                  isolationEventsBySessionId: {
                    ...current.isolationEventsBySessionId,
                    [message.sessionId]: message.events
                  }
                }
              },
              false,
              'isolation/eventsReceived'
            );
          }
        }
      },

      openSettings: (page = 'overview') =>
        set({ page: 'settings', settingsInitialPage: page }, false, 'ui/settingsOpened'),
      closeSettings: () => set({ page: 'chat' }, false, 'ui/settingsClosed'),
      showError: (message) => set({ errorModal: message }, false, 'ui/errorShown'),
      dismissError: () => set({ errorModal: null }, false, 'ui/errorDismissed')
    }),
    { name: 'agent-ui' }
  )
);
