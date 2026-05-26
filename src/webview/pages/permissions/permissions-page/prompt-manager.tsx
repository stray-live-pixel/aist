import { Copy, HelpCircle, Plus, Save, Trash2, X } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useI18n } from '../../../shared/i18n';
import { agentActions } from '../../../shared/lib/agentActions';
import type {
  AgentInstructionItem,
  AgentInstructionKind,
  AgentItemRef,
  AgentItemScope,
  AgentModeItem,
  AgentPromptConfig,
  AgentPromptPreset
} from '../../../shared/types';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ModalBackdrop,
  ModalHeader,
  ModalSurface,
  Select,
  TextArea,
  TextField
} from '../../../shared/ui';
import { IconButton } from '../../../shared/ui/IconButton';
import styles from '../PermissionsPage.module.scss';
import { BehaviorScopeTabs, type BehaviorTab } from './behavior-scope-tabs';
import { parseRefKey, refKey, scopeLabel } from './utils';

type PromptLibraryKind = 'instructions' | 'roles';

/**
 * Что это: самостоятельная страница управления инструкциями.
 * Зачем нужно: пресеты вынесены отдельно, поэтому здесь остаются активный набор и библиотека правил без смешения сценариев.
 */
export function InstructionsSettingsPage({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  const [tab, setTab] = useState<BehaviorTab>('active');

  return (
    <div className={styles.sectionStack}>
      <PromptManagerIntro
        titleKey="settings.promptManager.instructionsTitle"
        descriptionKey="settings.promptManager.instructionsDescription"
      />
      <BehaviorScopeTabs activeTab={tab} includeActive subject="instructions" onChange={setTab} />
      {tab === 'active' ? <ActivePromptSet promptConfig={promptConfig} /> : null}
      {tab !== 'active' ? <PromptLibrary kind="instructions" scope={tab} promptConfig={promptConfig} /> : null}
    </div>
  );
}

/**
 * Что это: самостоятельная страница управления ролями агента.
 * Зачем нужно: роль — один основной системный образ поведения, поэтому она настраивается отдельно от дополнительных инструкций и пресетов.
 */
export function RolesSettingsPage({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  const [tab, setTab] = useState<BehaviorTab>('active');

  return (
    <div className={styles.sectionStack}>
      <PromptManagerIntro
        titleKey="settings.promptManager.rolesTitle"
        descriptionKey="settings.promptManager.rolesDescription"
      />
      <BehaviorScopeTabs activeTab={tab} includeActive subject="roles" onChange={setTab} />
      {tab === 'active' ? <ActiveRoleCard promptConfig={promptConfig} /> : null}
      {tab !== 'active' ? <PromptLibrary kind="roles" scope={tab} promptConfig={promptConfig} /> : null}
    </div>
  );
}

/**
 * Что это: самостоятельная страница управления пресетами поведения.
 * Зачем нужно: пресеты меняют сразу роль и набор инструкций, поэтому их редактирование отделено от библиотеки инструкций.
 */
export function PresetsSettingsPage({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  const [tab, setTab] = useState<BehaviorTab>('active');

  return (
    <div className={styles.sectionStack}>
      <PromptManagerIntro
        titleKey="settings.promptManager.presetsPageTitle"
        descriptionKey="settings.promptManager.presetsPageDescription"
      />
      <BehaviorScopeTabs activeTab={tab} includeActive subject="presets" onChange={setTab} />
      {tab === 'active' ? <ActivePresetCard promptConfig={promptConfig} /> : null}
      {tab !== 'active' ? <PromptPriorityManager promptConfig={promptConfig} scope={tab} /> : null}
    </div>
  );
}

/**
 * Что это: совместимый alias для dialog быстрых системных инструкций.
 * Зачем нужно: старый импорт из SystemInstructionLabel остаётся рабочим, но фактически открывает новую страницу ролей.
 */
export function ModesSettingsPage({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  return <RolesSettingsPage promptConfig={promptConfig} />;
}

/**
 * Что это: совместимый фасад старого PromptManager.
 * Зачем нужно: внешний код может ещё передавать focus/defaultTab; теперь выбор страницы определяется фокусом, а вкладки больше не смешивают роли и инструкции.
 */
export function PromptManager({
  promptConfig,
  focus = 'instructions'
}: {
  promptConfig: AgentPromptConfig;
  defaultTab?: 'global' | 'local' | 'priorities';
  focus?: 'instructions' | 'modes';
}) {
  return focus === 'modes' ? (
    <RolesSettingsPage promptConfig={promptConfig} />
  ) : (
    <InstructionsSettingsPage promptConfig={promptConfig} />
  );
}

function PromptManagerIntro({
  titleKey,
  descriptionKey
}: {
  titleKey:
    | 'settings.promptManager.instructionsTitle'
    | 'settings.promptManager.rolesTitle'
    | 'settings.promptManager.presetsPageTitle';
  descriptionKey:
    | 'settings.promptManager.instructionsDescription'
    | 'settings.promptManager.rolesDescription'
    | 'settings.promptManager.presetsPageDescription';
}) {
  const { t } = useI18n();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <Card
      title={t(titleKey)}
      description={t(descriptionKey)}
      actions={
        <Button size="sm" variant="ghost" leadingIcon={<HelpCircle size={14} />} onClick={() => setHelpOpen(true)}>
          {t('settings.promptManager.guide')}
        </Button>
      }
    >
      <div className={styles.reliabilityHint}>{t('settings.promptManager.autosaveHint')}</div>
      {helpOpen ? <PromptHelpDialog onClose={() => setHelpOpen(false)} /> : null}
    </Card>
  );
}

const ActiveRoleCard = memo(function ActiveRoleCard({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  const { t } = useI18n();
  const allRoles = useMemo(() => [...promptConfig.globalModes, ...promptConfig.localModes], [promptConfig]);
  const [roleKey, setRoleKey] = useState(promptConfig.activeModeRef ? refKey(promptConfig.activeModeRef) : '');
  const selectedRole = allRoles.find((role) => refKey(role) === roleKey);
  const currentRole = promptConfig.activeModeRef
    ? allRoles.find((role) => refKey(role) === refKey(promptConfig.activeModeRef!))
    : undefined;
  const changed = roleKey !== (promptConfig.activeModeRef ? refKey(promptConfig.activeModeRef) : '');

  return (
    <Card
      title={t('settings.promptManager.activeRoleTitle')}
      description={t('settings.promptManager.activeRoleDescription')}
      actions={
        <Button
          size="sm"
          variant="primary"
          disabled={!changed}
          onClick={() => agentActions.setActivePromptConfig(promptConfig.activeInstructionRefs, parseRefKey(roleKey))}
        >
          {t('settings.promptManager.applyRole')}
        </Button>
      }
    >
      <div className={styles.formGrid}>
        <Select
          label={t('systemInstructions.roleSelect')}
          value={roleKey}
          placeholder={t('systemInstructions.noRole')}
          options={[
            { value: '', label: t('systemInstructions.noRole') },
            ...allRoles.map((role) => ({ value: refKey(role), label: `${scopeLabel(role.scope, t)} · ${role.label}` }))
          ]}
          onChange={(event) => setRoleKey(event.target.value)}
        />
        <div className={styles.statusRow}>
          <Badge tone={changed ? 'warning' : 'success'}>
            {changed ? t('settings.promptManager.pendingApply') : t('settings.promptManager.applied')}
          </Badge>
          <span className={styles.mutedText}>
            {currentRole
              ? t('settings.promptManager.currentRole', { role: currentRole.label })
              : t('systemInstructions.noRole')}
          </span>
        </div>
        {selectedRole ? (
          <MarkdownPreview markdown={selectedRole.instructions} emptyText={t('systemInstructions.noAdditional')} />
        ) : null}
      </div>
    </Card>
  );
});

const ActivePromptSet = memo(function ActivePromptSet({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  const { t } = useI18n();
  const allRoles = useMemo(() => [...promptConfig.globalModes, ...promptConfig.localModes], [promptConfig]);
  const allInstructions = useMemo(
    () => [...promptConfig.globalInstructions, ...promptConfig.localInstructions],
    [promptConfig]
  );
  const [roleKey, setRoleKey] = useState(promptConfig.activeModeRef ? refKey(promptConfig.activeModeRef) : '');
  const [instructionRefs, setInstructionRefs] = useState<AgentItemRef[]>(promptConfig.activeInstructionRefs);
  const selectedRefKeys = useMemo(() => new Set(instructionRefs.map(refKey)), [instructionRefs]);
  const activeSignature = `${promptConfig.activeModeRef ? refKey(promptConfig.activeModeRef) : ''}|${promptConfig.activeInstructionRefs.map(refKey).join(',')}`;
  const draftSignature = `${roleKey}|${instructionRefs.map(refKey).join(',')}`;
  const changed = activeSignature !== draftSignature;

  const toggleInstruction = useCallback((ref: AgentItemRef, checked: boolean) => {
    setInstructionRefs((current) =>
      checked ? [...current, ref] : current.filter((item) => refKey(item) !== refKey(ref))
    );
  }, []);

  return (
    <Card
      title={t('settings.promptManager.activeTitle')}
      description={t('settings.promptManager.activeDescription')}
      actions={
        <div className={styles.actions}>
          <Badge tone={changed ? 'warning' : 'success'}>
            {changed ? t('settings.promptManager.pendingApply') : t('settings.promptManager.applied')}
          </Badge>
          <Button
            size="sm"
            variant="primary"
            disabled={!changed}
            onClick={() => agentActions.setActivePromptConfig(instructionRefs, parseRefKey(roleKey))}
          >
            {t('settings.promptManager.applyActiveSet')}
          </Button>
        </div>
      }
    >
      <div className={styles.formGrid}>
        <Select
          label={t('systemInstructions.roleSelect')}
          value={roleKey}
          placeholder={t('systemInstructions.noRole')}
          options={[
            { value: '', label: t('systemInstructions.noRole') },
            ...allRoles.map((role) => ({ value: refKey(role), label: `${scopeLabel(role.scope, t)} · ${role.label}` }))
          ]}
          onChange={(event) => setRoleKey(event.target.value)}
        />
        <InstructionPicker
          title={t('settings.promptManager.connectedInstructions')}
          instructions={allInstructions}
          selectedRefKeys={selectedRefKeys}
          onToggle={toggleInstruction}
        />
      </div>
    </Card>
  );
});

const PromptLibrary = memo(function PromptLibrary({
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

const PromptItemCard = memo(function PromptItemCard({ item }: { item: AgentInstructionItem | AgentModeItem }) {
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

function PromptItemEditor({
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

const ActivePresetCard = memo(function ActivePresetCard({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  const { t } = useI18n();
  const [presetId, setPresetId] = useState(promptConfig.activePresetId || '');
  const selectedPreset = promptConfig.presets.find((preset) => preset.id === presetId);
  const activePreset = promptConfig.activePresetId
    ? promptConfig.presets.find((preset) => preset.id === promptConfig.activePresetId)
    : undefined;
  const changed = presetId !== (promptConfig.activePresetId || '');

  return (
    <Card
      title={t('settings.promptManager.activePresetTitle')}
      description={t('settings.promptManager.activePresetDescription')}
      actions={
        <Button
          size="sm"
          variant="primary"
          disabled={!presetId || !changed}
          onClick={() => agentActions.applyPromptPreset(presetId)}
        >
          {t('settings.promptManager.applyPreset')}
        </Button>
      }
    >
      <div className={styles.formGrid}>
        <Select
          label={t('settings.promptManager.choosePreset')}
          value={presetId}
          placeholder={t('settings.promptManager.choosePreset')}
          options={promptConfig.presets.map((preset) => ({
            value: preset.id,
            label: `${scopeLabel(preset.scope, t)} · ${preset.label}`
          }))}
          onChange={(event) => setPresetId(event.target.value)}
        />
        <div className={styles.statusRow}>
          <Badge tone={changed ? 'warning' : 'success'}>
            {changed ? t('settings.promptManager.pendingApply') : t('settings.promptManager.applied')}
          </Badge>
          <span className={styles.mutedText}>
            {activePreset
              ? t('settings.promptManager.currentPreset', { preset: activePreset.label })
              : t('settings.promptManager.noActivePreset')}
          </span>
        </div>
        {selectedPreset ? <PresetDetails preset={selectedPreset} promptConfig={promptConfig} /> : null}
      </div>
    </Card>
  );
});

const PromptPriorityManager = memo(function PromptPriorityManager({
  promptConfig,
  scope
}: {
  promptConfig: AgentPromptConfig;
  scope: AgentItemScope;
}) {
  const { t } = useI18n();
  const scopedPresets = useMemo(
    () => promptConfig.presets.filter((preset) => getPresetScope(preset) === scope),
    [promptConfig.presets, scope]
  );
  const [selectedPresetId, setSelectedPresetId] = useState('new');
  const selectedPreset = scopedPresets.find((preset) => preset.id === selectedPresetId);

  return (
    <div className={styles.sectionStack}>
      <Card
        title={t(`settings.promptManager.preset.${scope}.title` as never)}
        description={t('settings.promptManager.presetsDescription')}
        actions={
          <Button size="sm" leadingIcon={<Plus size={14} />} onClick={() => setSelectedPresetId('new')}>
            {t('settings.promptManager.addPreset')}
          </Button>
        }
      >
        <div className={styles.list}>
          {scopedPresets.map((preset) => (
            <PresetListItem
              key={preset.id}
              preset={preset}
              promptConfig={promptConfig}
              selected={preset.id === selectedPresetId}
              onSelect={() => setSelectedPresetId(preset.id)}
            />
          ))}
          {!scopedPresets.length ? <p className={styles.empty}>{t('settings.promptManager.noPresets')}</p> : null}
        </div>
      </Card>
      <PresetEditor
        preset={selectedPreset}
        promptConfig={promptConfig}
        scope={scope}
        key={selectedPreset?.id || `new:${scope}`}
      />
    </div>
  );
});

function PresetDetails({ preset, promptConfig }: { preset: AgentPromptPreset; promptConfig: AgentPromptConfig }) {
  const { t } = useI18n();
  const allRoles = useMemo(() => [...promptConfig.globalModes, ...promptConfig.localModes], [promptConfig]);
  const allInstructions = useMemo(
    () => [...promptConfig.globalInstructions, ...promptConfig.localInstructions],
    [promptConfig]
  );
  const role = preset.modeRef ? allRoles.find((item) => refKey(item) === refKey(preset.modeRef!)) : undefined;
  const instructions = preset.instructionRefs
    .map((ref) => allInstructions.find((instruction) => refKey(instruction) === refKey(ref)))
    .filter(Boolean) as AgentInstructionItem[];

  return (
    <div className={styles.formGrid}>
      <div className={styles.reliabilityHint}>
        {t('settings.promptManager.presetDescription', {
          count: preset.instructionRefs.length,
          mode: role ? role.label : t('systemInstructions.noRole')
        })}
      </div>
      <MarkdownPreview markdown={role?.instructions || ''} emptyText={t('systemInstructions.noRole')} />
      <div className={styles.list}>
        {instructions.map((instruction) => (
          <MarkdownPreview
            key={`${instruction.scope}:${instruction.id}`}
            markdown={instruction.content}
            emptyText={t('systemInstructions.noAdditional')}
          />
        ))}
        {!instructions.length ? <p className={styles.empty}>{t('settings.promptManager.noInstructions')}</p> : null}
      </div>
    </div>
  );
}

const PresetListItem = memo(function PresetListItem({
  preset,
  promptConfig,
  selected,
  onSelect
}: {
  preset: AgentPromptPreset;
  promptConfig: AgentPromptConfig;
  selected: boolean;
  onSelect(): void;
}) {
  const { t } = useI18n();
  const allRoles = useMemo(() => [...promptConfig.globalModes, ...promptConfig.localModes], [promptConfig]);
  const role = preset.modeRef ? allRoles.find((item) => refKey(item) === refKey(preset.modeRef!)) : undefined;
  const active = preset.id === promptConfig.activePresetId;

  return (
    <button
      type="button"
      className={`${styles.navButton} ${selected ? styles.navButtonActive : ''}`}
      onClick={onSelect}
    >
      <span>{preset.label}</span>
      {active ? <Badge tone="success">{t('settings.promptManager.activePreset')}</Badge> : null}
      <span className={styles.navMeta}>
        {t('settings.promptManager.presetDescription', {
          count: preset.instructionRefs.length,
          mode: role ? role.label : t('systemInstructions.noRole')
        })}
      </span>
    </button>
  );
});

function PresetEditor({
  preset,
  promptConfig,
  scope
}: {
  preset?: AgentPromptPreset;
  promptConfig: AgentPromptConfig;
  scope: AgentItemScope;
}) {
  const { t } = useI18n();
  const roles = useMemo(() => [...promptConfig.globalModes, ...promptConfig.localModes], [promptConfig]);
  const allInstructions = useMemo(
    () => [...promptConfig.globalInstructions, ...promptConfig.localInstructions],
    [promptConfig]
  );
  const [label, setLabel] = useState(preset?.label || '');
  const [roleKey, setRoleKey] = useState(preset?.modeRef ? refKey(preset.modeRef) : '');
  const [instructionRefs, setInstructionRefs] = useState<AgentItemRef[]>(preset?.instructionRefs || []);
  const selectedRefKeys = useMemo(() => new Set(instructionRefs.map(refKey)), [instructionRefs]);
  const canSave = Boolean(label.trim());

  const toggleInstruction = useCallback((ref: AgentItemRef, checked: boolean) => {
    setInstructionRefs((current) =>
      checked ? [...current, ref] : current.filter((item) => refKey(item) !== refKey(ref))
    );
  }, []);

  function savePreset() {
    agentActions.upsertPromptPreset({
      id: preset?.id,
      label: label.trim(),
      instructionRefs,
      modeRef: parseRefKey(roleKey),
      scope
    });
  }

  return (
    <Card
      title={preset ? t('settings.promptManager.editPreset') : t('settings.promptManager.newPreset')}
      description={t('settings.promptManager.presetEditorDescription')}
      actions={
        preset ? (
          <div className={styles.actions}>
            <Button size="sm" variant="secondary" onClick={() => agentActions.applyPromptPreset(preset.id)}>
              {t('settings.promptManager.apply')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              leadingIcon={<Trash2 size={13} />}
              onClick={() => agentActions.deletePromptPreset(preset.id)}
            >
              {t('common.delete')}
            </Button>
          </div>
        ) : null
      }
    >
      <div className={styles.formGrid}>
        <TextField
          label={t('settings.promptManager.presetName')}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder={t('settings.promptManager.presetNamePlaceholder')}
          autoFocus
        />
        <Select
          label={t('systemInstructions.roleSelect')}
          value={roleKey}
          placeholder={t('systemInstructions.noRole')}
          options={[
            { value: '', label: t('systemInstructions.noRole') },
            ...roles.map((role) => ({ value: refKey(role), label: `${scopeLabel(role.scope, t)} · ${role.label}` }))
          ]}
          onChange={(event) => setRoleKey(event.target.value)}
        />
        <InstructionPicker
          title={t('settings.promptManager.presetInstructions')}
          instructions={allInstructions}
          selectedRefKeys={selectedRefKeys}
          onToggle={toggleInstruction}
        />
        <div className={styles.actions}>
          <Button size="sm" variant="primary" disabled={!canSave} leadingIcon={<Save size={13} />} onClick={savePreset}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

const InstructionPicker = memo(function InstructionPicker({
  title,
  instructions,
  selectedRefKeys,
  onToggle
}: {
  title: string;
  instructions: AgentInstructionItem[];
  selectedRefKeys: Set<string>;
  onToggle(ref: AgentItemRef, checked: boolean): void;
}) {
  const { t } = useI18n();

  return (
    <div className={styles.formGrid}>
      <div className={styles.sidebarTitle}>{title}</div>
      <div className={styles.list}>
        {instructions.map((instruction) => {
          const ref = { scope: instruction.scope, id: instruction.id };
          return (
            <Checkbox
              key={refKey(ref)}
              label={`${scopeLabel(instruction.scope, t)} · ${instruction.label}`}
              description={instruction.content.slice(0, 160)}
              checked={selectedRefKeys.has(refKey(ref))}
              onChange={(event) => onToggle(ref, event.target.checked)}
            />
          );
        })}
        {!instructions.length ? <p className={styles.empty}>{t('settings.promptManager.noInstructions')}</p> : null}
      </div>
    </div>
  );
});

function MarkdownPreview({ markdown, emptyText }: { markdown: string; emptyText: string }) {
  return (
    <div className={styles.markdownPreview}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown.trim() || emptyText}</ReactMarkdown>
    </div>
  );
}

function PromptHelpDialog({ onClose }: { onClose(): void }) {
  const { t } = useI18n();
  return (
    <ModalBackdrop role="presentation" onMouseDown={onClose}>
      <ModalSurface role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <ModalHeader>
          <div>
            <h2>{t('settings.promptManager.helpTitle')}</h2>
            <p>{t('settings.promptManager.helpDescription')}</p>
          </div>
          <IconButton title={t('common.close')} onClick={onClose}>
            <X size={15} />
          </IconButton>
        </ModalHeader>
        <div className={styles.dialogBody}>
          <p>
            <b className={styles.dialogStrong}>{t('common.instructions')}</b>{' '}
            {t('settings.promptManager.helpInstructions')}
          </p>
          <p>
            <b className={styles.dialogStrong}>{t('settings.nav.modes')}</b> {t('settings.promptManager.helpModes')}
          </p>
          <p>
            <b className={styles.dialogStrong}>{t('settings.promptManager.presetsTitle')}</b>{' '}
            {t('settings.promptManager.helpPresets')}
          </p>
          <p>{t('settings.promptManager.helpStorage')}</p>
        </div>
      </ModalSurface>
    </ModalBackdrop>
  );
}

function getLibraryItems(promptConfig: AgentPromptConfig, scope: AgentItemScope, kind: AgentInstructionKind) {
  if (kind === 'instruction') {
    return scope === 'global' ? promptConfig.globalInstructions : promptConfig.localInstructions;
  }

  return scope === 'global' ? promptConfig.globalModes : promptConfig.localModes;
}

/**
 * Что это: нормализация scope пресета для UI-вкладок.
 * Зачем нужно: старые состояния могли приходить без scope, поэтому считаем их проектными — так совпадает прежнее поведение сохранения пресетов.
 */
function getPresetScope(preset: AgentPromptPreset): AgentItemScope {
  return preset.scope || 'local';
}
