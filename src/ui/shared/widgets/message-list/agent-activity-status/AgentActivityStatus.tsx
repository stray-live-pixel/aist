/**
 * Что это: строка статуса активного запуска агента внутри истории чата.
 * Зачем нужно: показывает не только общий статус, но и честную деталь текущей
 * операции, чтобы пользователь видел, что агент продолжает работу.
 * Пример использования: <AgentActivityStatus activity="thinking" detail="Calling OpenRouter..." />.
 */
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useI18n } from '../../../i18n';
import { AistAnimatedLogo } from '../../../ui/AistLogo';
import { ModelRequestStatus } from '../../../ui/model-request-status';
import styles from './AgentActivityStatus.module.scss';
import type { AgentActivityStatusProps } from './types';
import { formatActivity, getDefaultDetail } from './utils';

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
        {modelRequest ? (
          <ModelRequestStatus request={modelRequest} elapsedMs={elapsedMs} className={styles.request} />
        ) : null}
      </div>
    </div>
  );
}

function useModelRequestElapsed(modelRequest: AgentActivityStatusProps['modelRequest']): number {
  const [now, setNow] = useState(modelRequest?.durationMs ? modelRequest.startedAt + modelRequest.durationMs : 0);
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

    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [running, modelRequest?.startedAt]);

  if (!modelRequest) {
    return 0;
  }

  return modelRequest.durationMs ?? Math.max(0, now - modelRequest.startedAt);
}
