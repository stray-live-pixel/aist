import type { ReactNode } from 'react';

import type { useI18n } from '../../../i18n';
import type { ChatMessage, ChatMessageUsageEstimate } from '../../../types';
import styles from './MessageFormatting.module.scss';
import { getUsageLabel, padTimePart } from './utils';

/**
 * Что это: маленькие formatter-функции для заголовков сообщений.
 * Зачем нужно: MessageCard читался как композиция UI, без технического шума дат/токенов.
 * Пример: formatMessageDate(message.createdAt) возвращает готовый React-фрагмент времени.
 */
export function formatToolStatusLocalized(message: ChatMessage, t: ReturnType<typeof useI18n>['t']): string {
  if (message.approval === 'pending') return t('tool.status.approvalNeeded');
  if (message.status === 'waiting') return t('tool.status.waiting');
  if (message.status === 'running') return t('tool.status.running');
  if (message.status === 'done') return t('tool.status.done');
  if (message.status === 'error') return t('tool.status.error');
  if (message.status === 'denied') return t('tool.status.denied');
  return t('tool.status.unknown');
}

/**
 * Что это: CSS-классы для бейджа статуса tool-call.
 * Зачем нужно: error/denied статусы выделяются красным, остальные — нейтральным серым.
 */
export function getToolStatusClass(status: ChatMessage['status']): string {
  return status === 'error' || status === 'denied' ? 'error' : 'neutral';
}

export function formatMessageDate(timestamp?: number): ReactNode {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(padTimePart).join(':');
  const day = padTimePart(date.getDate());
  const month = padTimePart(date.getMonth() + 1);

  return (
    <span className={styles.dateLabel}>
      <strong>{time}</strong>{' '}
      <span>
        {day}.{month}.{date.getFullYear()}
      </span>
    </span>
  );
}

export function formatMessageUsage(usage?: ChatMessageUsageEstimate): ReactNode {
  const label = getUsageLabel(usage);
  if (!label) return null;

  return <span className={styles.usageInline}>{label}</span>;
}

export function formatMessageUsagePill(usage?: ChatMessageUsageEstimate): ReactNode {
  const label = getUsageLabel(usage);
  if (!label) return null;

  return <span className={styles.usagePill}>{label}</span>;
}
