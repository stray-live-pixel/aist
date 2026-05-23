import { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import type { AgentState, ExtensionToWebviewMessage } from '../shared/types';
import { vscode } from '../shared/lib/vscode';
import { ChatPage } from '../pages/chat/ChatPage';

export function App() {
  const [state, setState] = useState<AgentState | null>(null);

  useEffect(() => {
    const listener = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      if (event.data.type === 'state') {
        setState(event.data);
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

  return <ChatPage state={state} />;
}
