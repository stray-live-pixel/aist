import { ChevronRight } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useI18n } from '../../../shared/i18n';
import type { ChatMessage } from '../../../shared/types';
import { formatMessageDate, formatMessageUsage } from '../message-formatting';
import { ToolMessageCard } from '../tool-message-card';
import styles from './MessageCard.module.scss';
import type { MessageCardProps } from './types';
import { getMessageVariant, isCollapsibleMessage } from './utils';

/**
 * Что это: универсальная карточка сообщения для всех ролей.
 * Зачем нужно: единая точка рендеринга user/assistant/status/error/tool сообщений.
 * Tool-сообщения делегируются в ToolMessageCard для специфичной логики.
 */
export function MessageCard({
  message,
  actions,
  authorLabel,
  defaultExpanded = true,
  collapseToolId
}: MessageCardProps) {
  const { t } = useI18n();

  if (message.role === 'tool') {
    return <ToolMessageCard message={message} collapseToolId={collapseToolId} />;
  }

  const variant = getMessageVariant(message, t, styles);
  const collapsible = isCollapsibleMessage(message);
  const [expanded, setExpanded] = useState(!collapsible || defaultExpanded);

  useEffect(() => {
    setExpanded(!collapsible || defaultExpanded);
  }, [collapsible, defaultExpanded, message.id]);

  const cutClass = collapsible ? (expanded ? styles.expanded : styles.collapsed) : '';
  const hasBody = Boolean(message.content);
  const rootClassName = `${styles.root} ${collapsible ? styles.cutCard : ''} ${cutClass} ${variant.className}`;

  return (
    <article className={rootClassName}>
      <MessageHeader
        icon={variant.icon}
        label={authorLabel || variant.label}
        message={message}
        actions={actions}
        hasBody={hasBody}
        collapsible={collapsible}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
      {hasBody ? (
        <div className={styles.markdownBody}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || ''}</ReactMarkdown>
        </div>
      ) : null}
      {collapsible && !expanded ? <div className={styles.cutShadow} /> : null}
    </article>
  );
}

/**
 * Заголовок карточки сообщения: иконка, лейбл, дата, usage, действия.
 * Вынесен в отдельный компонент для читаемости MessageCard.
 */
function MessageHeader({
  icon,
  label,
  message,
  actions,
  hasBody,
  collapsible,
  expanded,
  onToggle
}: MessageHeaderProps) {
  const { t } = useI18n();
  const headerClassName = `${styles.header} ${hasBody ? '' : styles.headerWithoutBody}`;

  return (
    <div className={headerClassName}>
      <div className={styles.headerMeta}>
        {collapsible ? (
          <button
            className={styles.cutButton}
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

type MessageHeaderProps = {
  icon: ReactNode;
  label: string;
  message: ChatMessage;
  actions?: ReactNode;
  hasBody: boolean;
  collapsible: boolean;
  expanded: boolean;
  onToggle(): void;
};
