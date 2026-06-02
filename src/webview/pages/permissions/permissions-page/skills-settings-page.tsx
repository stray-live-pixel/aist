import { Save, Trash2 } from 'lucide-react';
import { memo, useCallback, useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { agentActions } from '../../../shared/lib/agentActions';
import type { AgentSkill, ToolPermissionMode } from '../../../shared/types';
import { Button, Card, Select, TextArea, TextField } from '../../../shared/ui';
import styles from '../PermissionsPage.module.scss';
import { BehaviorScopeTabs, type BehaviorTab } from './behavior-scope-tabs';
import { getPermissionOptions } from './utils';

/**
 * Что это: раздел пользовательских skills.
 * Зачем нужно: форма добавления и карточки редактирования отделены от общей страницы, а карточки memo-изированы для списков.
 */
export const SkillsSettingsPage = memo(function SkillsSettingsPage({ customSkills }: { customSkills: AgentSkill[] }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<BehaviorTab>('active');
  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState({
    label: '',
    description: '',
    command: '',
    permission: 'ask' as ToolPermissionMode
  });
  const scope = tab === 'active' ? undefined : tab;
  const scopedSkills = scope ? customSkills.filter((skill) => skill.scope === scope) : customSkills;

  const handleAddSkill = useCallback(() => {
    const label = newSkill.label.trim();
    const command = newSkill.command.trim();
    if (!label || !command || !scope) return;
    agentActions.addSkill(scope, label, newSkill.description.trim(), command, newSkill.permission);
    setNewSkill({ label: '', description: '', command: '', permission: 'ask' });
    setAddingSkill(false);
  }, [newSkill, scope]);

  return (
    <div className={styles.sectionStack}>
      <BehaviorScopeTabs activeTab={tab} includeActive subject="skills" onChange={setTab} />
      <Card
        title={t('settings.skills.title')}
        description={t('settings.skills.description')}
        actions={
          scope ? (
            <Button size="sm" onClick={() => setAddingSkill(true)}>
              {t('settings.skills.addSkill')}
            </Button>
          ) : null
        }
      >
        {scope && addingSkill ? (
          <div className={styles.formGrid}>
            <TextField
              label={t('common.name')}
              placeholder={t('settings.skills.namePlaceholder')}
              value={newSkill.label}
              onChange={(event) => setNewSkill((value) => ({ ...value, label: event.target.value }))}
              autoFocus
            />
            <TextField
              label={t('common.description')}
              placeholder={t('settings.skills.descriptionPlaceholder')}
              value={newSkill.description}
              onChange={(event) => setNewSkill((value) => ({ ...value, description: event.target.value }))}
            />
            <TextArea
              label={t('common.command')}
              rows={5}
              value={newSkill.command}
              onChange={(event) => setNewSkill((value) => ({ ...value, command: event.target.value }))}
            />
            <Select
              label={t('common.permission')}
              value={newSkill.permission}
              options={getPermissionOptions(t)}
              onChange={(event) =>
                setNewSkill((value) => ({ ...value, permission: event.target.value as ToolPermissionMode }))
              }
            />
            <div className={styles.actions}>
              <Button
                size="sm"
                variant="primary"
                disabled={!newSkill.label.trim() || !newSkill.command.trim()}
                onClick={handleAddSkill}
              >
                {t('common.add')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingSkill(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : null}
        {scopedSkills.length ? (
          <div className={styles.list}>
            {scopedSkills.map((skill) => (
              <SkillSettingsCard key={`${skill.scope}:${skill.id}`} skill={skill} readOnly={!scope} />
            ))}
          </div>
        ) : !addingSkill ? (
          <p className={styles.empty}>{t('settings.skills.empty')}</p>
        ) : null}
      </Card>
    </div>
  );
});

const SkillSettingsCard = memo(function SkillSettingsCard({
  skill,
  readOnly = false
}: {
  skill: AgentSkill;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState({
    label: skill.label,
    description: skill.description,
    command: skill.command,
    permission: skill.permission
  });
  const changed =
    draft.label !== skill.label ||
    draft.description !== skill.description ||
    draft.command !== skill.command ||
    draft.permission !== skill.permission;
  const canSave = !readOnly && changed && Boolean(draft.label.trim()) && Boolean(draft.command.trim());

  return (
    <Card title={skill.label} description={skill.id}>
      <div className={styles.formGrid}>
        <TextField
          label={t('common.name')}
          value={draft.label}
          onChange={(event) => setDraft((value) => ({ ...value, label: event.target.value }))}
          disabled={readOnly}
        />
        <TextField
          label={t('common.description')}
          value={draft.description}
          onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))}
          disabled={readOnly}
        />
        <TextArea
          label={t('common.command')}
          rows={5}
          value={draft.command}
          onChange={(event) => setDraft((value) => ({ ...value, command: event.target.value }))}
          disabled={readOnly}
        />
        <Select
          label={t('common.permission')}
          value={draft.permission}
          options={getPermissionOptions(t)}
          onChange={(event) =>
            setDraft((value) => ({ ...value, permission: event.target.value as ToolPermissionMode }))
          }
          disabled={readOnly}
        />
        {!readOnly ? (
          <div className={styles.actions}>
            <Button
              size="sm"
              variant="primary"
              leadingIcon={<Save size={13} />}
              disabled={!canSave}
              onClick={() =>
                agentActions.updateSkill({
                  scope: skill.scope,
                  skillId: skill.id,
                  label: draft.label.trim(),
                  description: draft.description.trim(),
                  command: draft.command.trim(),
                  permission: draft.permission
                })
              }
            >
              {t('common.save')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              leadingIcon={<Trash2 size={13} />}
              onClick={() => agentActions.deleteSkill(skill.scope, skill.id)}
            >
              {t('common.delete')}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
});
