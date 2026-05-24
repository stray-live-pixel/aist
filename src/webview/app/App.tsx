import { Bot } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ChatPage } from '../pages/chat/ChatPage';
import { PermissionsPage } from '../pages/permissions/PermissionsPage';
import { vscode } from '../shared/lib/vscode';
import type { AgentState, ExtensionToWebviewMessage } from '../shared/types';

export function App() {
  const [state, setState] = useState<AgentState | null>(null);
  const [page, setPage] = useState<'chat' | 'settings'>('chat');

  useEffect(() => {
    const listener = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      if (event.data.type === 'state') {
        setState(event.data);
      } else if (event.data.type === 'page') {
        setPage(event.data.page);
      }
    };

    window.addEventListener('message', listener);
    vscode.postMessage({ type: 'webviewReady' });

    return () => window.removeEventListener('message', listener);
  }, []);

  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--vscode-editor-background)] text-[var(--vscode-descriptionForeground)]">
        <div className="flex items-center gap-2 text-sm">
          <Bot size={18} />
          <span>Loading agent...</span>
        </div>
      </div>
    );
  }

  if (page === 'settings') {
    return (
      <PermissionsPage
        tools={state.toolPermissions}
        maxToolIterations={state.maxToolIterations}
        agentLanguage={state.agentLanguage}
        agentMode={state.agentMode}
        agentModes={state.agentModes}
        customSkills={state.customSkills}
        codexAuthenticated={state.codexAuthenticated}
        permissionPresets={state.toolPermissionPresets}
        activePermissionPresetId={state.activeToolPermissionPresetId}
        onBack={() => setPage('chat')}
      />
    );
  }

  return <ChatPage state={state} />;
}
