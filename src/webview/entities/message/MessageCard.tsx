import { Bot, Loader2, User, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage, ChatMessageRole } from '../../shared/types';
import { ToolMessageCard } from './ToolMessageCard';
import { formatMessageDate, formatMessageUsage } from './messageFormatting';

type MessageCardProps = {
  message: ChatMessage;
  actions?: ReactNode;
};

export function MessageCard({ message, actions }: MessageCardProps) {
  if (message.role === 'tool') {
    return <ToolMessageCard message={message} />;
  }

  const variant = getMessageVariant(message.role);

  return (
    <article className={`message-card ${variant.className}`}>
      <MessageHeader icon={variant.icon} label={variant.label} message={message} actions={actions} />
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || ''}</ReactMarkdown>
      </div>
    </article>
  );
}

function MessageHeader({ icon, label, message, actions }: MessageHeaderProps) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <div className={HEADER_CLASS_NAME}>
        {icon}
        <span>{label}</span>
        {formatMessageDate(message.createdAt)}
        {formatMessageUsage(message.usage)}
      </div>
      {actions}
    </div>
  );
}

function getMessageVariant(role: ChatMessageRole) {
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
    },
    tool: {
      icon: <Wrench size={16} />,
      label: 'Tool',
      className: ''
    }
  };

  return variants[role] || variants.assistant;
}

const HEADER_CLASS_NAME = [
  'flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-normal',
  'text-[var(--vscode-descriptionForeground)]'
].join(' ');

type MessageHeaderProps = {
  icon: ReactNode;
  label: string;
  message: ChatMessage;
  actions?: ReactNode;
};
