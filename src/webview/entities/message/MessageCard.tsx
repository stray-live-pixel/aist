import { Bot, Check, Loader2, User, Wrench, X } from 'lucide-react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { vscode } from '../../shared/lib/vscode';
import type { ChatMessage, ChatMessageUsageEstimate } from '../../shared/types';
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
          {formatMessageDate(message.createdAt)}
          {formatMessageUsage(message.usage)}
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
  const needsApproval = message.approval === 'pending';

  return (
    <article className={`message-card ${isError ? 'border-[var(--vscode-errorForeground)]' : ''}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-normal text-[var(--vscode-descriptionForeground)]">
          <ToolIcon name={message.name} className={isRunning ? 'animate-pulse' : ''} />
          <span className="truncate">{getToolLabel(message.name)}</span>
          {formatMessageDate(message.createdAt)}
          {formatMessageUsage(message.usage)}
        </div>
        <span className={`shrink-0 rounded border px-2 py-0.5 text-xs ${getToolStatusClass(message.status)}`}>
          {formatToolStatus(message)}
        </span>
      </div>
      {message.reason ? <p className="mb-2 text-xs leading-5 text-[var(--vscode-descriptionForeground)]">{message.reason}</p> : null}
      {needsApproval ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            className="primary-button h-8 min-w-0"
            onClick={() => vscode.postMessage({ type: 'resolveToolCall', messageId: message.id, approved: true })}
          >
            <Check size={14} />
            <span>Allow</span>
          </button>
          <button
            className="secondary-button"
            onClick={() => vscode.postMessage({ type: 'resolveToolCall', messageId: message.id, approved: false })}
          >
            <X size={14} />
            <span>Deny</span>
          </button>
        </div>
      ) : null}
      <details className="text-xs">
        <summary className="cursor-pointer text-[var(--vscode-textLink-foreground)]">Details</summary>
        <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded border border-[var(--agent-border)] bg-[var(--vscode-editor-background)] p-2 font-[var(--vscode-editor-font-family)]">
          {JSON.stringify({ tool: message.name, status: message.status, args: message.args, result: message.result }, null, 2)}
        </pre>
      </details>
    </article>
  );
}

function formatToolStatus(message: ChatMessage): string {
  if (message.approval === 'pending') {
    return 'Approval needed';
  }

  switch (message.status) {
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

function formatMessageDate(timestamp?: number): ReactNode {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return (
    <span className="ml-2 flex items-center gap-1.5 font-normal normal-case text-[var(--vscode-descriptionForeground)]">
      <strong className="font-bold">{hours}:{minutes}:{seconds}</strong>
      <span className="opacity-75">{day}.{month}.{year}</span>
    </span>
  );
}

function formatMessageUsage(usage?: ChatMessageUsageEstimate): ReactNode {
  const promptTokens = usage?.promptTokens || 0;
  const completionTokens = usage?.completionTokens || 0;
  const costUsd = usage?.costUsd;
  const tokens = usage?.tokens || promptTokens + completionTokens;

  if (!tokens && costUsd === undefined) {
    return null;
  }

  return (
    <span
      className="ml-2 flex items-center gap-1.5 font-normal normal-case text-[var(--vscode-descriptionForeground)]"
      title={[
        tokens ? `Message: ${tokens.toLocaleString()} tokens` : undefined,
        promptTokens ? `Prompt: ${promptTokens.toLocaleString()} tokens` : undefined,
        completionTokens ? `Completion: ${completionTokens.toLocaleString()} tokens` : undefined,
        costUsd !== undefined ? `Cost: ${formatCost(costUsd)}` : undefined
      ]
        .filter(Boolean)
        .join('\n')}
    >
      {tokens ? <span>{formatTokens(tokens)} tok</span> : null}
      {costUsd !== undefined ? <strong className="font-bold">{formatCost(costUsd)}</strong> : null}
    </span>
  );
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }

  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }

  return String(tokens);
}

function formatCost(costUsd: number): string {
  if (costUsd === 0) {
    return '$0.00';
  }

  if (costUsd < 0.0001) {
    return `~$${costUsd.toFixed(6)}`;
  }

  return `~$${costUsd.toFixed(4)}`;
}
