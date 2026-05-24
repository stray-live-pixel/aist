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

const NAV_ITEMS: Array<{ id: SettingsPageId; label: string; icon: ReactNode; description: string }> = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <SlidersHorizontal size={15} />,
    description: 'Model-adjacent request settings and status.'
  },
  {
    id: 'instructions',
    label: 'Instructions',
    icon: <FileText size={15} />,
    description: 'AGENTS.md, CLAUDE.md and project instructions.'
  },
  { id: 'modes', label: 'Modes', icon: <Bot size={15} />, description: 'Working modes and their system instructions.' },
  { id: 'skills', label: 'Skills', icon: <Wrench size={15} />, description: 'Custom Bash-backed run_skill actions.' },
  {
    id: 'permissions',
    label: 'Permissions',
    icon: <ShieldCheck size={15} />,
    description: 'Tool access presets and per-tool confirmations.'
  },
  {
    id: 'compaction',
    label: 'Compaction',
    icon: <Gauge size={15} />,
    description: 'Control when old context is split out of the active chat.'
  },
  {
    id: 'system',
    label: 'System',
    icon: <KeyRound size={15} />,
    description: 'Language, Codex auth and execution limits.'
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
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTitle}>Agent settings</div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.navButton} ${activePage === item.id ? styles.navButtonActive : ''}`}
            title={item.description}
            onClick={() => onChange(item.id)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function SettingsHeader({ activePage, onBack }: { activePage: SettingsPageId; onBack?(): void }) {
  return (
    <div className="flex items-start gap-3">
      {onBack ? (
        <IconButton title="Back to chat" onClick={onBack}>
          <ArrowLeft size={15} />
        </IconButton>
      ) : null}
      <PageIntro activePage={activePage} />
    </div>
  );
}

function PageIntro({ activePage }: { activePage: SettingsPageId }) {
  const item = NAV_ITEMS.find((navItem) => navItem.id === activePage) || NAV_ITEMS[0];
  return (
    <header className={styles.pageHeader}>
      <h1 className={styles.pageTitle}>{item.label}</h1>
      <p className={styles.pageDescription}>{item.description}</p>
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
  return (
    <div className={styles.sectionStack}>
      <Card
        tone="elevated"
        title="Current agent profile"
        description="A compact summary of rules and capabilities used by the next request."
      >
        <div className={styles.twoColumns}>
          <Badge tone="accent">Storage: {agentConfigScope === 'workspace' ? '.aist-agent' : 'local user'}</Badge>
          <Badge tone={activePermissionPresetId === 'custom' ? 'warning' : 'success'}>
            Permissions: {activePermissionPresetId}
          </Badge>
          <Badge tone="neutral">Mode: {activeMode?.label || 'Default'}</Badge>
          <Badge tone={customSkills.length ? 'accent' : 'neutral'}>Skills: {customSkills.length}</Badge>
          <Badge tone="neutral">Instruction sources: {instructionSources.length}</Badge>
          <Badge tone={codexAuthenticated ? 'success' : 'warning'}>
            Codex: {codexAuthenticated ? 'authorized' : 'not connected'}
          </Badge>
        </div>
      </Card>
      <Card title="Effective instruction order" description="The agent receives these blocks from top to bottom.">
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
  return (
    <div className={styles.sectionStack}>
      <Card
        title="Storage scope"
        description="Workspace settings are saved to .aist-agent/settings.json. Local user storage stays outside the repository."
      >
        <Select
          label="Save settings to"
          value={scope}
          options={[
            { value: 'workspace', label: 'Workspace .aist-agent' },
            { value: 'user', label: 'Local user storage' }
          ]}
          onChange={(event) =>
            vscode.postMessage({ type: 'setAgentConfigScope', scope: event.target.value as AgentConfigScope })
          }
        />
      </Card>
      <Card title="Project instructions" description="Extra rules appended after AGENTS.md and CLAUDE.md.">
        <TextArea
          rows={8}
          value={projectInstructions}
          placeholder="Project-specific instructions saved in the selected storage scope..."
          onChange={(event) => vscode.postMessage({ type: 'setProjectInstructions', instructions: event.target.value })}
        />
      </Card>
      <Card title="Effective order" description="Read-only view of the instruction blocks sent to the model.">
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
      <Card title="Active mode" description="Select a working mode and edit the instruction text applied to chats.">
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
        title="Custom modes"
        description="Create reusable instruction profiles for different kinds of work."
        actions={
          <Button size="sm" variant="secondary" leadingIcon={<Plus size={14} />} onClick={() => setAddingMode(true)}>
            Add mode
          </Button>
        }
      >
        {addingMode ? (
          <div className={styles.formGrid}>
            <TextField
              label="Mode name"
              placeholder="Expert reviewer"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              autoFocus
            />
            <TextArea
              label="Instructions"
              rows={5}
              value={newInstructions}
              onChange={(event) => setNewInstructions(event.target.value)}
            />
            <div className={styles.actions}>
              <Button size="sm" variant="primary" disabled={!newLabel.trim()} onClick={handleAddMode}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingMode(false)}>
                Cancel
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
        title="Custom skills"
        description="Add Bash-backed skills the agent can call with run_skill. Input is passed via stdin and AIST_SKILL_INPUT."
        actions={
          <Button size="sm" leadingIcon={<Plus size={14} />} onClick={() => setAddingSkill(true)}>
            Add skill
          </Button>
        }
      >
        {addingSkill ? (
          <div className={styles.formGrid}>
            <TextField
              label="Name"
              placeholder="Run focused tests"
              value={newSkill.label}
              onChange={(event) => setNewSkill((value) => ({ ...value, label: event.target.value }))}
              autoFocus
            />
            <TextField
              label="Description"
              placeholder="When should the agent use this skill?"
              value={newSkill.description}
              onChange={(event) => setNewSkill((value) => ({ ...value, description: event.target.value }))}
            />
            <TextArea
              label="Command"
              rows={5}
              value={newSkill.command}
              onChange={(event) => setNewSkill((value) => ({ ...value, command: event.target.value }))}
            />
            <Select
              label="Permission"
              value={newSkill.permission}
              options={PERMISSION_OPTIONS}
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
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingSkill(false)}>
                Cancel
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
          <p className={styles.empty}>No custom skills yet.</p>
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
  return (
    <div className={styles.sectionStack}>
      <Card title="Permission presets" description="Quickly switch the current tool access profile for the AI agent.">
        <div className={styles.formGrid}>
          <PermissionPresetSelect presets={permissionPresets} activeId={activePermissionPresetId} />
          <div className={styles.twoColumns}>
            {permissionPresets.map((preset) => (
              <Button
                key={preset.id}
                variant={preset.id === activePermissionPresetId ? 'primary' : 'secondary'}
                onClick={() => vscode.postMessage({ type: 'setToolPermissionPreset', presetId: preset.id })}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          {activePermissionPresetId === 'custom' ? <Badge tone="warning">Custom permissions are active</Badge> : null}
        </div>
      </Card>
      <Card title="Per-tool permissions" description="Fine-tune which tools require confirmation.">
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
  return (
    <div className={styles.sectionStack}>
      <Card
        title="Context compaction"
        description="When context becomes too large, AIST can start a fresh chat linked to the previous one. Old messages stay visible but stop being sent to the model."
      >
        <div className={styles.formGrid}>
          <Select
            label="Status"
            value={settings.enabled ? 'enabled' : 'disabled'}
            options={[
              { value: 'enabled', label: 'Enabled' },
              { value: 'disabled', label: 'Disabled' }
            ]}
            onChange={(event) =>
              vscode.postMessage({
                type: 'setCompactionSettings',
                settings: { enabled: event.target.value === 'enabled' }
              })
            }
          />
          <TextField
            label="Threshold percent"
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
            label="Keep last messages in new context"
            hint="0 means old context is fully cut off after the compaction line."
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
  return (
    <div className={styles.sectionStack}>
      <Card title="Language" description="Controls agent answers and tool-call explanations.">
        <Select
          label="Response language"
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
      <Card
        title="Tool iteration limit"
        description="Maximum model/tool-call turns per request. Set to 0 to run without a limit."
      >
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
        title="ChatGPT Codex"
        description={
          codexAuthenticated
            ? 'Authorization is active. Codex models are available.'
            : 'Authorize ChatGPT Codex to use codex:* models.'
        }
      >
        {codexAuthenticated ? (
          <div className={styles.actions}>
            <Badge tone="success" icon={<CheckCircle2 size={12} />}>
              Authorized
            </Badge>
            <Button
              variant="secondary"
              leadingIcon={<LogOut size={14} />}
              onClick={() => vscode.postMessage({ type: 'codexLogout' })}
            >
              Logout
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            leadingIcon={<LogIn size={14} />}
            onClick={() => vscode.postMessage({ type: 'codexLogin' })}
          >
            Authorize
          </Button>
        )}
      </Card>
    </div>
  );
}

function InstructionSourceList({ sources }: { sources: AgentInstructionSource[] }) {
  if (!sources.length) return <p className={styles.empty}>No instruction sources found.</p>;

  return (
    <div className={styles.list}>
      {sources.map((source) => (
        <Card key={source.id} title={source.title} description={`Priority #${source.priority}`}>
          <p className="m-0 line-clamp-3 text-xs leading-5 text-[var(--vscode-descriptionForeground)]">
            {source.content}
          </p>
        </Card>
      ))}
    </div>
  );
}

function SkillSettingsCard({ skill }: { skill: AgentSkill }) {
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
          label="Name"
          value={draft.label}
          onChange={(event) => setDraft((value) => ({ ...value, label: event.target.value }))}
        />
        <TextField
          label="Description"
          value={draft.description}
          onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))}
        />
        <TextArea
          label="Command"
          rows={5}
          value={draft.command}
          onChange={(event) => setDraft((value) => ({ ...value, command: event.target.value }))}
        />
        <Select
          label="Permission"
          value={draft.permission}
          options={PERMISSION_OPTIONS}
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
            Save
          </Button>
          <Button
            size="sm"
            variant="danger"
            leadingIcon={<Trash2 size={13} />}
            onClick={() => vscode.postMessage({ type: 'deleteSkill', skillId: skill.id })}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

const PERMISSION_OPTIONS = [
  { value: 'ask', label: 'Ask permission' },
  { value: 'auto', label: 'Run automatically' }
];
