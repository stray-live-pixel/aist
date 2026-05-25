import { Bot, ChevronRight, Loader2, User, Wrench } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useI18n } from '../../shared/i18n';
import type { ChatMessage, ChatMessageRole } from '../../shared/types';
import { ToolMessageCard } from './ToolMessageCard';
import { formatMessageDate, formatMessageUsage } from './messageFormatting';

type MessageCardProps = {
  message: ChatMessage;
  actions?: ReactNode;
  defaultExpanded?: boolean;
  collapseToolId?: string;
};

export function MessageCard({ message, actions, defaultExpanded = true, collapseToolId }: MessageCardProps) {
  const { t } = useI18n();

  if (message.role === 'tool') {
    return <ToolMessageCard message={message} collapseToolId={collapseToolId} />;
  }

  const variant = getMessageVariant(message.role, t);
  const collapsible = isCollapsibleMessage(message);
  const [expanded, setExpanded] = useState(!collapsible || defaultExpanded);

  useEffect(() => {
    setExpanded(!collapsible || defaultExpanded);
  }, [collapsible, defaultExpanded, message.id]);

  return (
    <article className={getMessageClassName(variant.className, collapsible, expanded)}>
      <MessageHeader
        icon={variant.icon}
        label={variant.label}
        message={message}
        actions={actions}
        collapsible={collapsible}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || ''}</ReactMarkdown>
      </div>
      {collapsible && !expanded ? <div className="message-cut-shadow" /> : null}
    </article>
  );
}

function MessageHeader({ icon, label, message, actions, collapsible, expanded, onToggle }: MessageHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <div className={HEADER_CLASS_NAME}>
        {collapsible ? (
          <button
            className="message-cut-button"
            title={expanded ? t('message.collapse') : t('message.expand')}
            aria-expanded={expanded}
            onClick={onToggle}
          >
            <ChevronRight size={14} />
          </button>
        ) : null}
        {icon}
        <span>{label}</span>
        {formatMessageDate(message.createdAt)}
        {formatMessageUsage(message.usage)}
      </div>
      {actions}
    </div>
  );
}

function isCollapsibleMessage(message: ChatMessage): boolean {
  return message.role === 'user' || message.role === 'assistant';
}

function getMessageClassName(className: string, collapsible: boolean, expanded: boolean): string {
  const cutClass = collapsible ? (expanded ? 'message-cut-expanded' : 'message-cut-collapsed') : '';
  return `message-card message-cut-card ${cutClass} ${className}`;
}

function getMessageVariant(role: ChatMessageRole, t: ReturnType<typeof useI18n>['t']) {
  const variants = {
    user: {
      icon: <User size={16} />,
      label: t('message.you'),
      className: 'message-card-user'
    },
    assistant: {
      icon: <Bot size={16} />,
      label: t('message.agent'),
      className: 'message-card-assistant'
    },
    status: {
      icon: <Loader2 size={16} className="animate-spin" />,
      label: t('message.status'),
      className: 'border-dashed text-[var(--vscode-descriptionForeground)]'
    },
    error: {
      icon: <Wrench size={16} />,
      label: t('message.error'),
      className: 'border-[var(--vscode-errorForeground)] text-[var(--vscode-errorForeground)]'
    },
    tool: {
      icon: <Wrench size={16} />,
      label: t('message.tool'),
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
  collapsible: boolean;
  expanded: boolean;
  onToggle(): void;
};
