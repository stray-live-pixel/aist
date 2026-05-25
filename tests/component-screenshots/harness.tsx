import { createRoot } from 'react-dom/client';

import { I18nProvider } from '../../src/webview/shared/i18n';
import type { ChatMessage } from '../../src/webview/shared/types';
import { storyAgentModes, storyMessages, storyPromptConfig, storyTools } from '../../src/webview/storybook/fixtures';
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
  | 'message-list';

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

function isScenarioId(value: string | null): value is ScenarioId {
  return Boolean(
    value &&
    ['empty-state', 'agent-activity-status', 'system-instruction-label', 'tool-calls-cut', 'message-list'].includes(
      value
    )
  );
}

createRoot(document.getElementById('root')!).render(<HarnessApp />);
