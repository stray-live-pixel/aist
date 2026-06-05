/**
 * Что это: компактная строка статуса обращения к ИИ-модели.
 * Зачем нужно: единообразно показывает фазу запроса, длительность, провайдера и модель без технического URL.
 * Пример использования: <ModelRequestStatus request={chat.modelRequest} elapsedMs={elapsedMs} />.
 */
import { Ban, CheckCircle2, LoaderCircle, Radio, RotateCcw, Send, TriangleAlert } from 'lucide-react';

import { type TranslationKey, useI18n } from '../../i18n';
import type { ChatModelRequestPhase, ChatModelRequestStatus } from '../../types';
import styles from './ModelRequestStatus.module.scss';

export type ModelRequestStatusProps = {
  request: ChatModelRequestStatus;
  elapsedMs: number;
  className?: string;
};

type PhaseTone = 'progress' | 'success' | 'warning' | 'danger' | 'neutral';

const phaseIconByPhase: Record<ChatModelRequestPhase, typeof Send> = {
  sending: Send,
  receiving: LoaderCircle,
  streaming: Radio,
  completed: CheckCircle2,
  retrying: RotateCcw,
  failed: TriangleAlert,
  aborted: Ban
};

const phaseToneByPhase: Record<ChatModelRequestPhase, PhaseTone> = {
  sending: 'progress',
  receiving: 'progress',
  streaming: 'progress',
  completed: 'success',
  retrying: 'warning',
  failed: 'danger',
  aborted: 'neutral'
};

export function ModelRequestStatus({ request, elapsedMs, className }: ModelRequestStatusProps) {
  const { t } = useI18n();
  const Icon = phaseIconByPhase[request.phase];
  const tone = phaseToneByPhase[request.phase];
  const provider = formatModelRequestProvider(request.provider, t);

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')} title={`${provider} · ${request.model}`}>
      <span className={[styles.label, styles[tone]].join(' ')}>
        <Icon className={styles.icon} aria-hidden="true" />
        <span>{formatModelRequestPhase(request.phase, t)}</span>
      </span>
      <span className={styles.meta}>{formatDurationSeconds(elapsedMs)}</span>
      <span className={styles.meta}>{formatModelRequestAttempt(request, t)}</span>
      <span className={styles.meta}>{provider}</span>
      <span className={styles.model}>{request.model}</span>
    </div>
  );
}

export function formatModelRequestPhase(phase: ChatModelRequestPhase, t: ReturnType<typeof useI18n>['t']): string {
  return t(`modelRequest.phase.${phase}` as TranslationKey);
}

export function formatModelRequestAttempt(
  request: Pick<ChatModelRequestStatus, 'attempt' | 'maxAttempts'>,
  t: ReturnType<typeof useI18n>['t']
): string {
  return t('modelRequest.attempt', { attempt: request.attempt, max: request.maxAttempts });
}

export function formatModelRequestProvider(
  provider: ChatModelRequestStatus['provider'],
  t: ReturnType<typeof useI18n>['t']
): string {
  if (provider === 'codex') {
    return t('modelRequest.provider.codex');
  }

  if (provider === 'openrouter') {
    return t('modelRequest.provider.openrouter');
  }

  return t('modelRequest.provider.unknown');
}

export function formatDurationSeconds(ms: number): string {
  return `${Math.round(Math.max(0, ms) / 1000)}s`;
}
