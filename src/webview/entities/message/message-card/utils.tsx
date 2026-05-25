import { Bot, Loader2, User, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';

import type { useI18n } from '../../../shared/i18n';
import type { ChatMessage, ChatMessageRole } from '../../../shared/types';

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
 * Что это: определение визуального варианта по роли сообщения.
 * Зачем нужно: MessageCard не должен знать детали каждого варианта.
 */
export function getMessageVariant(
  role: ChatMessageRole,
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
      icon: <Loader2 size={16} className={styles.spinIcon} />,
      label: t('message.status'),
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

  return variants[role] || variants.assistant;
}

/**
 * Что это: проверка, можно ли сворачивать сообщение.
 * Зачем нужно: только user и assistant сообщения имеют смысл сворачивать.
 */
export function isCollapsibleMessage(message: ChatMessage): boolean {
  return message.role === 'user' || message.role === 'assistant';
}
