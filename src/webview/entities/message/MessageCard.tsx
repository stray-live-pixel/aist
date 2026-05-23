import { Bot, CheckCircle2, Loader2, User, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../shared/types';

type MessageCardProps = {
  message: ChatMessage;
  actions?: ReactNode;
};

export function MessageCard({ message, actions }: MessageCardProps) {
  if (message.role === 'tool') {
    return <ToolMessage message={message} />;
  }

  const variants = {
    user: {
      icon: <User size={16} />,
      label: 'You',
      className: 'bg-[var(--vscode-input-background)]'
    },
    assistant: {
      icon: <Bot size={16} />,
      label: 'Agent',
      className: 'bg-[var(--vscode-editor-inactiveSelectionBackground)]'
    },
    status: {
      icon: <Loader2 size={16} className="animate-spin" />,
      label: 'Status',
      className: 'border-dashed text-[var(--vscode-descriptionForeground)]'
    },
    error: {
      icon: <Wrench size={16} />,
      label: 'Error',
      className: 'border-[var(--vscode-errorForeground)] text-[var(--vscode-errorForeground)]'
    }
  };
  const variant = variants[message.role] || variants.assistant;
  const markdown = message.content || '';

  return (
    <article className={`message-card ${variant.className}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-normal text-[var(--vscode-descriptionForeground)]">
          {variant.icon}
          <span>{variant.label}</span>
        </div>
        {actions}
      </div>
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </article>
  );
}

function ToolMessage({ message }: MessageCardProps) {
  const isDone = message.status === 'done';
  const isError = message.status === 'error';

  return (
    <article className={`message-card ${isError ? 'border-[var(--vscode-errorForeground)]' : ''}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-normal text-[var(--vscode-descriptionForeground)]">
          {isDone ? <CheckCircle2 size={16} /> : <Wrench size={16} className={message.status === 'running' ? 'animate-pulse' : ''} />}
          <span className="truncate">{message.name || 'tool'}</span>
        </div>
        <span className="shrink-0 text-xs text-[var(--vscode-descriptionForeground)]">{message.status}</span>
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-[var(--vscode-textLink-foreground)]">Details</summary>
        <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded border border-[var(--agent-border)] bg-[var(--vscode-editor-background)] p-2 font-[var(--vscode-editor-font-family)]">
          {JSON.stringify({ args: message.args, result: message.result }, null, 2)}
        </pre>
      </details>
    </article>
  );
}
