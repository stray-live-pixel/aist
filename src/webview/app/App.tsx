import { AlertTriangle, Bot, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ChatPage } from '../pages/chat/ChatPage';
import { PermissionsPage } from '../pages/permissions/PermissionsPage';
import { I18nProvider, translate } from '../shared/i18n';
import { vscode } from '../shared/lib/vscode';
import type { AgentState, ExtensionToWebviewMessage } from '../shared/types';

export function App() {
  const [state, setState] = useState<AgentState | null>(null);
  const [page, setPage] = useState<'chat' | 'settings'>('chat');
  const [errorModal, setErrorModal] = useState<string | null>(null);

  useEffect(() => {
    const listener = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      if (event.data.type === 'state') {
        setState(event.data);
      } else if (event.data.type === 'page') {
        setPage(event.data.page);
      } else if (event.data.type === 'errorModal') {
        setErrorModal(event.data.message);
      }
    };

    window.addEventListener('message', listener);
    vscode.postMessage({ type: 'webviewReady' });

    return () => window.removeEventListener('message', listener);
  }, []);

  const modal = errorModal ? <GlobalErrorModal message={errorModal} onClose={() => setErrorModal(null)} /> : null;

  if (!state) {
    return (
      <>
        <div className="flex h-screen items-center justify-center bg-[var(--vscode-editor-background)] text-[var(--vscode-descriptionForeground)]">
          <div className="flex items-center gap-2 text-sm">
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
        <PermissionsPage
          tools={state.toolPermissions}
          maxToolIterations={state.maxToolIterations}
          compactionSettings={state.compactionSettings}
          approvalNotificationSettings={state.approvalNotificationSettings}
          agentLanguage={state.agentLanguage}
          agentMode={state.agentMode}
          agentModes={state.agentModes}
          agentConfigScope={state.agentConfigScope}
          projectInstructions={state.projectInstructions}
          promptConfig={state.promptConfig}
          instructionSources={state.instructionSources}
          customSkills={state.customSkills}
          codexAuthenticated={state.codexAuthenticated}
          permissionPresets={state.toolPermissionPresets}
          activePermissionPresetId={state.activeToolPermissionPresetId}
          onBack={() => setPage('chat')}
        />
        {modal}
      </I18nProvider>
    );
  }

  return (
    <I18nProvider language={state.agentLanguage}>
      <ChatPage state={state} />
      {modal}
    </I18nProvider>
  );
}

function GlobalErrorModal({ message, onClose }: { message: string; onClose(): void }) {
  return (
    <div className="tool-modal-backdrop">
      <section className="tool-modal global-error-modal" role="alertdialog" aria-modal="true" aria-label="AIST error">
        <header className="tool-modal-header global-error-modal-header">
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <h2>AIST error</h2>
              <p>The error was also added to the chat as an informational agent message.</p>
            </div>
          </div>
          <button className="icon-button" title="Close" onClick={onClose}>
            <X size={15} />
          </button>
        </header>
        <pre className="tool-modal-code global-error-modal-code">{message}</pre>
      </section>
    </div>
  );
}
