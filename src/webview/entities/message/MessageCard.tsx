import { Bot, Loader2, User, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../shared/types';
import { getToolLabel, ToolIcon } from '../../shared/ui/ToolIcon';

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
  const isError = message.status === 'error';
  const isRunning = message.status === 'running' || message.status === 'waiting';

  return (
    <article className={`message-card ${isError ? 'border-[var(--vscode-errorForeground)]' : ''}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-normal text-[var(--vscode-descriptionForeground)]">
          <ToolIcon name={message.name} className={isRunning ? 'animate-pulse' : ''} />
          <span className="truncate">{getToolLabel(message.name)}</span>
        </div>
        <span className={`shrink-0 rounded border px-2 py-0.5 text-xs ${getToolStatusClass(message.status)}`}>
          {formatToolStatus(message.status)}
        </span>
      </div>
      {message.reason ? <p className="mb-2 text-xs leading-5 text-[var(--vscode-descriptionForeground)]">{message.reason}</p> : null}
      <details className="text-xs">
        <summary className="cursor-pointer text-[var(--vscode-textLink-foreground)]">Details</summary>
        <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded border border-[var(--agent-border)] bg-[var(--vscode-editor-background)] p-2 font-[var(--vscode-editor-font-family)]">
          {JSON.stringify({ tool: message.name, status: message.status, args: message.args, result: message.result }, null, 2)}
        </pre>
      </details>
    </article>
  );
}

function formatToolStatus(status: ChatMessage['status']): string {
  switch (status) {
    case 'waiting':
      return 'Waiting';
    case 'running':
      return 'Running';
    case 'done':
      return 'Done';
    case 'error':
      return 'Error';
    case 'denied':
      return 'Denied';
    default:
      return 'Unknown';
  }
}

function getToolStatusClass(status: ChatMessage['status']): string {
  switch (status) {
    case 'done':
      return 'border-[var(--agent-border)] text-[var(--vscode-descriptionForeground)]';
    case 'error':
    case 'denied':
      return 'border-[var(--vscode-errorForeground)] text-[var(--vscode-errorForeground)]';
    default:
      return 'border-[var(--agent-border)] text-[var(--vscode-descriptionForeground)]';
  }
}
