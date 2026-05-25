import {
  ArrowLeft,
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
  CompactionSettings,
  ToolPermissionItem,
  ToolPermissionMode,
  ToolPermissionPreset,
  ToolPermissionPresetId
} from '../../shared/types';
import { Badge, Button, Card, Checkbox, Select, TextArea, TextField } from '../../shared/ui';
import { IconButton } from '../../shared/ui/IconButton';
import styles from './PermissionsPage.module.scss';

type SettingsPageId = 'overview' | 'instructions' | 'modes' | 'skills' | 'permissions' | 'compaction' | 'system';

type PermissionsPageProps = {
  tools: ToolPermissionItem[];
  maxToolIterations: number;
  compactionSettings: CompactionSettings;
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
  instructionSources
}: {
  promptConfig: AgentPromptConfig;
  instructionSources: AgentInstructionSource[];
}) {
  return (
    <div className={styles.sectionStack}>
      <PromptManager promptConfig={promptConfig} defaultTab="global" />
      <Card title="Effective instructions" description="These sources are currently applied to new agent requests.">
        <InstructionSourceList sources={instructionSources} />
      </Card>
    </div>
  );
}

function ModesSettingsPage({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  return <PromptManager promptConfig={promptConfig} defaultTab="priorities" focus="modes" />;
}

type PromptManagerTab = 'global' | 'local' | 'priorities';

type PromptManagerProps = {
  promptConfig: AgentPromptConfig;
  defaultTab: PromptManagerTab;
  focus?: 'instructions' | 'modes';
};

function PromptManager({ promptConfig, defaultTab, focus = 'instructions' }: PromptManagerProps) {
  const [tab, setTab] = useState<PromptManagerTab>(defaultTab);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className={styles.sectionStack}>
      <Card
        title="Instructions and modes"
        description="Global items live in ~/.aist-agent. Project items live in .aist-agent and have higher priority."
        actions={
          <Button size="sm" variant="ghost" leadingIcon={<HelpCircle size={14} />} onClick={() => setHelpOpen(true)}>
            Guide
          </Button>
        }
      >
        <div className={styles.actions}>
          {(['global', 'local', 'priorities'] as PromptManagerTab[]).map((item) => (
            <Button key={item} size="sm" variant={tab === item ? 'primary' : 'secondary'} onClick={() => setTab(item)}>
              {item === 'global' ? 'Global' : item === 'local' ? 'Project' : 'Active'}
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
          title={kind === 'instruction' ? `${scopeLabel(scope)} instructions` : `${scopeLabel(scope)} modes`}
          description={
            kind === 'instruction'
              ? 'Reusable system instructions. Enable any subset on the Active tab.'
              : 'A mode is one standalone instruction used as your current role, such as coder or architect.'
          }
          actions={
            <Button size="sm" leadingIcon={<Plus size={14} />} onClick={() => setAddingKind(kind)}>
              Add {kind === 'instruction' ? 'instruction' : 'mode'}
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
              <p className={styles.empty}>No items yet. Add one or copy an existing item to customize it.</p>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}

function PromptItemCard({ item }: { item: AgentInstructionItem | AgentModeItem }) {
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
      description={`${scopeLabel(item.scope)} · ${item.kind === 'instruction' ? 'Instruction' : 'Mode'} · ${item.id}`}
      actions={
        <div className={styles.actions}>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            leadingIcon={<Copy size={13} />}
            onClick={() =>
              vscode.postMessage({ type: 'duplicatePromptItem', scope: item.scope, kind: item.kind, id: item.id })
            }
          >
            Copy
          </Button>
          <Button
            size="sm"
            variant="danger"
            leadingIcon={<Trash2 size={13} />}
            onClick={() =>
              vscode.postMessage({ type: 'deletePromptItem', scope: item.scope, kind: item.kind, id: item.id })
            }
          >
            Delete
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
  const [label, setLabel] = useState(item?.label || '');
  const [content, setContent] = useState(item ? (item.kind === 'instruction' ? item.content : item.instructions) : '');
  const canSave = Boolean(label.trim());

  return (
    <Card title={item ? `Edit ${item.label}` : `New ${kind}`} description={`${scopeLabel(scope)} ${kind}`}>
      <div className={styles.formGrid}>
        <TextField label="Name" value={label} onChange={(event) => setLabel(event.target.value)} autoFocus />
        <TextArea
          label="Instruction text"
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
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}

function PromptPriorityManager({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  const instructions = [...promptConfig.globalInstructions, ...promptConfig.localInstructions];
  const modes = [...promptConfig.globalModes, ...promptConfig.localModes];
  const [presetName, setPresetName] = useState('');
  const selectedInstructions = promptConfig.activeInstructionRefs;
  const selectedModeKey = promptConfig.activeModeRef ? refKey(promptConfig.activeModeRef) : '';

  function toggleInstruction(ref: AgentItemRef, checked: boolean) {
    const next = checked
      ? [...selectedInstructions, ref]
      : selectedInstructions.filter((item) => refKey(item) !== refKey(ref));
    vscode.postMessage({ type: 'setActivePromptConfig', instructionRefs: next, modeRef: promptConfig.activeModeRef });
  }

  return (
    <div className={styles.sectionStack}>
      <Card
        title="Active set"
        description="Choose which instructions and one mode are applied in this project right now."
      >
        <div className={styles.formGrid}>
          <Select
            label="Mode"
            value={selectedModeKey}
            placeholder="No mode"
            options={[
              { value: '', label: 'No mode' },
              ...modes.map((mode) => ({ value: refKey(mode), label: `${scopeLabel(mode.scope)} · ${mode.label}` }))
            ]}
            onChange={(event) => {
              const modeRef = parseRefKey(event.target.value);
              vscode.postMessage({ type: 'setActivePromptConfig', instructionRefs: selectedInstructions, modeRef });
            }}
          />
          <div className={styles.list}>
            {instructions.map((instruction) => {
              const ref = { scope: instruction.scope, id: instruction.id };
              return (
                <Checkbox
                  key={refKey(ref)}
                  label={`${scopeLabel(instruction.scope)} · ${instruction.label}`}
                  description={instruction.content.slice(0, 120)}
                  checked={selectedInstructions.some((item) => refKey(item) === refKey(ref))}
                  onChange={(event) => toggleInstruction(ref, event.target.checked)}
                />
              );
            })}
          </div>
        </div>
      </Card>
      <Card
        title="Presets"
        description="Save named combinations of instructions and a mode, then switch between them quickly."
      >
        <div className={styles.formGrid}>
          <Select
            label="Apply preset"
            value={promptConfig.activePresetId || ''}
            placeholder="Choose preset"
            options={promptConfig.presets.map((preset) => ({ value: preset.id, label: preset.label }))}
            onChange={(event) => vscode.postMessage({ type: 'applyPromptPreset', presetId: event.target.value })}
          />
          <div className={styles.actions}>
            <TextField
              label="Preset name"
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="My coding setup"
            />
            <Button
              size="sm"
              variant="primary"
              disabled={!presetName.trim()}
              onClick={() => {
                vscode.postMessage({
                  type: 'upsertPromptPreset',
                  label: presetName.trim(),
                  instructionRefs: selectedInstructions,
                  modeRef: promptConfig.activeModeRef,
                  scope: 'local'
                });
                setPresetName('');
              }}
            >
              Save current as preset
            </Button>
          </div>
          <div className={styles.list}>
            {promptConfig.presets.map((preset) => (
              <PresetCard key={preset.id} preset={preset} promptConfig={promptConfig} />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function PresetCard({ preset, promptConfig }: { preset: AgentPromptPreset; promptConfig: AgentPromptConfig }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(preset.label);
  const allInstructions = [...promptConfig.globalInstructions, ...promptConfig.localInstructions];
  const allModes = [...promptConfig.globalModes, ...promptConfig.localModes];
  const mode = preset.modeRef ? allModes.find((item) => refKey(item) === refKey(preset.modeRef!)) : undefined;
  const instructionLabels = preset.instructionRefs
    .map((ref) => allInstructions.find((item) => refKey(item) === refKey(ref))?.label)
    .filter(Boolean)
    .join(', ');

  return (
    <Card
      title={preset.label}
      description={`${preset.instructionRefs.length} instruction(s) · ${mode ? mode.label : 'No mode'}`}
      actions={
        <div className={styles.actions}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => vscode.postMessage({ type: 'applyPromptPreset', presetId: preset.id })}
          >
            Apply
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setEditing((value) => !value)}>
            Rename
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => vscode.postMessage({ type: 'deletePromptPreset', presetId: preset.id })}
          >
            Delete
          </Button>
        </div>
      }
    >
      {editing ? (
        <div className={styles.actions}>
          <TextField label="Preset name" value={label} onChange={(event) => setLabel(event.target.value)} />
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              vscode.postMessage({
                ...preset,
                type: 'upsertPromptPreset',
                label: label.trim() || preset.label,
                scope: 'local'
              });
              setEditing(false);
            }}
          >
            Save
          </Button>
        </div>
      ) : (
        <p className="m-0 text-xs leading-5 text-[var(--vscode-descriptionForeground)]">
          {instructionLabels || 'No instructions'}
        </p>
      )}
    </Card>
  );
}

function PromptHelpDialog({ onClose }: { onClose(): void }) {
  return (
    <div className="tool-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="tool-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="tool-modal-header">
          <div>
            <h2>How instructions work</h2>
            <p>Small guide for modes, instructions, and presets.</p>
          </div>
          <IconButton title="Close" onClick={onClose}>
            <X size={15} />
          </IconButton>
        </div>
        <div className="grid gap-3 p-4 text-sm leading-6 text-[var(--vscode-descriptionForeground)]">
          <p>
            <b className="text-[var(--vscode-foreground)]">Instructions</b> are reusable rules. Add as many as you want,
            then enable only the ones needed for the current project.
          </p>
          <p>
            <b className="text-[var(--vscode-foreground)]">Modes</b> are one standalone role instruction, for example
            Coder or Architect. You can work with a mode even when no instructions are enabled.
          </p>
          <p>
            <b className="text-[var(--vscode-foreground)]">Presets</b> save a selected set of instructions plus one
            mode. Use them to switch quickly between setups like Coding, Design, Review, or Testing.
          </p>
          <p>
            Global items are stored in your home folder. Project items are stored in .aist-agent and override global
            priorities.
          </p>
        </div>
      </section>
    </div>
  );
}

function scopeLabel(scope: AgentItemScope): string {
  return scope === 'global' ? 'Global' : 'Project';
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
