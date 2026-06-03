import { ChevronRight, FileText, Image } from 'lucide-react';
import { type ReactNode, memo, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { formatAttachmentSize } from '../../../features/send-message';
import { useI18n } from '../../../shared/i18n';
import type { AgentAttachment, ChatMessage } from '../../../shared/types';
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
export const MessageCard = memo(MessageCardView, areMessageCardPropsEqual);

function MessageCardView({
  message,
  collapseToolId,
  actionsSignature: _actionsSignature,
  ...textMessageProps
}: MessageCardProps) {
  if (message.role === 'tool') {
    return <ToolMessageCard message={message} collapseToolId={collapseToolId} />;
  }

  return <TextMessageCard message={message} {...textMessageProps} />;
}

/**
 * Что это: карточка обычного текстового сообщения без tool-specific ветки.
 * Зачем нужно: hooks вызываются в стабильном порядке, а MessageCard остаётся простым маршрутизатором ролей.
 * Какую продуктовую проблему решает: чат безопасно рендерит и сворачивает user/assistant/status/error сообщения.
 */
function TextMessageCard({
  message,
  actions,
  authorLabel,
  defaultExpanded = true
}: Omit<MessageCardProps, 'collapseToolId'>) {
  const { t } = useI18n();
  const variant = getMessageVariant(message, t, styles);
  const collapsible = isCollapsibleMessage(message);
  const [expanded, setExpanded] = useState(!collapsible || defaultExpanded);

  useEffect(() => {
    setExpanded(!collapsible || defaultExpanded);
  }, [collapsible, defaultExpanded, message.id]);

  const cutClass = collapsible ? (expanded ? styles.expanded : styles.collapsed) : '';
  const hasBody = Boolean(message.content);
  const hasAttachments = Boolean(message.attachments?.length);
  const rootClassName = `${styles.root} ${collapsible ? styles.cutCard : ''} ${cutClass} ${variant.className}`;

  return (
    <article className={rootClassName}>
      <MessageHeader
        icon={variant.icon}
        label={authorLabel || variant.label}
        message={message}
        actions={actions}
        hasBody={hasBody || hasAttachments}
        collapsible={collapsible}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
      {hasBody ? (
        <div className={styles.markdownBody}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || ''}</ReactMarkdown>
        </div>
      ) : null}
      <AttachmentList attachments={message.attachments} />
      {collapsible && !expanded ? <div className={styles.cutShadow} /> : null}
    </article>
  );
}

/**
 * Что это: список вложений пользовательского сообщения.
 * Зачем нужно: история чата должна показывать файлы, которые ушли модели вместе с prompt.
 * Какую продуктовую проблему решает: пользователь и QA видят полный контекст запроса, включая изображения и файлы.
 */
function AttachmentList({ attachments }: { attachments?: AgentAttachment[] }) {
  if (!attachments?.length) {
    return null;
  }

  return (
    <div className={styles.attachments}>
      {attachments.map((attachment) => (
        <span className={styles.attachment} key={attachment.id} title={attachment.name}>
          {attachment.kind === 'image' ? <Image size={13} /> : <FileText size={13} />}
          <span className={styles.attachmentName}>{attachment.name}</span>
          <span className={styles.attachmentMeta}>{formatAttachmentSize({ bytes: attachment.size })}</span>
        </span>
      ))}
    </div>
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

/**
 * Что это: правило повторного рендера message-card.
 * Зачем нужно: старые markdown/tool карточки не должны заново парситься,
 * когда backend обновляет соседний tool-call или статус активности.
 * Какую продуктовую проблему решает: несколько параллельных агентов не забивают CPU
 * повторным рендером всей истории чата.
 */
function areMessageCardPropsEqual(previous: MessageCardProps, next: MessageCardProps): boolean {
  return (
    previous.message === next.message &&
    previous.actionsSignature === next.actionsSignature &&
    previous.authorLabel === next.authorLabel &&
    previous.defaultExpanded === next.defaultExpanded &&
    previous.collapseToolId === next.collapseToolId
  );
}
