import {
  ArrowLeft,
  BellRing,
  Bot,
  CheckCircle2,
  Copy,
  FileText,
  Gauge,
  HelpCircle,
  KeyRound,
  LogIn,
  LogOut,
  Plus,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Wrench,
  X
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { ToolPermissionSelect } from '../../features/configure-tool-permission/ToolPermissionSelect';
import { PermissionPresetSelect } from '../../features/select-permission-preset/PermissionPresetSelect';
import { useI18n } from '../../shared/i18n';
import { vscode } from '../../shared/lib/vscode';
import type {
  AgentConfigScope,
  AgentInstructionItem,
  AgentInstructionKind,
  AgentInstructionSource,
  AgentItemRef,
  AgentItemScope,
  AgentLanguage,
  AgentMode,
  AgentModeId,
  AgentModeItem,
  AgentPromptConfig,
  AgentPromptPreset,
  AgentSkill,
  ApprovalNotificationSettings,
  CompactionSettings,
  ToolPermissionItem,
  ToolPermissionMode,
  ToolPermissionPreset,
  ToolPermissionPresetId
} from '../../shared/types';
import { Badge, Button, Card, Checkbox, Select, TextArea, TextField } from '../../shared/ui';
import { IconButton } from '../../shared/ui/IconButton';
import styles from './PermissionsPage.module.scss';

type SettingsPageId =
  | 'overview'
  | 'instructions'
  | 'modes'
  | 'skills'
  | 'permissions'
  | 'notifications'
  | 'compaction'
  | 'system';

type PermissionsPageProps = {
  tools: ToolPermissionItem[];
  maxToolIterations: number;
  compactionSettings: CompactionSettings;
  approvalNotificationSettings: ApprovalNotificationSettings;
  agentLanguage: AgentLanguage;
  agentMode: AgentModeId;
  agentModes: AgentMode[];
  agentConfigScope: AgentConfigScope;
  projectInstructions: string;
  promptConfig: AgentPromptConfig;
  instructionSources: AgentInstructionSource[];
  customSkills: AgentSkill[];
  codexAuthenticated: boolean;
  permissionPresets: ToolPermissionPreset[];
  activePermissionPresetId: ToolPermissionPresetId | 'custom';
  onBack?(): void;
  variant?: 'page' | 'embedded';
};

const NAV_ITEMS: Array<{
  id: SettingsPageId;
  labelKey: ReturnType<typeof useI18n>['t'] extends (key: infer Key, ...args: never[]) => string ? Key : never;
  icon: ReactNode;
  descriptionKey: ReturnType<typeof useI18n>['t'] extends (key: infer Key, ...args: never[]) => string ? Key : never;
}> = [
  {
    id: 'overview',
    labelKey: 'settings.nav.overview',
    icon: <SlidersHorizontal size={15} />,
    descriptionKey: 'settings.nav.overviewDescription'
  },
  {
    id: 'instructions',
    labelKey: 'settings.nav.instructions',
    icon: <FileText size={15} />,
    descriptionKey: 'settings.nav.instructionsDescription'
  },
  {
    id: 'modes',
    labelKey: 'settings.nav.modes',
    icon: <Bot size={15} />,
    descriptionKey: 'settings.nav.modesDescription'
  },
  {
    id: 'skills',
    labelKey: 'settings.nav.skills',
    icon: <Wrench size={15} />,
    descriptionKey: 'settings.nav.skillsDescription'
  },
  {
    id: 'permissions',
    labelKey: 'settings.nav.permissions',
    icon: <ShieldCheck size={15} />,
    descriptionKey: 'settings.nav.permissionsDescription'
  },
  {
    id: 'notifications',
    labelKey: 'settings.nav.notifications',
    icon: <BellRing size={15} />,
    descriptionKey: 'settings.nav.notificationsDescription'
  },
  {
    id: 'compaction',
    labelKey: 'settings.nav.compaction',
    icon: <Gauge size={15} />,
    descriptionKey: 'settings.nav.compactionDescription'
  },
  {
    id: 'system',
    labelKey: 'settings.nav.system',
    icon: <KeyRound size={15} />,
    descriptionKey: 'settings.nav.systemDescription'
  }
];

export function PermissionsPage({
  tools,
  maxToolIterations,
  compactionSettings,
  approvalNotificationSettings,
  agentLanguage,
  agentMode,
  agentModes,
  agentConfigScope,
  projectInstructions: _projectInstructions,
  promptConfig,
  instructionSources,
  customSkills,
  codexAuthenticated,
  permissionPresets,
  activePermissionPresetId,
  onBack,
  variant = 'page'
}: PermissionsPageProps) {
  const [activePage, setActivePage] = useState<SettingsPageId>('overview');
  const activeMode = agentModes.find((mode) => mode.id === agentMode) || agentModes[0];
  const content = (
    <main
      className={
        variant === 'embedded' ? 'min-h-0 flex-1 overflow-y-auto p-3' : 'min-h-0 flex-1 overflow-y-auto px-4 py-4'
      }
    >
      <div className={`${styles.shell} ${variant === 'embedded' ? styles.embeddedShell : ''}`}>
        <SettingsSidebar activePage={activePage} onChange={setActivePage} />
        <div className={styles.content}>
          {variant === 'page' ? (
            <SettingsHeader activePage={activePage} onBack={onBack} />
          ) : (
            <PageIntro activePage={activePage} />
          )}
          {activePage === 'overview' ? (
            <OverviewPage
              agentConfigScope={agentConfigScope}
              activePermissionPresetId={activePermissionPresetId}
              activeMode={activeMode}
              customSkills={customSkills}
              instructionSources={instructionSources}
              codexAuthenticated={codexAuthenticated}
            />
          ) : null}
          {activePage === 'instructions' ? (
            <InstructionSettingsPage promptConfig={promptConfig} instructionSources={instructionSources} />
          ) : null}
          {activePage === 'modes' ? <ModesSettingsPage promptConfig={promptConfig} /> : null}
          {activePage === 'skills' ? <SkillsSettingsPage customSkills={customSkills} /> : null}
          {activePage === 'permissions' ? (
            <PermissionsSettingsPage
              tools={tools}
              permissionPresets={permissionPresets}
              activePermissionPresetId={activePermissionPresetId}
            />
          ) : null}
          {activePage === 'notifications' ? <NotificationSettingsPage settings={approvalNotificationSettings} /> : null}
          {activePage === 'compaction' ? <CompactionSettingsPage settings={compactionSettings} /> : null}
          {activePage === 'system' ? (
            <SystemSettingsPage
              agentLanguage={agentLanguage}
              maxToolIterations={maxToolIterations}
              codexAuthenticated={codexAuthenticated}
            />
          ) : null}
        </div>
      </div>
    </main>
  );

  if (variant === 'embedded') return content;

  return (
    <div className="flex h-screen flex-col bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)]">
      {content}
    </div>
  );
}

function SettingsSidebar({
  activePage,
  onChange
}: {
  activePage: SettingsPageId;
  onChange(page: SettingsPageId): void;
}) {
  const { t } = useI18n();
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTitle}>{t('settings.sidebarTitle')}</div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.navButton} ${activePage === item.id ? styles.navButtonActive : ''}`}
            title={t(item.descriptionKey)}
            onClick={() => onChange(item.id)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span>{t(item.labelKey)}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function SettingsHeader({ activePage, onBack }: { activePage: SettingsPageId; onBack?(): void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-start gap-3">
      {onBack ? (
        <IconButton title={t('common.backToChat')} onClick={onBack}>
          <ArrowLeft size={15} />
        </IconButton>
      ) : null}
      <PageIntro activePage={activePage} />
    </div>
  );
}

function PageIntro({ activePage }: { activePage: SettingsPageId }) {
  const { t } = useI18n();
  const item = NAV_ITEMS.find((navItem) => navItem.id === activePage) || NAV_ITEMS[0];
  return (
    <header className={styles.pageHeader}>
      <h1 className={styles.pageTitle}>{t(item.labelKey)}</h1>
      <p className={styles.pageDescription}>{t(item.descriptionKey)}</p>
    </header>
  );
}

function OverviewPage({
  agentConfigScope,
  activePermissionPresetId,
  activeMode,
  customSkills,
  instructionSources,
  codexAuthenticated
}: {
  agentConfigScope: AgentConfigScope;
  activePermissionPresetId: ToolPermissionPresetId | 'custom';
  activeMode: AgentMode | undefined;
  customSkills: AgentSkill[];
  instructionSources: AgentInstructionSource[];
  codexAuthenticated: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={styles.sectionStack}>
      <Card
        tone="elevated"
        title={t('settings.overview.profileTitle')}
        description={t('settings.overview.profileDescription')}
      >
        <div className={styles.twoColumns}>
          <Badge tone="accent">
            {t('settings.overview.storage', {
              value:
                agentConfigScope === 'workspace'
                  ? t('settings.overview.storageWorkspace')
                  : t('settings.overview.storageUser')
            })}
          </Badge>
          <Badge tone={activePermissionPresetId === 'custom' ? 'warning' : 'success'}>
            {t('settings.overview.permissions', { value: activePermissionPresetId })}
          </Badge>
          <Badge tone="neutral">
            {t('settings.overview.mode', { value: activeMode?.label || t('settings.overview.defaultMode') })}
          </Badge>
          <Badge tone={customSkills.length ? 'accent' : 'neutral'}>
            {t('settings.overview.skills', { count: customSkills.length })}
          </Badge>
          <Badge tone="neutral">
            {t('settings.overview.instructionSources', { count: instructionSources.length })}
          </Badge>
          <Badge tone={codexAuthenticated ? 'success' : 'warning'}>
            {t('settings.overview.codex', {
              value: codexAuthenticated
                ? t('settings.overview.codexAuthorized')
                : t('settings.overview.codexNotConnected')
            })}
          </Badge>
        </div>
      </Card>
      <Card title={t('settings.overview.orderTitle')} description={t('settings.overview.orderDescription')}>
        <InstructionSourceList sources={instructionSources} />
      </Card>
    </div>
  );
}

function InstructionSettingsPage({
  promptConfig,
  instructionSources: _instructionSources
}: {
  promptConfig: AgentPromptConfig;
  instructionSources: AgentInstructionSource[];
}) {
  return <PromptManager promptConfig={promptConfig} defaultTab="priorities" />;
}

export function ModesSettingsPage({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  return <PromptManager promptConfig={promptConfig} defaultTab="priorities" focus="modes" />;
}

type PromptManagerTab = 'global' | 'local' | 'priorities';

type PromptManagerProps = {
  promptConfig: AgentPromptConfig;
  defaultTab: PromptManagerTab;
  focus?: 'instructions' | 'modes';
};

function PromptManager({ promptConfig, defaultTab, focus = 'instructions' }: PromptManagerProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<PromptManagerTab>(defaultTab);
  const [helpOpen, setHelpOpen] = useState(false);

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
          {(['global', 'local', 'priorities'] as PromptManagerTab[]).map((item) => (
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

function PromptLibrary({
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

  return (
    <div className={styles.sectionStack}>
      {(focus === 'instructions'
        ? (['instruction', 'mode'] as AgentInstructionKind[])
        : (['mode', 'instruction'] as AgentInstructionKind[])
      ).map((kind) => (
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
}

function PromptItemCard({ item }: { item: AgentInstructionItem | AgentModeItem }) {
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
            onClick={() =>
              vscode.postMessage({ type: 'duplicatePromptItem', scope: item.scope, kind: item.kind, id: item.id })
            }
          >
            {t('common.copy')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            leadingIcon={<Trash2 size={13} />}
            onClick={() =>
              vscode.postMessage({ type: 'deletePromptItem', scope: item.scope, kind: item.kind, id: item.id })
            }
          >
            {t('common.delete')}
          </Button>
        </div>
      }
    >
      <p className="m-0 whitespace-pre-wrap text-xs leading-5 text-[var(--vscode-descriptionForeground)]">
        {item.kind === 'instruction' ? item.content : item.instructions}
      </p>
    </Card>
  );
}

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
              vscode.postMessage({ type: 'upsertPromptItem', scope, kind, id: item?.id, label: label.trim(), content });
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

function PromptPriorityManager({ promptConfig }: { promptConfig: AgentPromptConfig }) {
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
}

function PresetListItem({
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
  const allModes = [...promptConfig.globalModes, ...promptConfig.localModes];
  const mode = preset.modeRef ? allModes.find((item) => refKey(item) === refKey(preset.modeRef!)) : undefined;

  return (
    <button
      type="button"
      className={`${styles.navButton} ${selected ? styles.navButtonActive : ''}`}
      onClick={onSelect}
    >
      <span>{preset.label}</span>
      <span className="ml-auto text-[var(--vscode-descriptionForeground)]">
        {t('settings.promptManager.presetDescription', {
          count: preset.instructionRefs.length,
          mode: mode ? mode.label : t('systemInstructions.noMode')
        })}
      </span>
    </button>
  );
}

function PresetEditor({ preset, promptConfig }: { preset?: AgentPromptPreset; promptConfig: AgentPromptConfig }) {
  const { t } = useI18n();
  const modes = [...promptConfig.globalModes, ...promptConfig.localModes];
  const globalInstructions = promptConfig.globalInstructions;
  const localInstructions = promptConfig.localInstructions;
  const [label, setLabel] = useState(preset?.label || '');
  const [modeKey, setModeKey] = useState(preset?.modeRef ? refKey(preset.modeRef) : '');
  const [instructionRefs, setInstructionRefs] = useState<AgentItemRef[]>(preset?.instructionRefs || []);
  const canSave = Boolean(label.trim());

  function toggleInstruction(ref: AgentItemRef, checked: boolean) {
    setInstructionRefs((current) =>
      checked ? [...current, ref] : current.filter((item) => refKey(item) !== refKey(ref))
    );
  }

  function savePreset() {
    const modeRef = parseRefKey(modeKey);
    vscode.postMessage({
      type: 'upsertPromptPreset',
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
            <Button
              size="sm"
              variant="secondary"
              onClick={() => vscode.postMessage({ type: 'applyPromptPreset', presetId: preset.id })}
            >
              {t('settings.promptManager.apply')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              leadingIcon={<Trash2 size={13} />}
              onClick={() => vscode.postMessage({ type: 'deletePromptPreset', presetId: preset.id })}
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

function InstructionPicker({
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
              checked={selectedRefs.some((item) => refKey(item) === refKey(ref))}
              onChange={(event) => onToggle(ref, event.target.checked)}
            />
          );
        })}
        {!instructions.length ? <p className={styles.empty}>{t('settings.promptManager.noInstructions')}</p> : null}
      </div>
    </div>
  );
}

function PromptHelpDialog({ onClose }: { onClose(): void }) {
  const { t } = useI18n();
  return (
    <div className="tool-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="tool-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="tool-modal-header">
          <div>
            <h2>{t('settings.promptManager.helpTitle')}</h2>
            <p>{t('settings.promptManager.helpDescription')}</p>
          </div>
          <IconButton title={t('common.close')} onClick={onClose}>
            <X size={15} />
          </IconButton>
        </div>
        <div className="grid gap-3 p-4 text-sm leading-6 text-[var(--vscode-descriptionForeground)]">
          <p>
            <b className="text-[var(--vscode-foreground)]">{t('common.instructions')}</b>{' '}
            {t('settings.promptManager.helpInstructions')}
          </p>
          <p>
            <b className="text-[var(--vscode-foreground)]">{t('settings.nav.modes')}</b>{' '}
            {t('settings.promptManager.helpModes')}
          </p>
          <p>
            <b className="text-[var(--vscode-foreground)]">{t('settings.promptManager.presetsTitle')}</b>{' '}
            {t('settings.promptManager.helpPresets')}
          </p>
          <p>{t('settings.promptManager.helpStorage')}</p>
        </div>
      </section>
    </div>
  );
}

function scopeLabel(scope: AgentItemScope, t: ReturnType<typeof useI18n>['t']): string {
  return scope === 'global' ? t('settings.promptManager.scope.global') : t('settings.promptManager.scope.local');
}

function refKey(ref: AgentItemRef | { scope: AgentItemScope; id: string }): string {
  return `${ref.scope}:${ref.id}`;
}

function parseRefKey(value: string): AgentItemRef | undefined {
  const [scope, ...rest] = value.split(':');
  const id = rest.join(':');
  return (scope === 'global' || scope === 'local') && id ? { scope, id } : undefined;
}

function SkillsSettingsPage({ customSkills }: { customSkills: AgentSkill[] }) {
  const { t } = useI18n();
  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState({
    label: '',
    description: '',
    command: '',
    permission: 'ask' as ToolPermissionMode
  });

  const handleAddSkill = () => {
    const label = newSkill.label.trim();
    const command = newSkill.command.trim();
    if (!label || !command) return;
    vscode.postMessage({
      type: 'addSkill',
      label,
      description: newSkill.description.trim(),
      command,
      permission: newSkill.permission
    });
    setNewSkill({ label: '', description: '', command: '', permission: 'ask' });
    setAddingSkill(false);
  };

  return (
    <div className={styles.sectionStack}>
      <Card
        title={t('settings.skills.title')}
        description={t('settings.skills.description')}
        actions={
          <Button size="sm" leadingIcon={<Plus size={14} />} onClick={() => setAddingSkill(true)}>
            {t('settings.skills.addSkill')}
          </Button>
        }
      >
        {addingSkill ? (
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
        {customSkills.length ? (
          <div className={styles.list}>
            {customSkills.map((skill) => (
              <SkillSettingsCard key={skill.id} skill={skill} />
            ))}
          </div>
        ) : !addingSkill ? (
          <p className={styles.empty}>{t('settings.skills.empty')}</p>
        ) : null}
      </Card>
    </div>
  );
}

function PermissionsSettingsPage({
  tools,
  permissionPresets,
  activePermissionPresetId
}: {
  tools: ToolPermissionItem[];
  permissionPresets: ToolPermissionPreset[];
  activePermissionPresetId: ToolPermissionPresetId | 'custom';
}) {
  const { t } = useI18n();
  return (
    <div className={styles.sectionStack}>
      <Card title={t('settings.permissions.presetsTitle')} description={t('settings.permissions.presetsDescription')}>
        <div className={styles.formGrid}>
          <PermissionPresetSelect presets={permissionPresets} activeId={activePermissionPresetId} />
          <div className={styles.twoColumns}>
            {permissionPresets.map((preset) => (
              <Button
                key={preset.id}
                variant={preset.id === activePermissionPresetId ? 'primary' : 'secondary'}
                onClick={() => vscode.postMessage({ type: 'setToolPermissionPreset', presetId: preset.id })}
              >
                {t(`settings.preset.${preset.id}.label` as never)}
              </Button>
            ))}
          </div>
          {activePermissionPresetId === 'custom' ? (
            <Badge tone="warning">{t('settings.permissions.customActive')}</Badge>
          ) : null}
        </div>
      </Card>
      <Card title={t('settings.permissions.perToolTitle')} description={t('settings.permissions.perToolDescription')}>
        <div className={styles.list}>
          {tools.map((tool) => (
            <ToolPermissionSelect key={tool.name} item={tool} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function NotificationSettingsPage({ settings }: { settings: ApprovalNotificationSettings }) {
  const { t } = useI18n();

  return (
    <div className={styles.sectionStack}>
      <Card title={t('settings.notifications.title')} description={t('settings.notifications.description')}>
        <div className={styles.formGrid}>
          <Select
            label={t('common.status')}
            value={settings.enabled ? 'enabled' : 'disabled'}
            options={[
              { value: 'enabled', label: t('common.enabled') },
              { value: 'disabled', label: t('common.disabled') }
            ]}
            onChange={(event) =>
              vscode.postMessage({
                type: 'setApprovalNotificationSettings',
                settings: { enabled: event.target.value === 'enabled' }
              })
            }
          />
          <Checkbox
            label={t('settings.notifications.system')}
            description={t('settings.notifications.systemDescription')}
            checked={settings.systemNotifications}
            disabled={!settings.enabled}
            onChange={(event) =>
              vscode.postMessage({
                type: 'setApprovalNotificationSettings',
                settings: { systemNotifications: event.target.checked }
              })
            }
          />
          <Checkbox
            label={t('settings.notifications.sound')}
            description={t('settings.notifications.soundDescription')}
            checked={settings.sound}
            disabled={!settings.enabled}
            onChange={(event) =>
              vscode.postMessage({
                type: 'setApprovalNotificationSettings',
                settings: { sound: event.target.checked }
              })
            }
          />
          <TextField
            label={t('settings.notifications.volume')}
            type="number"
            min={0}
            max={100}
            value={Math.round(settings.volume * 100)}
            disabled={!settings.enabled || !settings.sound}
            onChange={(event) =>
              vscode.postMessage({
                type: 'setApprovalNotificationSettings',
                settings: { volume: Math.max(0, Math.min(100, Number(event.target.value) || 0)) / 100 }
              })
            }
          />
          <TextField
            label={t('settings.notifications.duration')}
            type="number"
            min={1}
            max={30}
            value={settings.durationSeconds}
            disabled={!settings.enabled || !settings.sound}
            onChange={(event) =>
              vscode.postMessage({
                type: 'setApprovalNotificationSettings',
                settings: { durationSeconds: Math.max(1, Math.min(30, Number(event.target.value) || 5)) }
              })
            }
          />
        </div>
      </Card>
    </div>
  );
}

function CompactionSettingsPage({ settings }: { settings: CompactionSettings }) {
  const { t } = useI18n();
  return (
    <div className={styles.sectionStack}>
      <Card title={t('settings.compaction.title')} description={t('settings.compaction.description')}>
        <div className={styles.formGrid}>
          <Select
            label={t('common.status')}
            value={settings.enabled ? 'enabled' : 'disabled'}
            options={[
              { value: 'enabled', label: t('common.enabled') },
              { value: 'disabled', label: t('common.disabled') }
            ]}
            onChange={(event) =>
              vscode.postMessage({
                type: 'setCompactionSettings',
                settings: { enabled: event.target.value === 'enabled' }
              })
            }
          />
          <TextField
            label={t('settings.compaction.threshold')}
            type="number"
            min={10}
            max={95}
            value={settings.thresholdPercent}
            onChange={(event) =>
              vscode.postMessage({
                type: 'setCompactionSettings',
                settings: { thresholdPercent: Math.max(10, Math.min(95, Math.floor(Number(event.target.value) || 70))) }
              })
            }
          />
          <TextField
            label={t('settings.compaction.keepLast')}
            hint={t('settings.compaction.keepLastHint')}
            type="number"
            min={0}
            max={20}
            value={settings.keepLastMessages}
            onChange={(event) =>
              vscode.postMessage({
                type: 'setCompactionSettings',
                settings: { keepLastMessages: Math.max(0, Math.min(20, Math.floor(Number(event.target.value) || 0))) }
              })
            }
          />
        </div>
      </Card>
    </div>
  );
}

function SystemSettingsPage({
  agentLanguage,
  maxToolIterations,
  codexAuthenticated
}: {
  agentLanguage: AgentLanguage;
  maxToolIterations: number;
  codexAuthenticated: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={styles.sectionStack}>
      <Card title={t('settings.system.languageTitle')} description={t('settings.system.languageDescription')}>
        <Select
          label={t('settings.system.responseLanguage')}
          value={agentLanguage}
          options={[
            { value: 'ru', label: 'Русский' },
            { value: 'en', label: 'English' }
          ]}
          onChange={(event) =>
            vscode.postMessage({ type: 'setAgentLanguage', language: event.target.value as AgentLanguage })
          }
        />
      </Card>
      <Card title={t('settings.system.iterationTitle')} description={t('settings.system.iterationDescription')}>
        <TextField
          type="number"
          min={0}
          step={1}
          value={maxToolIterations}
          leadingIcon={<Gauge size={15} />}
          onChange={(event) =>
            vscode.postMessage({
              type: 'setMaxToolIterations',
              maxToolIterations: Math.max(0, Math.floor(Number(event.target.value) || 0))
            })
          }
        />
      </Card>
      <Card
        title={t('settings.system.codexTitle')}
        description={
          codexAuthenticated
            ? t('settings.system.codexDescriptionAuthorized')
            : t('settings.system.codexDescriptionUnauthorized')
        }
      >
        {codexAuthenticated ? (
          <div className={styles.actions}>
            <Badge tone="success" icon={<CheckCircle2 size={12} />}>
              {t('common.authorized')}
            </Badge>
            <Button
              variant="secondary"
              leadingIcon={<LogOut size={14} />}
              onClick={() => vscode.postMessage({ type: 'codexLogout' })}
            >
              {t('settings.system.logout')}
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            leadingIcon={<LogIn size={14} />}
            onClick={() => vscode.postMessage({ type: 'codexLogin' })}
          >
            {t('common.authorize')}
          </Button>
        )}
      </Card>
    </div>
  );
}

function InstructionSourceList({ sources }: { sources: AgentInstructionSource[] }) {
  const { t } = useI18n();
  if (!sources.length) return <p className={styles.empty}>{t('settings.instructions.empty')}</p>;

  return (
    <div className={styles.list}>
      {sources.map((source) => (
        <Card
          key={source.id}
          title={source.title}
          description={t('settings.instructions.priority', { priority: source.priority })}
        >
          <p className="m-0 line-clamp-3 text-xs leading-5 text-[var(--vscode-descriptionForeground)]">
            {source.content}
          </p>
        </Card>
      ))}
    </div>
  );
}

function SkillSettingsCard({ skill }: { skill: AgentSkill }) {
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
  const canSave = changed && Boolean(draft.label.trim()) && Boolean(draft.command.trim());

  return (
    <Card title={skill.label} description={skill.id}>
      <div className={styles.formGrid}>
        <TextField
          label={t('common.name')}
          value={draft.label}
          onChange={(event) => setDraft((value) => ({ ...value, label: event.target.value }))}
        />
        <TextField
          label={t('common.description')}
          value={draft.description}
          onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))}
        />
        <TextArea
          label={t('common.command')}
          rows={5}
          value={draft.command}
          onChange={(event) => setDraft((value) => ({ ...value, command: event.target.value }))}
        />
        <Select
          label={t('common.permission')}
          value={draft.permission}
          options={getPermissionOptions(t)}
          onChange={(event) =>
            setDraft((value) => ({ ...value, permission: event.target.value as ToolPermissionMode }))
          }
        />
        <div className={styles.actions}>
          <Button
            size="sm"
            variant="primary"
            leadingIcon={<Save size={13} />}
            disabled={!canSave}
            onClick={() =>
              vscode.postMessage({
                type: 'updateSkill',
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
            onClick={() => vscode.postMessage({ type: 'deleteSkill', skillId: skill.id })}
          >
            {t('common.delete')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function getPermissionOptions(t: ReturnType<typeof useI18n>['t']) {
  return [
    { value: 'ask', label: t('settings.permission.ask') },
    { value: 'auto', label: t('settings.permission.auto') }
  ];
}
