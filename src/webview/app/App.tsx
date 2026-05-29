import { AlertTriangle, Bot, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AutonomousPage } from '../pages/autonomous/AutonomousPage';
import { ChatPage } from '../pages/chat/ChatPage';
import { PermissionsPage } from '../pages/permissions/PermissionsPage';
import { I18nProvider, translate } from '../shared/i18n';
import { agentActions } from '../shared/lib/agentActions';
import { applyAgentPatch } from '../shared/lib/agentPatches';
import { AgentStateProvider } from '../shared/lib/agentState';
import { vscode } from '../shared/lib/vscode';
import type { AgentState, AutonomousState, ExtensionToWebviewMessage } from '../shared/types';
import { ModalBackdrop, ModalCode, ModalHeader, ModalSurface } from '../shared/ui';
import { IconButton } from '../shared/ui/IconButton';
import styles from './App.module.scss';

/**
 * Что это: корневой React-компонент webview.
 * Зачем нужно: принимает состояние от extension через IPC и выбирает между чат-страницей, настройками и глобальной error-модалкой.
 */
export function App() {
  const [state, setState] = useState<AgentState | null>(null);
  const [autonomousState, setAutonomousState] = useState<AutonomousState | null>(null);
  const [page, setPage] = useState<'chat' | 'settings' | 'autonomous'>('chat');
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [autonomousError, setAutonomousError] = useState<string | null>(null);

  useEffect(() => {
    const listener = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const message = event.data;

      if (message.type === 'state') {
        setState(message);
        if (message.viewKind === 'editor') {
          vscode.setState({ chatId: message.activeChat.id });
        }
      } else if (message.type === 'chat.patch') {
        setState((current) => applyAgentPatch(current, message));
      } else if (message.type === 'page') {
        setPage(message.page);
      } else if (message.type === 'errorModal') {
        setErrorModal(message.message);
      } else if (message.type === 'autonomous.state') {
        setAutonomousState(message.state);
        setAutonomousError(null);
      } else if (message.type === 'autonomous.error') {
        setAutonomousError(message.message);
      }
    };

    window.addEventListener('message', listener);
    agentActions.webviewReady();

    return () => window.removeEventListener('message', listener);
  }, []);

  const modal = errorModal ? <GlobalErrorModal message={errorModal} onClose={() => setErrorModal(null)} /> : null;

  if (page === 'autonomous' && autonomousState) {
    return (
      <I18nProvider language={state?.agentLanguage || 'ru'}>
        <AutonomousPage state={autonomousState} error={autonomousError} />
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
            <span>{translate('ru', 'app.loadingAgent')}</span>
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
          <PermissionsPage onBack={() => setPage('chat')} />
          {modal}
        </AgentStateProvider>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider language={state.agentLanguage}>
      <AgentStateProvider state={state}>
        <ChatPage />
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
