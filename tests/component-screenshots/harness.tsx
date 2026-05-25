import { createRoot } from 'react-dom/client';

import {
  MessageCard,
  ToolApprovalActions,
  ToolMessageCard,
  ToolResultPreview,
  WorkspaceFileLink
} from '../../src/webview/entities/message';
import {
  AgentModeSelect,
  Composer,
  CopyMessageButton,
  ModelSelect,
  PermissionPresetSelect,
  ToolPermissionSelect
} from '../../src/webview/features';
import { I18nProvider } from '../../src/webview/shared/i18n';
import type { ChatMessage } from '../../src/webview/shared/types';
import {
  storyAgentModes,
  storyMessages,
  storyModels,
  storyPromptConfig,
  storyToolMessages,
  storyToolPermissionPresets,
  storyToolPermissions,
  storyTools
} from '../../src/webview/storybook/fixtures';
import {
  AgentActivityStatus,
  EmptyState,
  MessageList,
  SystemInstructionLabel,
  ToolCallsCut
} from '../../src/webview/widgets/message-list';
import './base.css';

/**
 * Что это: список сценариев, которые Playwright открывает через query-параметр.
 * Зачем нужно: один статический HTML рендерит только нужный компонент, а не весь Storybook.
 */
type ScenarioId =
  | 'empty-state'
  | 'agent-activity-status'
  | 'system-instruction-label'
  | 'tool-calls-cut'
  | 'message-list'
  | 'message-card-user'
  | 'message-card-assistant'
  | 'tool-message-card-approval'
  | 'tool-message-card-bash'
  | 'tool-result-preview-bash'
  | 'tool-approval-actions'
  | 'workspace-file-link'
  | 'feature-agent-mode-select'
  | 'feature-model-select'
  | 'feature-permission-preset-select'
  | 'feature-tool-permission-select'
  | 'feature-copy-message-button'
  | 'feature-composer';

const storyInstructionSources = [
  {
    id: 'base',
    title: 'AIST base system prompt',
    content: 'Core coding-agent rules and tool usage policy.',
    priority: 0,
    kind: 'base' as const
  },
  {
    id: 'AGENTS.md',
    title: 'AGENTS.md',
    content: 'Follow project architecture and testing rules.',
    priority: 20,
    kind: 'file' as const
  },
  {
    id: 'mode',
    title: 'Mode: Expert',
    content: storyAgentModes[2].instructions,
    priority: 50,
    kind: 'mode' as const
  }
];

const toolMessages = storyMessages.filter((message): message is ChatMessage => message.role === 'tool');
const userMessage = storyMessages.find((message) => message.role === 'user');
const assistantMessage = [...storyMessages].reverse().find((message) => message.role === 'assistant');

/**
 * Что это: root-обёртка с фиксированными размерами для стабильных screenshot-эталонов.
 * Зачем нужно: скриншоты сравниваются пиксельно, поэтому viewport и фон должны быть одинаковыми локально и в CI.
 */
function HarnessApp() {
  const scenario = getScenarioId();

  return (
    <I18nProvider language="ru">
      <main className="component-shot-page">
        <section className="component-shot-card" data-testid="component-shot">
          {renderScenario(scenario)}
        </section>
      </main>
    </I18nProvider>
  );
}

function renderScenario(scenario: ScenarioId) {
  switch (scenario) {
    case 'agent-activity-status':
      return <AgentActivityStatus activity="runningTool" detail="Выполняю `npm run typecheck` и жду результат." />;
    case 'system-instruction-label':
      return (
        <SystemInstructionLabel
          mode={storyAgentModes[2]}
          sources={storyInstructionSources}
          promptConfig={storyPromptConfig}
        />
      );
    case 'tool-calls-cut':
      return (
        <ToolCallsCut
          tools={toolMessages}
          userMessage={userMessage}
          assistantMessage={assistantMessage}
          active={false}
        />
      );
    case 'message-list':
      return (
        <div className="component-shot-message-list">
          <MessageList
            messages={storyMessages}
            tools={storyTools}
            activeMode={storyAgentModes[2]}
            instructionSources={storyInstructionSources}
            promptConfig={storyPromptConfig}
            busy={false}
            activity={undefined}
          />
        </div>
      );
    case 'message-card-user':
      return userMessage ? <MessageCard message={userMessage} /> : null;
    case 'message-card-assistant':
      return assistantMessage ? <MessageCard message={assistantMessage} /> : null;
    case 'tool-message-card-approval':
      return <ToolMessageCard message={storyToolMessages.waitingApproval} />;
    case 'tool-message-card-bash':
      return <ToolMessageCard message={storyToolMessages.finishedBash} />;
    case 'tool-result-preview-bash':
      return <ToolResultPreview message={storyToolMessages.finishedBash} />;
    case 'tool-approval-actions':
      return <ToolApprovalActions messageId="tool-approval-screenshot" compact={false} />;
    case 'workspace-file-link':
      return (
        <WorkspaceFileLink
          file={{ path: 'src/webview/entities/message/MessageCard.tsx', line: 14, label: 'component' }}
        />
      );
    case 'feature-agent-mode-select':
      return <AgentModeSelect modes={storyAgentModes} activeId="frontend" className="component-shot-control-wide" />;
    case 'feature-model-select':
      return <ModelSelect model="codex:gpt-5.1-codex" models={storyModels} />;
    case 'feature-permission-preset-select':
      return <PermissionPresetSelect presets={storyToolPermissionPresets} activeId="balanced" />;
    case 'feature-tool-permission-select':
      return <ToolPermissionSelect item={storyToolPermissions[2]} />;
    case 'feature-copy-message-button':
      return <CopyMessageButton markdown="Copied from screenshot harness" />;
    case 'feature-composer':
      return (
        <div className="component-shot-composer">
          <Composer
            busy={false}
            settings={
              <span className="component-shot-composer-settings">
                Mode: Frontend · Safe access · Tokens: 12.4K · Cost: ~$0.0021
              </span>
            }
          />
        </div>
      );
    case 'empty-state':
    default:
      return <EmptyState />;
  }
}

function getScenarioId(): ScenarioId {
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get('scenario');
  return isScenarioId(scenario) ? scenario : 'empty-state';
}

const ALL_SCENARIOS: ScenarioId[] = [
  'empty-state',
  'agent-activity-status',
  'system-instruction-label',
  'tool-calls-cut',
  'message-list',
  'message-card-user',
  'message-card-assistant',
  'tool-message-card-approval',
  'tool-message-card-bash',
  'tool-result-preview-bash',
  'tool-approval-actions',
  'workspace-file-link',
  'feature-agent-mode-select',
  'feature-model-select',
  'feature-permission-preset-select',
  'feature-tool-permission-select',
  'feature-copy-message-button',
  'feature-composer'
];

function isScenarioId(value: string | null): value is ScenarioId {
  return Boolean(value && ALL_SCENARIOS.includes(value as ScenarioId));
}

createRoot(document.getElementById('root')!).render(<HarnessApp />);
