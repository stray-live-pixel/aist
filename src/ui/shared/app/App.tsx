import { AlertTriangle, Bot, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AutonomousPage } from '../pages/autonomous/AutonomousPage';
import { ChatPage } from '../pages/chat/ChatPage';
import { PermissionsPage } from '../pages/permissions/PermissionsPage';
import type { SettingsPageId } from '../pages/permissions/permissions-page/types';
import { I18nProvider, translate } from '../i18n';
import { agentActions } from '../lib/agentActions';
import { applyAgentPatch } from '../lib/agentPatches';
import { AgentStateProvider } from '../lib/agentState';
import { getAgentHost } from '../api/agentHost';
import type { AgentState, AutonomousState, ExtensionToWebviewMessage } from '../types';
import { ModalBackdrop, ModalCode, ModalHeader, ModalSurface } from '../ui';
import { IconButton } from '../ui/IconButton';
import styles from './App.module.scss';

/**
 * Что это: корневой React-компонент webview.
 * Зачем нужно: принимает состояние от extension через IPC и выбирает между чат-страницей, настройками и глобальной error-модалкой.
 */
export function App() {
  const [state, setState] = useState<AgentState | null>(null);
  const [autonomousState, setAutonomousState] = useState<AutonomousState | null>(null);
  const [page, setPage] = useState<'chat' | 'settings' | 'autonomous'>('chat');
  const [settingsInitialPage, setSettingsInitialPage] = useState<SettingsPageId>('overview');
  const [autonomousRouteRequest, setAutonomousRouteRequest] = useState<{ route: 'flows'; nonce: number } | null>(null);
  const [autonomousOperation, setAutonomousOperation] = useState<{
    operation: 'deleteFlow';
    flowId: string;
    status: 'done' | 'cancelled' | 'error';
    nonce: number;
  } | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [autonomousError, setAutonomousError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(() => translate('ru', 'app.loadingAgent'));

  useEffect(() => {
    const listener = (message: ExtensionToWebviewMessage) => {
      if (message.type === 'state') {
        setState((current) => ({
          ...message,
          isolationEventsBySessionId: current?.isolationEventsBySessionId || message.isolationEventsBySessionId || {}
        }));
        setLoadingMessage(translate(message.agentLanguage, 'app.loadingAgent'));
        if (message.viewKind === 'editor') {
          getAgentHost().setPersistedState({ chatId: message.activeChat.id });
        }
      } else if (message.type === 'loading') {
        setState(null);
        setLoadingMessage(message.message);
      } else if (message.type === 'chat.patch') {
        setState((current) => applyAgentPatch(current, message));
      } else if (message.type === 'page') {
        setPage(message.page);
      } else if (message.type === 'errorModal') {
        setErrorModal(message.message);
      } else if (message.type === 'showIsolation' && message.flowModes) {
        const flowModes = message.flowModes;
        setState((current) =>
          current
            ? {
                ...current,
                isolationFlowModes: [...flowModes]
              }
            : current
        );
      } else if (message.type === 'autonomous.state') {
        setAutonomousState(message.state);
        setAutonomousError(null);
      } else if (message.type === 'autonomous.error') {
        setAutonomousError(message.message);
      } else if (message.type === 'autonomous.route') {
        setAutonomousRouteRequest({ route: message.route, nonce: Date.now() });
      } else if (message.type === 'autonomous.operation') {
        setAutonomousOperation({
          operation: message.operation,
          flowId: message.flowId,
          status: message.status,
          nonce: Date.now()
        });
      } else if (message.type === 'isolation.events') {
        setState((current) =>
          current
            ? {
                ...current,
                isolationEventsBySessionId: {
                  ...current.isolationEventsBySessionId,
                  [message.sessionId]: message.events
                }
              }
            : current
        );
      }
    };

    const unsubscribe = getAgentHost().subscribe(listener);
    agentActions.webviewReady();

    return unsubscribe;
  }, []);

  const modal = errorModal ? <GlobalErrorModal message={errorModal} onClose={() => setErrorModal(null)} /> : null;

  if (page === 'autonomous' && autonomousState) {
    return (
      <I18nProvider language={state?.agentLanguage || 'ru'}>
        <AutonomousPage
          state={autonomousState}
          error={autonomousError}
          routeRequest={autonomousRouteRequest}
          operation={autonomousOperation}
        />
        {modal}
      </I18nProvider>
    );
  }

  if (!state) {
    return (
      <>
        <div className={styles.loadingPage}>
          <div className={styles.loadingContent}>
            <Bot size={18} />
            <span>{loadingMessage}</span>
          </div>
        </div>
        {modal}
      </>
    );
  }

  if (page === 'settings') {
    return (
      <I18nProvider language={state.agentLanguage}>
        <AgentStateProvider state={state}>
          <PermissionsPage onBack={() => setPage('chat')} initialPage={settingsInitialPage} />
          {modal}
        </AgentStateProvider>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider language={state.agentLanguage}>
      <AgentStateProvider state={state}>
        <ChatPage
          onOpenSettingsPage={(initialPage = 'overview') => {
            setSettingsInitialPage(initialPage);
            setPage('settings');
          }}
        />
        {modal}
      </AgentStateProvider>
    </I18nProvider>
  );
}

function GlobalErrorModal({ message, onClose }: { message: string; onClose(): void }) {
  return (
    <ModalBackdrop>
      <ModalSurface tone="error" role="alertdialog" aria-modal="true" aria-label="AIST error">
        <ModalHeader tone="error">
          <div className={styles.errorHeaderMain}>
            <AlertTriangle size={18} className={styles.errorIcon} />
            <div className={styles.errorHeaderText}>
              <h2>AIST error</h2>
              <p>The error was also added to the chat as an informational agent message.</p>
            </div>
          </div>
          <IconButton title="Close" onClick={onClose}>
            <X size={15} />
          </IconButton>
        </ModalHeader>
        <ModalCode tone="error">{message}</ModalCode>
      </ModalSurface>
    </ModalBackdrop>
  );
}
