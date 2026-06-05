import { Lightbulb } from 'lucide-react';

import { type AgentReflectionCandidate } from '../../../../types';
import { Badge } from '../../../../ui';
import styles from '../SubagentMessageCard.module.scss';
import { MemoryCandidateCard } from './MemoryCandidateCard';

export function MemoryCandidateList({
  chatId,
  candidates,
  candidateCount
}: {
  chatId: string;
  candidates: AgentReflectionCandidate[];
  candidateCount: number;
}) {
  if (!candidates.length) {
    return (
      <div className={styles.candidateEmpty}>
        {candidateCount > 0
          ? 'Все предложения памяти этого запуска уже обработаны.'
          : 'Субагент не нашёл новых безопасных заметок для памяти.'}
      </div>
    );
  }

  return (
    <div className={styles.candidateList}>
      <div className={styles.candidateIntro}>
        <Lightbulb size={15} />
        <strong>Предложения для памяти</strong>
        <Badge tone="warning">нужно решение</Badge>
      </div>
      {candidates.map((candidate) => (
        <MemoryCandidateCard key={candidate.id} chatId={chatId} candidate={candidate} />
      ))}
    </div>
  );
}
