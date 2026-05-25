/**
 * Что это: строка статуса активного запуска агента внутри истории чата.
 * Зачем нужно: показывает не только общий статус, но и честную деталь текущей
 * операции, чтобы пользователь видел, что агент продолжает работу.
 * Пример использования: <AgentActivityStatus activity="thinking" detail="Calling OpenRouter..." />.
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useI18n } from '../../../shared/i18n';
import { AistAnimatedLogo } from '../../../shared/ui/AistLogo';
import styles from './AgentActivityStatus.module.scss';
import type { AgentActivityStatusProps } from './types';
import { formatActivity, getDefaultDetail } from './utils';

export function AgentActivityStatus({ activity, detail }: AgentActivityStatusProps) {
  const { t } = useI18n();
  const secondaryText = detail || getDefaultDetail(activity, t);

  return (
    <div className={styles.root}>
      <AistAnimatedLogo className={styles.logo} />
      <div className={styles.content}>
        <div className={styles.title}>{formatActivity(activity, t)}</div>
        <div className={styles.detail}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{secondaryText}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
