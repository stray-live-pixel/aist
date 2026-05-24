import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  FileText,
  Gauge,
  KeyRound,
  LogIn,
  LogOut,
  Plus,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Wrench
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { ToolPermissionSelect } from '../../features/configure-tool-permission/ToolPermissionSelect';
import { AgentModeSelect } from '../../features/select-agent-mode/AgentModeSelect';
import { PermissionPresetSelect } from '../../features/select-permission-preset/PermissionPresetSelect';
import { useI18n } from '../../shared/i18n';
import { vscode } from '../../shared/lib/vscode';
import type {
  AgentConfigScope,
  AgentInstructionSource,
  AgentLanguage,
  AgentMode,
  AgentModeId,
  AgentSkill,
  CompactionSettings,
  ToolPermissionItem,
  ToolPermissionMode,
  ToolPermissionPreset,
  ToolPermissionPresetId
} from '../../shared/types';
import { Badge, Button, Card, Select, TextArea, TextField } from '../../shared/ui';
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
  projectInstructions,
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
            <InstructionSettingsPage
              scope={agentConfigScope}
              projectInstructions={projectInstructions}
              instructionSources={instructionSources}
            />
          ) : null}
          {activePage === 'modes' ? (
            <ModesSettingsPage agentMode={agentMode} agentModes={agentModes} activeMode={activeMode} />
          ) : null}
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
  scope,
  projectInstructions,
  instructionSources
}: {
  scope: AgentConfigScope;
  projectInstructions: string;
  instructionSources: AgentInstructionSource[];
}) {
  const { t } = useI18n();
  return (
    <div className={styles.sectionStack}>
      <Card title={t('settings.instructions.storageTitle')} description={t('settings.instructions.storageDescription')}>
        <Select
          label={t('settings.instructions.saveTo')}
          value={scope}
          options={[
            { value: 'workspace', label: t('settings.instructions.workspace') },
            { value: 'user', label: t('settings.instructions.user') }
          ]}
          onChange={(event) =>
            vscode.postMessage({ type: 'setAgentConfigScope', scope: event.target.value as AgentConfigScope })
          }
        />
      </Card>
      <Card title={t('settings.instructions.projectTitle')} description={t('settings.instructions.projectDescription')}>
        <TextArea
          rows={8}
          value={projectInstructions}
          placeholder={t('settings.instructions.projectPlaceholder')}
          onChange={(event) => vscode.postMessage({ type: 'setProjectInstructions', instructions: event.target.value })}
        />
      </Card>
      <Card
        title={t('settings.instructions.effectiveTitle')}
        description={t('settings.instructions.effectiveDescription')}
      >
        <InstructionSourceList sources={instructionSources} />
      </Card>
    </div>
  );
}

function ModesSettingsPage({
  agentMode,
  agentModes,
  activeMode
}: {
  agentMode: AgentModeId;
  agentModes: AgentMode[];
  activeMode: AgentMode | undefined;
}) {
  const { t } = useI18n();
  const [addingMode, setAddingMode] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newInstructions, setNewInstructions] = useState('');

  const handleAddMode = () => {
    const label = newLabel.trim();
    if (!label) return;
    vscode.postMessage({ type: 'addAgentMode', label, instructions: newInstructions.trim() });
    setNewLabel('');
    setNewInstructions('');
    setAddingMode(false);
  };

  return (
    <div className={styles.sectionStack}>
      <Card title={t('settings.modes.activeTitle')} description={t('settings.modes.activeDescription')}>
        <div className={styles.formGrid}>
          <AgentModeSelect modes={agentModes} activeId={agentMode} />
          {activeMode ? (
            <TextArea
              rows={8}
              value={activeMode.instructions}
              onChange={(event) =>
                vscode.postMessage({
                  type: 'setAgentModeInstructions',
                  modeId: activeMode.id,
                  instructions: event.target.value
                })
              }
            />
          ) : null}
        </div>
      </Card>
      <Card
        title={t('settings.modes.customTitle')}
        description={t('settings.modes.customDescription')}
        actions={
          <Button size="sm" variant="secondary" leadingIcon={<Plus size={14} />} onClick={() => setAddingMode(true)}>
            {t('settings.modes.addMode')}
          </Button>
        }
      >
        {addingMode ? (
          <div className={styles.formGrid}>
            <TextField
              label={t('settings.modes.modeName')}
              placeholder={t('settings.modes.modePlaceholder')}
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              autoFocus
            />
            <TextArea
              label={t('common.instructions')}
              rows={5}
              value={newInstructions}
              onChange={(event) => setNewInstructions(event.target.value)}
            />
            <div className={styles.actions}>
              <Button size="sm" variant="primary" disabled={!newLabel.trim()} onClick={handleAddMode}>
                {t('common.add')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingMode(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.list}>
            {agentModes.map((mode) => (
              <Badge key={mode.id} tone={mode.id === agentMode ? 'accent' : 'neutral'}>
                {mode.label}
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
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
