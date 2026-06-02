import { Bot, ExternalLink } from 'lucide-react';

import { Badge, Button, Text } from '../../../../shared/ui';
import { AistAnimatedLogo } from '../../../../shared/ui/AistLogo';
import styles from '../SubagentMessageCard.module.scss';
import { type SubagentMessageCardProps } from '../types';
import { MemoryCandidateList } from './MemoryCandidateList';
import { filterRunCandidates } from './filterRunCandidates';
import { getBadgeTone } from './getBadgeTone';
import { getCandidateCount } from './getCandidateCount';
import { getDetailText } from './getDetailText';
import { getMessageStatus } from './getMessageStatus';
import { getStatusIcon } from './getStatusIcon';
import { getStatusText } from './getStatusText';

export function SubagentMessageCard({
  chatId,
  message,
  subagentRun,
  candidates,
  onOpenSubagent
}: SubagentMessageCardProps) {
  const runId = message.subagentRunId || message.subagent?.runId || subagentRun?.id;
  const status = getMessageStatus({ message, subagentRun });
  const runCandidates = filterRunCandidates({ message, runId, candidates });
  const candidateCount = getCandidateCount({ message, subagentRun, candidates: runCandidates });

  return (
    <section className={styles.root} aria-label="Сообщение субагента">
      <div className={styles.header}>
        <div className={styles.iconWrap}>
          <Bot size={17} />
        </div>
        <div className={styles.titleGroup}>
          <div className={styles.titleRow}>
            <strong>{subagentRun?.title || message.subagent?.title || 'Субагент памяти'}</strong>
            <Badge tone={getBadgeTone(status)} icon={getStatusIcon(status)}>
              {getStatusText(status)}
            </Badge>
          </div>
          <Text variant="caption" className={styles.detail}>
            {getDetailText({ message, subagentRun, status })}
          </Text>
        </div>
        {runId ? (
          <Button
            size="sm"
            variant="ghost"
            leadingIcon={<ExternalLink size={13} />}
            onClick={() => onOpenSubagent(runId)}
          >
            Детали
          </Button>
        ) : null}
      </div>

      {status === 'running' ? (
        <div className={styles.runningLoader}>
          <AistAnimatedLogo className={styles.runningLogo} />
          <div className={styles.runningContent}>
            <div className={styles.runningTitle}>Субагент памяти работает</div>
            <div className={styles.runningDetail}>Собираем историю чата и запускаем memory-модель без tool loop.</div>
          </div>
        </div>
      ) : null}

      {status !== 'running' ? (
        <MemoryCandidateList chatId={chatId} candidates={runCandidates} candidateCount={candidateCount} />
      ) : null}
    </section>
  );
}
