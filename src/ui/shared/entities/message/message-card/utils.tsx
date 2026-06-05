import { Bot, CircleStop, Loader2, User, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';

import type { useI18n } from '../../../i18n';
import type { ChatMessage } from '../../../types';

/**
 * Что это: визуальный вариант карточки сообщения.
 * Зачем нужно: каждая роль получает свою иконку, лейбл и CSS-класс.
 */
export type MessageVariant = {
  icon: ReactNode;
  label: string;
  className: string;
};

/**
 * Что это: определение визуального варианта по сообщению.
 * Зачем нужно: status-сообщения бывают промежуточными и финальными; marker позволяет
 * убрать спиннер у stopped, не заводя отдельную роль и не усложняя MessageCard.
 */
export function getMessageVariant(
  message: Pick<ChatMessage, 'role' | 'marker'>,
  t: ReturnType<typeof useI18n>['t'],
  styles: Record<string, string>
): MessageVariant {
  const variants: Record<string, MessageVariant> = {
    user: {
      icon: <User size={16} />,
      label: t('message.you'),
      className: styles.user
    },
    assistant: {
      icon: <Bot size={16} />,
      label: t('message.agent'),
      className: styles.assistant
    },
    status: {
      icon: message.marker === 'stopped' ? <CircleStop size={16} /> : <Loader2 size={16} className={styles.spinIcon} />,
      label: message.marker === 'stopped' ? t('message.stoppedByUser') : t('message.status'),
      className: styles.status
    },
    error: {
      icon: <Wrench size={16} />,
      label: t('message.error'),
      className: styles.error
    },
    tool: {
      icon: <Wrench size={16} />,
      label: t('message.tool'),
      className: ''
    }
  };

  return variants[message.role] || variants.assistant;
}

/**
 * Что это: проверка, можно ли сворачивать сообщение.
 * Зачем нужно: только user и assistant сообщения имеют смысл сворачивать.
 */
export function isCollapsibleMessage(message: ChatMessage): boolean {
  return message.role === 'user' || message.role === 'assistant';
}
