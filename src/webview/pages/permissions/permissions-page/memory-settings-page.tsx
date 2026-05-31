import { Database, Lightbulb, Save, Trash2, X } from 'lucide-react';
import { memo, useMemo } from 'react';

import { type TranslationKey, useI18n } from '../../../shared/i18n';
import { agentActions } from '../../../shared/lib/agentActions';
import type {
  AgentMemoryItem,
  AgentMemoryScope,
  AgentReflectionCandidate,
  AuxiliaryModelsSettings,
  ModelOption,
  ReasoningEffort
} from '../../../shared/types';
import { Badge, Button, Card, Checkbox, Select } from '../../../shared/ui';
import styles from '../PermissionsPage.module.scss';

export const MemorySettingsPage = memo(function MemorySettingsPage({
  chatId,
  reflectionCandidates,
  memoryItems,
  auxiliaryModels,
  models
}: {
  chatId: string;
  reflectionCandidates: AgentReflectionCandidate[];
  memoryItems: AgentMemoryItem[];
  auxiliaryModels: AuxiliaryModelsSettings;
  models: ModelOption[];
}) {
  const { t } = useI18n();
  const globalItems = memoryItems.filter((item) => item.scope === 'global');
  const projectItems = memoryItems.filter((item) => item.scope === 'project');
  const pendingCandidates = reflectionCandidates.filter((candidate) => candidate.status === 'pending');
  const modelOptions = useMemo(
    () => [
      { value: '', label: t('settings.auxiliary.usePrimaryModel') },
      ...models.map((model) => ({ value: model.id, label: `${model.name} (${model.id})` }))
    ],
    [models, t]
  );
  const reasoningOptions = useMemo(
    () => [
      { value: 'auto', label: t('reasoning.auto') },
      { value: 'low', label: t('reasoning.low') },
      { value: 'medium', label: t('reasoning.medium') },
      { value: 'high', label: t('reasoning.high') }
    ],
    [t]
  );

  return (
    <div className={styles.sectionStack}>
      <Card
        title="Субагент памяти"
        description="Выбирает релевантные заметки и анализирует чат для новых предложений памяти."
      >
        <div className={styles.formGrid}>
          <Select
            label="Модель субагента памяти"
            hint="Если модель не выбрана, используется модель текущего чата."
            value={auxiliaryModels.memory.model}
            options={modelOptions}
            onChange={(event) => agentActions.setAuxiliaryModelSettings('memory', { model: event.target.value })}
          />
          <Select
            label={t('settings.auxiliary.reasoningEffort')}
            value={auxiliaryModels.memory.reasoningEffort}
            options={reasoningOptions}
            onChange={(event) =>
              agentActions.setAuxiliaryModelSettings('memory', {
                reasoningEffort: event.target.value as ReasoningEffort
              })
            }
          />
        </div>
      </Card>
      {pendingCandidates.length ? (
        <Card title={t('settings.memory.inboxTitle')} description={t('settings.memory.inboxDescription')}>
          <div className={styles.list}>
            {pendingCandidates.map((candidate) => (
              <ReflectionCandidateCard key={candidate.id} chatId={chatId} candidate={candidate} />
            ))}
          </div>
        </Card>
      ) : null}
      <Card title={t('settings.memory.title')} description={t('settings.memory.description')}>
        <div className={styles.list}>
          <MemoryScopeSection scope="global" items={globalItems} />
          <MemoryScopeSection scope="project" items={projectItems} />
        </div>
      </Card>
    </div>
  );
});

const ReflectionCandidateCard = memo(function ReflectionCandidateCard({
  chatId,
  candidate
}: {
  chatId: string;
  candidate: AgentReflectionCandidate;
}) {
  const { t } = useI18n();

  return (
    <div className={styles.reflectionCandidate}>
      <div className={styles.memoryItemBody}>
        <div className={styles.statusRow}>
          <Lightbulb size={15} />
          <strong>{candidate.title}</strong>
          <Badge>{t(getCandidateKindLabelKey(candidate.kind))}</Badge>
          {candidate.scope ? <Badge>{candidate.scope}</Badge> : null}
        </div>
        <p className={styles.preWrapText}>{candidate.content}</p>
        {candidate.reason ? <span className={styles.mutedText}>{candidate.reason}</span> : null}
      </div>
      <div className={styles.actions}>
        <Button
          size="sm"
          leadingIcon={<Save size={13} />}
          onClick={() => agentActions.saveReflectionCandidate(chatId, candidate.id)}
        >
          {t('settings.memory.saveCandidate')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          leadingIcon={<X size={13} />}
          onClick={() => agentActions.rejectReflectionCandidate(chatId, candidate.id)}
        >
          {t('settings.memory.rejectCandidate')}
        </Button>
      </div>
    </div>
  );
});

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

const MemoryScopeSection = memo(function MemoryScopeSection({
  scope,
  items
}: {
  scope: AgentMemoryScope;
  items: AgentMemoryItem[];
}) {
  const { t } = useI18n();

  return (
    <section className={styles.memoryScope}>
      <div className={styles.statusRow}>
        <Database size={15} />
        <strong>{scope === 'global' ? t('settings.memory.global') : t('settings.memory.project')}</strong>
        <Badge>{String(items.length)}</Badge>
      </div>
      {items.length ? (
        <div className={styles.list}>
          {items.map((item) => (
            <MemoryItemCard key={`${item.scope}:${item.id}`} item={item} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{t('settings.memory.empty')}</p>
      )}
    </section>
  );
});

const MemoryItemCard = memo(function MemoryItemCard({ item }: { item: AgentMemoryItem }) {
  const { t } = useI18n();

  return (
    <div className={styles.memoryItem}>
      <div className={styles.memoryItemBody}>
        <p className={styles.preWrapText}>{item.note}</p>
        <span className={styles.mutedText}>
          {t('settings.memory.updated', { date: new Date(item.updatedAt || item.createdAt).toLocaleString() })}
        </span>
      </div>
      <div className={styles.actions}>
        <Checkbox
          label={item.enabled ? t('common.enabled') : t('common.disabled')}
          checked={item.enabled}
          onChange={(event) => agentActions.setMemoryEnabled(item.scope, item.id, event.target.checked)}
        />
        <Button
          size="sm"
          variant="danger"
          leadingIcon={<Trash2 size={13} />}
          onClick={() => agentActions.deleteMemory(item.scope, item.id)}
        >
          {t('common.delete')}
        </Button>
      </div>
    </div>
  );
});
