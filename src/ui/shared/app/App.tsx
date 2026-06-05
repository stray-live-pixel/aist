import { AlertTriangle, Bot, X } from 'lucide-react';
import { useEffect } from 'react';

import { getAgentHost } from '../api/agentHost';
import { I18nProvider } from '../i18n';
import { agentActions } from '../lib/agentActions';
import { AutonomousPage } from '../pages/autonomous/AutonomousPage';
import { ChatPage } from '../pages/chat/ChatPage';
import { PermissionsPage } from '../pages/permissions/PermissionsPage';
import { useAgentStore } from '../store/agentStore';
import { ModalBackdrop, ModalCode, ModalHeader, ModalSurface } from '../ui';
import { IconButton } from '../ui/IconButton';
import styles from './App.module.scss';

/**
 * Что это: корневой React-компонент общего UI.
 * Зачем нужно: подписывает store на сообщения хоста и выбирает между чат-страницей, настройками,
 * autonomous-редактором и глобальным error surface. Вся бизнес-логика живёт в store и страницах.
 */
export function App() {
  const state = useAgentStore((store) => store.state);
  const autonomousState = useAgentStore((store) => store.autonomousState);
  const page = useAgentStore((store) => store.page);
  const settingsInitialPage = useAgentStore((store) => store.settingsInitialPage);
  const autonomousRouteRequest = useAgentStore((store) => store.autonomousRouteRequest);
  const autonomousOperation = useAgentStore((store) => store.autonomousOperation);
  const errorModal = useAgentStore((store) => store.errorModal);
  const autonomousError = useAgentStore((store) => store.autonomousError);
  const loadingMessage = useAgentStore((store) => store.loadingMessage);
  const ingest = useAgentStore((store) => store.ingest);
  const openSettings = useAgentStore((store) => store.openSettings);
  const closeSettings = useAgentStore((store) => store.closeSettings);
  const dismissError = useAgentStore((store) => store.dismissError);

  useEffect(() => {
    const unsubscribe = getAgentHost().subscribe(ingest);
    agentActions.webviewReady();

    return unsubscribe;
  }, [ingest]);

  const modal = errorModal ? <GlobalErrorModal message={errorModal} onClose={dismissError} /> : null;

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
        <PermissionsPage onBack={closeSettings} initialPage={settingsInitialPage} />
        {modal}
      </I18nProvider>
    );
  }

  return (
    <I18nProvider language={state.agentLanguage}>
      <ChatPage onOpenSettingsPage={openSettings} />
      {modal}
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
