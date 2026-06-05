import { Save } from 'lucide-react';
import { useState } from 'react';

import { useI18n } from '../../../../i18n';
import { agentActions } from '../../../../lib/agentActions';
import {
  type AgentInstructionItem,
  type AgentInstructionKind,
  type AgentItemScope,
  type AgentModeItem
} from '../../../../types';
import { Button, Card, TextArea, TextField } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';
import { scopeLabel } from '../utils';

export function PromptItemEditor({
  item,
  scope,
  kind,
  onCancel,
  onSaved
}: {
  item?: AgentInstructionItem | AgentModeItem;
  scope: AgentItemScope;
  kind: AgentInstructionKind;
  onCancel(): void;
  onSaved(): void;
}) {
  const { t } = useI18n();
  const [label, setLabel] = useState(item?.label || '');
  const [content, setContent] = useState(item ? (item.kind === 'instruction' ? item.content : item.instructions) : '');
  const canSave = Boolean(label.trim());
  const kindLabel =
    kind === 'instruction' ? t('settings.promptManager.kind.instruction') : t('settings.promptManager.kind.mode');

  return (
    <Card
      title={
        item
          ? t('settings.promptManager.editItem', { label: item.label })
          : t('settings.promptManager.newItem', { kind: kindLabel })
      }
      description={t('settings.promptManager.editorDescription', { scope: scopeLabel(scope, t), kind: kindLabel })}
    >
      <div className={styles.formGrid}>
        <TextField
          label={t('common.name')}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          autoFocus
        />
        <TextArea
          label={t('settings.promptManager.instructionText')}
          rows={8}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <div className={styles.actions}>
          <Button
            size="sm"
            variant="primary"
            disabled={!canSave}
            leadingIcon={<Save size={13} />}
            onClick={() => {
              agentActions.upsertPromptItem({ scope, kind, id: item?.id, label: label.trim(), content });
              onSaved();
            }}
          >
            {t('common.save')}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
