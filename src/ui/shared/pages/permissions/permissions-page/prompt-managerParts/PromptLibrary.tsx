import { Plus } from 'lucide-react';
import { memo, useState } from 'react';

import { useI18n } from '../../../../shared/i18n';
import { type AgentInstructionKind, type AgentItemScope, type AgentPromptConfig } from '../../../../shared/types';
import { Button, Card } from '../../../../shared/ui';
import styles from '../../PermissionsPage.module.scss';
import { PromptItemCard } from './PromptItemCard';
import { PromptItemEditor } from './PromptItemEditor';
import { PromptLibraryKind } from './PromptLibraryKind';
import { getLibraryItems } from './getLibraryItems';

export const PromptLibrary = memo(function PromptLibrary({
  kind,
  scope,
  promptConfig
}: {
  kind: PromptLibraryKind;
  scope: AgentItemScope;
  promptConfig: AgentPromptConfig;
}) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const itemKind: AgentInstructionKind = kind === 'instructions' ? 'instruction' : 'mode';
  const items = getLibraryItems(promptConfig, scope, itemKind);

  return (
    <Card
      title={t(`settings.promptManager.${itemKind}.${scope}.title` as never)}
      description={
        itemKind === 'instruction'
          ? t('settings.promptManager.instruction.description')
          : t('settings.promptManager.mode.description')
      }
      actions={
        <Button size="sm" leadingIcon={<Plus size={14} />} onClick={() => setAdding(true)}>
          {itemKind === 'instruction'
            ? t('settings.promptManager.addInstruction')
            : t('settings.promptManager.addRole')}
        </Button>
      }
    >
      {adding ? (
        <PromptItemEditor
          scope={scope}
          kind={itemKind}
          onCancel={() => setAdding(false)}
          onSaved={() => setAdding(false)}
        />
      ) : null}
      <div className={styles.list}>
        {items.map((item) => (
          <PromptItemCard key={`${item.scope}:${item.id}`} item={item} />
        ))}
        {!items.length && !adding ? <p className={styles.empty}>{t('settings.promptManager.empty')}</p> : null}
      </div>
    </Card>
  );
});
