import { Copy, Trash2 } from 'lucide-react';
import { memo, useState } from 'react';

import { useI18n } from '../../../../i18n';
import { agentActions } from '../../../../lib/agentActions';
import { type AgentInstructionItem, type AgentModeItem } from '../../../../types';
import { Button, Card } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';
import { scopeLabel } from '../utils';
import { MarkdownPreview } from './MarkdownPreview';
import { PromptItemEditor } from './PromptItemEditor';

export const PromptItemCard = memo(function PromptItemCard({ item }: { item: AgentInstructionItem | AgentModeItem }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const content = item.kind === 'instruction' ? item.content : item.instructions;

  if (editing) {
    return (
      <PromptItemEditor
        item={item}
        scope={item.scope}
        kind={item.kind}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  return (
    <Card
      title={item.label}
      description={t('settings.promptManager.itemDescription', {
        scope: scopeLabel(item.scope, t),
        kind:
          item.kind === 'instruction'
            ? t('settings.promptManager.kind.instruction')
            : t('settings.promptManager.kind.mode'),
        id: item.id
      })}
      actions={
        <div className={styles.actions}>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            {t('common.edit')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            leadingIcon={<Copy size={13} />}
            onClick={() => agentActions.duplicatePromptItem(item.scope, item.kind, item.id)}
          >
            {t('common.copy')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            leadingIcon={<Trash2 size={13} />}
            onClick={() => agentActions.deletePromptItem(item.scope, item.kind, item.id)}
          >
            {t('common.delete')}
          </Button>
        </div>
      }
    >
      <MarkdownPreview markdown={content} emptyText={t('systemInstructions.noAdditional')} />
    </Card>
  );
});
