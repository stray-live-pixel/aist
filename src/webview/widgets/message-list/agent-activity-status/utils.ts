import { type TranslationKey, useI18n } from '../../../shared/i18n';
import type { Chat, ChatModelRequestPhase, ChatModelRequestStatus } from '../../../shared/types';

/**
 * Что это: переводит внутренний статус выполнения в короткий текст для UI.
 * Зачем нужно: MessageList получает технический enum, а пользователю нужен человекочитаемый статус.
 */
export function formatActivity(
  activity: Chat['activity'],
  t: ReturnType<typeof useI18n>['t'],
  modelRequest?: Chat['modelRequest']
): string {
  if (modelRequest?.phase === 'failed') {
    return t('activity.requestFailed');
  }

  if (modelRequest?.phase === 'retrying') {
    return t('activity.requestRetrying');
  }

  switch (activity) {
    case 'waitingForApproval':
      return t('activity.waitingForApproval');
    case 'runningTool':
      return t('activity.runningTool');
    case 'answering':
      return t('activity.answering');
    case 'stopping':
      return t('activity.stopping');
    default:
      return t('activity.thinking');
  }
}

export function formatModelRequestPhase(phase: ChatModelRequestPhase, t: ReturnType<typeof useI18n>['t']): string {
  return t(`modelRequest.phase.${phase}` as TranslationKey);
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

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

/**
 * Что это: fallback-описание активности, когда extension не прислал подробность.
 * Зачем нужно: пользователь не должен видеть пустую вторую строку во время долгой операции.
 */
export function getDefaultDetail(activity: Chat['activity'], t: ReturnType<typeof useI18n>['t']): string {
  switch (activity) {
    case 'waitingForApproval':
      return t('activity.detail.waitingForApproval');
    case 'runningTool':
      return t('activity.detail.runningTool');
    case 'answering':
      return t('activity.detail.answering');
    case 'stopping':
      return t('activity.detail.stopping');
    default:
      return t('activity.thinking');
  }
}
