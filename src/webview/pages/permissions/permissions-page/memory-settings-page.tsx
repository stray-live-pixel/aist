import { Database, Trash2 } from 'lucide-react';
import { memo } from 'react';

import { useI18n } from '../../../shared/i18n';
import { agentActions } from '../../../shared/lib/agentActions';
import type { AgentMemoryItem, AgentMemoryScope } from '../../../shared/types';
import { Badge, Button, Card, Checkbox } from '../../../shared/ui';
import styles from '../PermissionsPage.module.scss';

export const MemorySettingsPage = memo(function MemorySettingsPage({
  memoryItems
}: {
  memoryItems: AgentMemoryItem[];
}) {
  const { t } = useI18n();
  const globalItems = memoryItems.filter((item) => item.scope === 'global');
  const projectItems = memoryItems.filter((item) => item.scope === 'project');

  return (
    <div className={styles.sectionStack}>
      <Card title={t('settings.memory.title')} description={t('settings.memory.description')}>
        <div className={styles.list}>
          <MemoryScopeSection scope="global" items={globalItems} />
          <MemoryScopeSection scope="project" items={projectItems} />
        </div>
      </Card>
    </div>
  );
});

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
