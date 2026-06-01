import { Bot, CheckCircle2, ExternalLink, Lightbulb, Save, Sparkles, X, XCircle } from 'lucide-react';

import { type TranslationKey, useI18n } from '../../../shared/i18n';
import { agentActions } from '../../../shared/lib/agentActions';
import type { AgentReflectionCandidate, ChatMessage, SubagentRun } from '../../../shared/types';
import { Badge, Button, Text } from '../../../shared/ui';
import { AistAnimatedLogo } from '../../../shared/ui/AistLogo';
import styles from './SubagentMessageCard.module.scss';
import type { SubagentMessageCardProps } from './types';

/**
 * Что это: карточка persisted субагента внутри основной истории чата.
 * Зачем нужно: запуск memory analysis остаётся в правильной хронологии и открывает отдельные детали без попадания в model context.
 */
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

/**
 * Что это: список кандидатов конкретного запуска memory-субагента.
 * Зачем нужно: первый запуск не показывает предложения второго запуска, а settings page продолжает видеть общий список.
 */
function MemoryCandidateList({
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

/**
 * Что это: карточка одного кандидата памяти.
 * Зачем нужно: пользователь принимает или отклоняет конкретное предложение прямо в flow анализа.
 */
function MemoryCandidateCard({ chatId, candidate }: { chatId: string; candidate: AgentReflectionCandidate }) {
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

function getMessageStatus(input: { message: ChatMessage; subagentRun?: SubagentRun }): 'running' | 'success' | 'error' {
  if (input.subagentRun?.status === 'error' || input.message.status === 'error') {
    return 'error';
  }

  if (input.subagentRun?.status === 'running' || input.message.status === 'running') {
    return 'running';
  }

  return 'success';
}

function filterRunCandidates(input: {
  message: ChatMessage;
  runId?: string;
  candidates: AgentReflectionCandidate[];
}): AgentReflectionCandidate[] {
  const candidateIds = Array.isArray(input.message.result?.candidateIds)
    ? new Set(input.message.result.candidateIds.filter((id): id is string => typeof id === 'string'))
    : undefined;

  return input.candidates.filter((candidate) => {
    if (candidate.status !== 'pending') {
      return false;
    }
    if (candidateIds) {
      return candidateIds.has(candidate.id);
    }
    return Boolean(input.runId && candidate.sourceSubagentRunId === input.runId);
  });
}

function getCandidateCount(input: {
  message: ChatMessage;
  subagentRun?: SubagentRun;
  candidates: AgentReflectionCandidate[];
}): number {
  const fromMessage = input.message.result?.candidateCount;
  if (typeof fromMessage === 'number') {
    return fromMessage;
  }

  if (
    input.subagentRun?.result &&
    typeof input.subagentRun.result === 'object' &&
    'candidateCount' in input.subagentRun.result
  ) {
    const candidateCount = (input.subagentRun.result as { candidateCount?: unknown }).candidateCount;
    if (typeof candidateCount === 'number') {
      return candidateCount;
    }
  }

  return input.candidates.length;
}

function getDetailText(input: {
  message: ChatMessage;
  subagentRun?: SubagentRun;
  status: 'running' | 'success' | 'error';
}): string {
  const model = input.subagentRun?.model ? ` · модель: ${formatModelLabel(input.subagentRun.model)}` : '';
  if (input.status === 'running') {
    return `Субагент памяти анализирует чат${model}`;
  }

  return `${input.message.content || 'Анализ памяти завершён.'}${model}`;
}

function getBadgeTone(status: 'running' | 'success' | 'error') {
  if (status === 'error') {
    return 'danger' as const;
  }
  if (status === 'success') {
    return 'success' as const;
  }
  return 'accent' as const;
}

function getStatusText(status: 'running' | 'success' | 'error'): string {
  if (status === 'running') {
    return 'В работе';
  }
  if (status === 'error') {
    return 'Ошибка';
  }
  return 'Готово';
}

function getStatusIcon(status: 'running' | 'success' | 'error') {
  if (status === 'success') {
    return <CheckCircle2 size={12} />;
  }
  if (status === 'error') {
    return <XCircle size={12} />;
  }
  return <Sparkles size={12} />;
}

function getCandidateKindLabelKey(kind: AgentReflectionCandidate['kind']): TranslationKey {
  switch (kind) {
    case 'memory_preference':
      return 'settings.memory.candidate.memoryPreference';
    case 'project_lesson':
      return 'settings.memory.candidate.projectLesson';
    case 'verification_command':
      return 'settings.memory.candidate.verificationCommand';
    case 'declarative_definition':
      return 'settings.memory.candidate.declarativeDefinition';
  }
}

function formatModelLabel(model: string): string {
  return (
    model
      .replace(/^openrouter[:/]/i, '')
      .replace(/^codex[:/]/i, '')
      .trim() || model
  );
}
