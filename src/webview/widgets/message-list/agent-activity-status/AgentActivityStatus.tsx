/**
 * Что это: строка статуса активного запуска агента внутри истории чата.
 * Зачем нужно: показывает не только общий статус, но и честную деталь текущей
 * операции, чтобы пользователь видел, что агент продолжает работу.
 * Пример использования: <AgentActivityStatus activity="thinking" detail="Calling OpenRouter..." />.
 */
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useI18n } from '../../../shared/i18n';
import { AistAnimatedLogo } from '../../../shared/ui/AistLogo';
import styles from './AgentActivityStatus.module.scss';
import type { AgentActivityStatusProps } from './types';
import {
  formatActivity,
  formatDuration,
  formatModelRequestPhase,
  formatModelRequestProvider,
  getDefaultDetail
} from './utils';

export function AgentActivityStatus({ activity, detail, modelRequest }: AgentActivityStatusProps) {
  const { t } = useI18n();
  const secondaryText = detail || getDefaultDetail(activity, t);
  const elapsedMs = useModelRequestElapsed(modelRequest);

  return (
    <div className={styles.root}>
      <AistAnimatedLogo className={styles.logo} />
      <div className={styles.content}>
        <div className={styles.title}>{formatActivity(activity, t, modelRequest)}</div>
        <div className={styles.detail}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{secondaryText}</ReactMarkdown>
        </div>
        {modelRequest ? <ModelRequestDetails request={modelRequest} elapsedMs={elapsedMs} /> : null}
      </div>
    </div>
  );
}

function ModelRequestDetails({
  request,
  elapsedMs
}: {
  request: NonNullable<AgentActivityStatusProps['modelRequest']>;
  elapsedMs: number;
}) {
  const { t } = useI18n();
  const statusText =
    request.httpStatus !== undefined
      ? t('modelRequest.httpStatus', {
          status: request.httpStatus,
          statusText: request.httpStatusText || ''
        }).trim()
      : undefined;

  return (
    <div className={styles.request}>
      <div className={styles.requestMeta}>
        <span>{formatModelRequestPhase(request.phase, t)}</span>
        <span>{formatModelRequestProvider(request.provider, t)}</span>
        <span title={request.model}>{request.model}</span>
        <span>{t('modelRequest.requestNumber', { number: request.requestNumber })}</span>
        <span>{t('modelRequest.attempt', { attempt: request.attempt, max: request.maxAttempts })}</span>
        <span>{t('modelRequest.elapsed', { duration: formatDuration(elapsedMs) })}</span>
        {request.stream ? <span>{t('modelRequest.streaming')}</span> : null}
        {request.retryable ? <span>{t('modelRequest.retryable')}</span> : null}
      </div>
      {statusText ? <div className={styles.requestLine}>{statusText}</div> : null}
      {request.endpoint ? (
        <div className={styles.requestLine}>
          {t('modelRequest.endpoint', {
            method: request.method || 'POST',
            endpoint: request.endpoint
          })}
        </div>
      ) : null}
      {request.error ? <div className={styles.requestError}>{request.error}</div> : null}
      {request.responseBody ? (
        <details className={styles.responseBody}>
          <summary>{t('modelRequest.responseBody')}</summary>
          <pre>{request.responseBody}</pre>
        </details>
      ) : null}
    </div>
  );
}

function useModelRequestElapsed(modelRequest: AgentActivityStatusProps['modelRequest']): number {
  const [now, setNow] = useState(Date.now());
  const running =
    modelRequest &&
    modelRequest.durationMs === undefined &&
    modelRequest.phase !== 'completed' &&
    modelRequest.phase !== 'failed' &&
    modelRequest.phase !== 'aborted';

  useEffect(() => {
    if (!running) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [running, modelRequest?.startedAt]);

  if (!modelRequest) {
    return 0;
  }

  return modelRequest.durationMs ?? Math.max(0, now - modelRequest.startedAt);
}
