import { useI18n } from '../../../i18n';
import type { Chat } from '../../../types';

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
