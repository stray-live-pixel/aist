import type { ReactNode } from 'react';

import type { ChatMessage, ChatMessageUsageEstimate } from '../../shared/types';

/**
 * Что это: маленькие formatter-функции для заголовков сообщений.
 * Зачем нужно: MessageCard читался как композиция UI, без технического шума дат/токенов.
 * Пример: formatMessageDate(message.createdAt) возвращает готовый React-фрагмент времени.
 */
export function formatToolStatus(message: ChatMessage): string {
  if (message.approval === 'pending') return 'Approval needed';
  if (message.status === 'waiting') return 'Waiting';
  if (message.status === 'running') return 'Running';
  if (message.status === 'done') return 'Done';
  if (message.status === 'error') return 'Error';
  if (message.status === 'denied') return 'Denied';
  return 'Unknown';
}

export function getToolStatusClass(status: ChatMessage['status']): string {
  return status === 'error' || status === 'denied'
    ? 'border-[var(--vscode-errorForeground)] text-[var(--vscode-errorForeground)]'
    : 'border-[var(--agent-border)] text-[var(--vscode-descriptionForeground)]';
}

export function formatMessageDate(timestamp?: number): ReactNode {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(padTimePart).join(':');
  const day = padTimePart(date.getDate());
  const month = padTimePart(date.getMonth() + 1);

  return (
    <span className="tool-date-label">
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

  return <span className="ml-2 font-normal normal-case text-[var(--vscode-descriptionForeground)]">{label}</span>;
}

export function formatMessageUsagePill(usage?: ChatMessageUsageEstimate): ReactNode {
  const label = getUsageLabel(usage);
  if (!label) return null;

  return <span className="tool-usage-pill">{label}</span>;
}

function getUsageLabel(usage?: ChatMessageUsageEstimate): string | undefined {
  const tokens = usage?.tokens || (usage?.promptTokens || 0) + (usage?.completionTokens || 0);
  const cost = usage?.costUsd !== undefined ? formatCost(usage.costUsd) : '';
  const tokenText = tokens ? `${formatTokens(tokens)} tok` : '';
  const label = [tokenText, cost].filter(Boolean).join(' · ');

  return label || undefined;
}

function padTimePart(value: number): string {
  return String(value).padStart(2, '0');
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}

function formatCost(costUsd: number): string {
  if (costUsd === 0) return '$0.00';
  return costUsd < 0.0001 ? `~$${costUsd.toFixed(6)}` : `~$${costUsd.toFixed(4)}`;
}
