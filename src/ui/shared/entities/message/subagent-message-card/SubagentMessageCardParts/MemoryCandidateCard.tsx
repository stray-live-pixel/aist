import { Lightbulb, Save, X } from 'lucide-react';

import { useI18n } from '../../../../shared/i18n';
import { agentActions } from '../../../../shared/lib/agentActions';
import { type AgentReflectionCandidate } from '../../../../shared/types';
import { Badge, Button } from '../../../../shared/ui';
import styles from '../SubagentMessageCard.module.scss';
import { getCandidateKindLabelKey } from './getCandidateKindLabelKey';

export function MemoryCandidateCard({ chatId, candidate }: { chatId: string; candidate: AgentReflectionCandidate }) {
  const { t } = useI18n();

  return (
    <div className={styles.candidateCard}>
      <div className={styles.candidateBody}>
        <div className={styles.candidateTitleRow}>
          <Lightbulb size={15} />
          <strong>{candidate.title}</strong>
          <Badge>{t(getCandidateKindLabelKey(candidate.kind))}</Badge>
          {candidate.scope ? <Badge>{candidate.scope}</Badge> : null}
        </div>
        <p className={styles.candidateContent}>{candidate.content}</p>
        {candidate.reason ? <span className={styles.candidateReason}>{candidate.reason}</span> : null}
      </div>
      <div className={styles.candidateActions}>
        <Button
          size="sm"
          leadingIcon={<Save size={13} />}
          onClick={() => agentActions.saveReflectionCandidate(chatId, candidate.id)}
        >
          Сохранить
        </Button>
        <Button
          size="sm"
          variant="secondary"
          leadingIcon={<X size={13} />}
          onClick={() => agentActions.rejectReflectionCandidate(chatId, candidate.id)}
        >
          Отклонить
        </Button>
      </div>
    </div>
  );
}
