import { Copy, HelpCircle, Plus, Save, Trash2, X } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';

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
import { parseRefKey, refKey, scopeLabel } from './utils';

type PromptManagerTab = 'global' | 'local' | 'priorities';

type PromptManagerProps = {
  promptConfig: AgentPromptConfig;
  defaultTab: PromptManagerTab;
  focus?: 'instructions' | 'modes';
};

/**
 * Что это: раздел управления инструкциями, режимами и preset приоритетов.
 * Зачем нужно: prompt management — самый насыщенный сценарий settings, поэтому он изолирован от общей страницы и дробится на memo-списки.
 */
export function ModesSettingsPage({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  return <PromptManager promptConfig={promptConfig} defaultTab="priorities" focus="modes" />;
}

export function PromptManager({ promptConfig, defaultTab, focus = 'instructions' }: PromptManagerProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<PromptManagerTab>(defaultTab);
  const [helpOpen, setHelpOpen] = useState(false);
  const tabs = useMemo(() => ['global', 'local', 'priorities'] as PromptManagerTab[], []);

  return (
    <div className={styles.sectionStack}>
      <Card
        title={t('settings.promptManager.title')}
        description={t('settings.promptManager.description')}
        actions={
          <Button size="sm" variant="ghost" leadingIcon={<HelpCircle size={14} />} onClick={() => setHelpOpen(true)}>
            {t('settings.promptManager.guide')}
          </Button>
        }
      >
        <div className={styles.actions}>
          {tabs.map((item) => (
            <Button key={item} size="sm" variant={tab === item ? 'primary' : 'secondary'} onClick={() => setTab(item)}>
              {t(`settings.promptManager.tab.${item}` as never)}
            </Button>
          ))}
        </div>
      </Card>
      {tab === 'global' ? (
        <PromptLibrary scope="global" promptConfig={promptConfig} focus={focus} />
      ) : tab === 'local' ? (
        <PromptLibrary scope="local" promptConfig={promptConfig} focus={focus} />
      ) : (
        <PromptPriorityManager promptConfig={promptConfig} />
      )}
      {helpOpen ? <PromptHelpDialog onClose={() => setHelpOpen(false)} /> : null}
    </div>
  );
}

const PromptLibrary = memo(function PromptLibrary({
  scope,
  promptConfig,
  focus
}: {
  scope: AgentItemScope;
  promptConfig: AgentPromptConfig;
  focus: 'instructions' | 'modes';
}) {
  const { t } = useI18n();
  const [addingKind, setAddingKind] = useState<AgentInstructionKind | undefined>(undefined);
  const instructions = scope === 'global' ? promptConfig.globalInstructions : promptConfig.localInstructions;
  const modes = scope === 'global' ? promptConfig.globalModes : promptConfig.localModes;
  const orderedKinds = useMemo(
    () =>
      focus === 'instructions'
        ? (['instruction', 'mode'] as AgentInstructionKind[])
        : (['mode', 'instruction'] as AgentInstructionKind[]),
    [focus]
  );

  return (
    <div className={styles.sectionStack}>
      {orderedKinds.map((kind) => (
        <Card
          key={kind}
          title={t(`settings.promptManager.${kind}.${scope}.title` as never)}
          description={
            kind === 'instruction'
              ? t('settings.promptManager.instruction.description')
              : t('settings.promptManager.mode.description')
          }
          actions={
            <Button size="sm" leadingIcon={<Plus size={14} />} onClick={() => setAddingKind(kind)}>
              {kind === 'instruction'
                ? t('settings.promptManager.addInstruction')
                : t('settings.promptManager.addMode')}
            </Button>
          }
        >
          {addingKind === kind ? (
            <PromptItemEditor
              scope={scope}
              kind={kind}
              onCancel={() => setAddingKind(undefined)}
              onSaved={() => setAddingKind(undefined)}
            />
          ) : null}
          <div className={styles.list}>
            {(kind === 'instruction' ? instructions : modes).map((item) => (
              <PromptItemCard key={`${item.scope}:${item.id}`} item={item} />
            ))}
            {!(kind === 'instruction' ? instructions : modes).length && !addingKind ? (
              <p className={styles.empty}>{t('settings.promptManager.empty')}</p>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
});

const PromptItemCard = memo(function PromptItemCard({ item }: { item: AgentInstructionItem | AgentModeItem }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
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
      <p className={styles.preWrapText}>{item.kind === 'instruction' ? item.content : item.instructions}</p>
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
          rows={6}
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

const PromptPriorityManager = memo(function PromptPriorityManager({
  promptConfig
}: {
  promptConfig: AgentPromptConfig;
}) {
  const { t } = useI18n();
  const [selectedPresetId, setSelectedPresetId] = useState(
    promptConfig.activePresetId || promptConfig.presets[0]?.id || 'new'
  );
  const selectedPreset = promptConfig.presets.find((preset) => preset.id === selectedPresetId);

  return (
    <div className={styles.twoColumns}>
      <Card
        title={t('settings.promptManager.presetsTitle')}
        description={t('settings.promptManager.presetsDescription')}
        actions={
          <Button size="sm" leadingIcon={<Plus size={14} />} onClick={() => setSelectedPresetId('new')}>
            {t('settings.promptManager.addPreset')}
          </Button>
        }
      >
        <div className={styles.list}>
          {promptConfig.presets.map((preset) => (
            <PresetListItem
              key={preset.id}
              preset={preset}
              promptConfig={promptConfig}
              selected={preset.id === selectedPresetId}
              onSelect={() => setSelectedPresetId(preset.id)}
            />
          ))}
          {!promptConfig.presets.length ? (
            <p className={styles.empty}>{t('settings.promptManager.noPresets')}</p>
          ) : null}
        </div>
      </Card>
      <PresetEditor preset={selectedPreset} promptConfig={promptConfig} key={selectedPreset?.id || 'new'} />
    </div>
  );
});

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
  const allModes = useMemo(() => [...promptConfig.globalModes, ...promptConfig.localModes], [promptConfig]);
  const mode = preset.modeRef ? allModes.find((item) => refKey(item) === refKey(preset.modeRef!)) : undefined;

  return (
    <button
      type="button"
      className={`${styles.navButton} ${selected ? styles.navButtonActive : ''}`}
      onClick={onSelect}
    >
      <span>{preset.label}</span>
      <span className={styles.navMeta}>
        {t('settings.promptManager.presetDescription', {
          count: preset.instructionRefs.length,
          mode: mode ? mode.label : t('systemInstructions.noMode')
        })}
      </span>
    </button>
  );
});

function PresetEditor({ preset, promptConfig }: { preset?: AgentPromptPreset; promptConfig: AgentPromptConfig }) {
  const { t } = useI18n();
  const modes = useMemo(() => [...promptConfig.globalModes, ...promptConfig.localModes], [promptConfig]);
  const globalInstructions = promptConfig.globalInstructions;
  const localInstructions = promptConfig.localInstructions;
  const [label, setLabel] = useState(preset?.label || '');
  const [modeKey, setModeKey] = useState(preset?.modeRef ? refKey(preset.modeRef) : '');
  const [instructionRefs, setInstructionRefs] = useState<AgentItemRef[]>(preset?.instructionRefs || []);
  const canSave = Boolean(label.trim());

  const toggleInstruction = useCallback((ref: AgentItemRef, checked: boolean) => {
    setInstructionRefs((current) =>
      checked ? [...current, ref] : current.filter((item) => refKey(item) !== refKey(ref))
    );
  }, []);

  function savePreset() {
    const modeRef = parseRefKey(modeKey);
    agentActions.upsertPromptPreset({
      id: preset?.id,
      label: label.trim(),
      instructionRefs,
      modeRef,
      scope: 'local'
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
          label={t('systemInstructions.modeSelect')}
          value={modeKey}
          placeholder={t('systemInstructions.noMode')}
          options={[
            { value: '', label: t('systemInstructions.noMode') },
            ...modes.map((mode) => ({ value: refKey(mode), label: `${scopeLabel(mode.scope, t)} · ${mode.label}` }))
          ]}
          onChange={(event) => setModeKey(event.target.value)}
        />
        <InstructionPicker
          title={t('settings.promptManager.globalInstructions')}
          instructions={globalInstructions}
          selectedRefs={instructionRefs}
          onToggle={toggleInstruction}
        />
        <InstructionPicker
          title={t('settings.promptManager.localInstructions')}
          instructions={localInstructions}
          selectedRefs={instructionRefs}
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
  selectedRefs,
  onToggle
}: {
  title: string;
  instructions: AgentInstructionItem[];
  selectedRefs: AgentItemRef[];
  onToggle(ref: AgentItemRef, checked: boolean): void;
}) {
  const { t } = useI18n();
  const selectedRefKeys = useMemo(() => new Set(selectedRefs.map(refKey)), [selectedRefs]);

  return (
    <div className={styles.formGrid}>
      <div className={styles.sidebarTitle}>{title}</div>
      <div className={styles.list}>
        {instructions.map((instruction) => {
          const ref = { scope: instruction.scope, id: instruction.id };
          return (
            <Checkbox
              key={refKey(ref)}
              label={instruction.label}
              description={instruction.content.slice(0, 120)}
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
