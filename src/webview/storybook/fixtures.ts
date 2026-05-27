import type {
  AgentMode,
  AgentPromptConfig,
  AgentSkill,
  AgentState,
  Chat,
  ChatMessage,
  ChatSummary,
  ModelOption,
  ToolPermissionItem,
  ToolPermissionPreset
} from '../shared/types';

export const storyNow = new Date('2026-05-24T12:30:00Z').getTime();

export const storyTools = [
  'get_workspace_info',
  'list_files',
  'read_file',
  'read_file_range',
  'grep_search',
  'run_bash_script',
  'write_file',
  'replace_in_file',
  'apply_patch',
  'create_directory',
  'delete_path'
];

export const storyAgentModes: AgentMode[] = [
  {
    id: 'default',
    label: 'Default',
    instructions: 'Be concise, inspect the repository before editing, and explain important tradeoffs.'
  },
  {
    id: 'careful',
    label: 'Careful',
    instructions: 'Prefer small, reversible changes. Run verification after each risky edit.'
  },
  {
    id: 'frontend',
    label: 'Frontend polish',
    instructions: 'Focus on layout, interaction states, responsive behavior, and visual consistency.'
  }
];

export const storyInstructionSources = [
  {
    id: 'base',
    title: 'AIST base system prompt',
    content: 'Core coding-agent rules, language policy and tool usage rules.',
    priority: 0,
    kind: 'base' as const,
    source: 'immutable kernel'
  },
  {
    id: 'AGENTS.md',
    title: 'AGENTS.md',
    content: 'Follow Feature-Sliced Design and keep files small.',
    priority: 20,
    kind: 'file' as const,
    source: 'AGENTS.md'
  },
  {
    id: '.aist-agent/instructions/project.md',
    title: '.aist-agent project instructions',
    content: 'Prefer simple implementations and run typecheck after edits.',
    priority: 12,
    kind: 'declarative' as const,
    source: '.aist-agent/instructions/project.md'
  },
  {
    id: 'mode:frontend',
    title: 'Mode: Frontend polish',
    content: storyAgentModes[2].instructions,
    priority: 50,
    kind: 'mode' as const
  }
];

export const storyPromptConfig: AgentPromptConfig = {
  globalInstructions: [
    {
      id: 'practical-coding',
      label: 'Practical coding',
      content: 'Work briefly and practically. Inspect relevant files before editing.',
      scope: 'global',
      kind: 'instruction'
    }
  ],
  localInstructions: [
    {
      id: 'project-style',
      label: 'Project style',
      content: 'Follow Feature-Sliced Design and keep files small.',
      scope: 'local',
      kind: 'instruction'
    }
  ],
  globalModes: [
    {
      id: 'coder',
      label: 'Coder',
      instructions: 'Implement the requested change directly and verify it.',
      scope: 'global',
      kind: 'mode'
    }
  ],
  localModes: [
    {
      id: 'frontend',
      label: 'Frontend polish',
      instructions: 'Focus on layout, interaction states, responsive behavior, and visual consistency.',
      scope: 'local',
      kind: 'mode'
    }
  ],
  presets: [
    {
      id: 'coding',
      label: 'Coding',
      instructionRefs: [
        { scope: 'global', id: 'practical-coding' },
        { scope: 'local', id: 'project-style' }
      ],
      modeRef: { scope: 'global', id: 'coder' },
      scope: 'local'
    }
  ],
  activeInstructionRefs: [
    { scope: 'global', id: 'practical-coding' },
    { scope: 'local', id: 'project-style' }
  ],
  activeModeRef: { scope: 'local', id: 'frontend' },
  activePresetId: 'coding'
};

export const storyCustomSkills: AgentSkill[] = [
  {
    id: 'focused-tests',
    label: 'Focused tests',
    description: 'Run the smallest useful test command for the current change.',
    command: 'npm run test -- --run',
    permission: 'ask',
    scope: 'local'
  }
];

export const storyModels: ModelOption[] = [
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openrouter',
    contextLength: 128000,
    pricing: { prompt: 0.15, completion: 0.6 },
    supportsTools: true
  },
  {
    id: 'anthropic/claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'openrouter',
    contextLength: 200000,
    pricing: { prompt: 3, completion: 15 },
    supportsTools: true
  },
  {
    id: 'codex:gpt-5.1-codex',
    name: 'GPT-5.1 Codex',
    provider: 'codex',
    contextLength: 256000,
    supportsTools: true,
    codexServiceTiers: ['priority']
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B Instruct',
    provider: 'openrouter',
    contextLength: 131000,
    supportsTools: false
  }
];

export const storyToolPermissions: ToolPermissionItem[] = [
  {
    name: 'read_file',
    description: 'Read a workspace file and return a compact preview for the agent.',
    permission: 'auto',
    defaultPermission: 'auto'
  },
  {
    name: 'read_file_range',
    description: 'Read a bounded line range from a workspace file.',
    permission: 'auto',
    defaultPermission: 'auto'
  },
  {
    name: 'grep_search',
    description: 'Search the repository with ripgrep and show matching files.',
    permission: 'auto',
    defaultPermission: 'auto'
  },
  {
    name: 'run_bash_script',
    description: 'Run a shell command in the workspace.',
    permission: 'ask',
    defaultPermission: 'ask'
  },
  {
    name: 'replace_in_file',
    description: 'Replace a range or matching text inside an existing file.',
    permission: 'ask',
    defaultPermission: 'ask'
  },
  {
    name: 'apply_patch',
    description: 'Apply a unified diff patch to workspace files.',
    permission: 'ask',
    defaultPermission: 'ask'
  }
];

export const storyToolPermissionPresets: ToolPermissionPreset[] = [
  {
    id: 'confirm-all',
    label: 'Confirm all',
    description: 'Ask before every tool call.',
    permissions: {
      get_workspace_info: 'ask',
      list_files: 'ask',
      read_file: 'ask',
      read_file_range: 'ask',
      grep_search: 'ask',
      run_bash_script: 'ask',
      write_file: 'ask',
      replace_in_file: 'ask',
      apply_patch: 'ask',
      create_directory: 'ask',
      delete_path: 'ask'
    }
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Read and search automatically; ask before shell commands and file changes.',
    permissions: {
      get_workspace_info: 'auto',
      list_files: 'auto',
      read_file: 'auto',
      read_file_range: 'auto',
      grep_search: 'auto',
      run_bash_script: 'ask',
      write_file: 'ask',
      replace_in_file: 'ask',
      apply_patch: 'ask',
      create_directory: 'ask',
      delete_path: 'ask'
    }
  },
  {
    id: 'fast-edit',
    label: 'Fast edit',
    description: 'Read, search, create, and edit automatically; ask before shell commands and deletion.',
    permissions: {
      get_workspace_info: 'auto',
      list_files: 'auto',
      read_file: 'auto',
      read_file_range: 'auto',
      grep_search: 'auto',
      run_bash_script: 'ask',
      write_file: 'auto',
      replace_in_file: 'auto',
      apply_patch: 'auto',
      create_directory: 'auto',
      delete_path: 'ask'
    }
  },
  {
    id: 'autonomous',
    label: 'Autonomous',
    description: 'Run every available tool automatically.',
    permissions: {
      get_workspace_info: 'auto',
      list_files: 'auto',
      read_file: 'auto',
      read_file_range: 'auto',
      grep_search: 'auto',
      run_bash_script: 'auto',
      write_file: 'auto',
      replace_in_file: 'auto',
      apply_patch: 'auto',
      create_directory: 'auto',
      delete_path: 'auto'
    }
  }
];

export const storyMessages: ChatMessage[] = [
  {
    id: 'msg-user',
    role: 'user',
    content: 'Добавь Storybook и покажи ключевые компоненты.',
    createdAt: storyNow - 1000 * 60 * 8
  },
  {
    id: 'msg-assistant',
    role: 'assistant',
    content:
      'Готово. Я добавил конфиг, мок VS Code API и истории для основных компонентов.\n\n- `MessageCard`\n- `ToolMessageCard`\n- `Composer`\n- страницы чата и настроек',
    usage: {
      tokens: 2680,
      promptTokens: 1400,
      completionTokens: 1280,
      costUsd: 0.0028
    },
    createdAt: storyNow - 1000 * 60 * 6
  },
  {
    id: 'tool-read-file',
    role: 'tool',
    name: 'read_file',
    status: 'done',
    args: { path: 'src/webview/app/App.tsx' },
    result: {
      path: 'src/webview/app/App.tsx',
      content: "import { useEffect, useState } from 'react';\n\nexport function App() {\n  return <div />;\n}\n"
    },
    usage: { tokens: 420, costUsd: 0.0004 },
    createdAt: storyNow - 1000 * 60 * 3
  },
  {
    id: 'tool-grep',
    role: 'tool',
    name: 'grep_search',
    status: 'done',
    args: { query: 'MessageCard' },
    result: {
      matches: [
        { path: 'src/webview/entities/message/MessageCard.tsx', line: 14, column: 17 },
        { path: 'src/webview/widgets/message-list/message-list/MessageList.tsx', line: 38, column: 12 }
      ],
      truncated: false
    },
    createdAt: storyNow - 1000 * 60 * 2
  },
  {
    id: 'msg-agent-error',
    role: 'assistant',
    marker: 'aist:internal-error-message:v1',
    content: '**AIST error (model request attempt 1/3)**\n\nNetwork connection was interrupted. Retrying the request.',
    createdAt: storyNow - 1000 * 60
  },
  {
    id: 'msg-agent-tools-summary',
    role: 'assistant',
    content: 'Проверил места использования `MessageCard` и подготовил группировку tool calls под общий cut.',
    createdAt: storyNow - 1000 * 45
  }
];

export const storyToolMessages: Record<string, ChatMessage> = {
  waitingApproval: {
    id: 'tool-approval',
    role: 'tool',
    name: 'replace_in_file',
    status: 'waiting',
    approval: 'pending',
    reason: 'Need permission before changing source files.',
    args: { path: 'src/webview/app/styles.css', search: '.message-card', replace: '.message-card' },
    result: { preview: { path: 'src/webview/app/styles.css', replacements: 3 } },
    createdAt: storyNow - 1000 * 90
  },
  runningBash: {
    id: 'tool-bash',
    role: 'tool',
    name: 'run_bash_script',
    status: 'running',
    args: { script: 'npm run typecheck' },
    reason: 'Verifying TypeScript after Storybook setup.',
    createdAt: storyNow - 1000 * 70
  },
  finishedBash: {
    id: 'tool-bash-done',
    role: 'tool',
    name: 'run_bash_script',
    status: 'done',
    args: {
      script: 'npm run test -- --run src/webview/entities/message/toolValue.test.ts',
      cwd: '.',
      timeoutMs: 120000
    },
    result: {
      ok: true,
      cwd: '.',
      exitCode: 0,
      signal: null,
      timedOut: false,
      durationMs: 1840,
      stdout:
        '✓ src/webview/entities/message/toolValue.test.ts (4 tests) 12ms\n\nTest Files  1 passed (1)\nTests  4 passed (4)',
      stderr: '',
      stdoutTruncated: false,
      stderrTruncated: false
    },
    reason: 'Checking the parser helpers still behave correctly.',
    createdAt: storyNow - 1000 * 55
  },
  approvedWithComment: {
    id: 'tool-approved-comment',
    role: 'tool',
    name: 'replace_in_file',
    status: 'done',
    approval: 'approved',
    reason: 'Apply the user-approved wording change.',
    userApprovalComment: 'Keep the public API name unchanged.',
    args: { path: 'src/extension/agent/runtime/toolRunner.ts', search: 'userComment', replace: 'userApprovalComment' },
    result: {
      ok: true,
      path: 'src/extension/agent/runtime/toolRunner.ts',
      replacements: 3,
      userApprovalComment: 'Keep the public API name unchanged.'
    },
    createdAt: storyNow - 1000 * 50
  },
  errored: {
    id: 'tool-error',
    role: 'tool',
    name: 'delete_path',
    status: 'error',
    args: { path: 'dist/old.js' },
    result: { error: 'Permission denied by user.' },
    createdAt: storyNow - 1000 * 40
  },
  listFiles: {
    id: 'tool-list',
    role: 'tool',
    name: 'list_files',
    status: 'done',
    args: { path: 'src/webview' },
    result: {
      entries: [
        { path: 'src/webview/app', type: 'directory' },
        { path: 'src/webview/entities', type: 'directory' },
        { path: 'src/webview/features', type: 'directory' },
        { path: 'src/webview/widgets', type: 'directory' }
      ]
    },
    createdAt: storyNow - 1000 * 20
  }
};

export const storyChatSummaries: ChatSummary[] = [
  {
    id: 'chat-active',
    title: 'Storybook setup',
    model: 'codex:gpt-5.1-codex',
    messageCount: storyMessages.length,
    lastUserMessage: 'Can you help wire Storybook into the webview?',
    busy: false,
    lastMessageAt: storyNow,
    updatedAt: storyNow
  },
  {
    id: 'chat-review',
    title: 'Review tool cards',
    model: 'openai/gpt-4o-mini',
    messageCount: 12,
    lastUserMessage: 'Review the tool approval cards and raw JSON view.',
    busy: false,
    lastMessageAt: storyNow - 1000 * 60 * 50,
    updatedAt: storyNow - 1000 * 60 * 45
  },
  {
    id: 'chat-busy',
    title: 'Running typecheck',
    model: 'anthropic/claude-3.7-sonnet',
    messageCount: 7,
    lastUserMessage: 'Run typecheck and fix the failing TypeScript errors.',
    busy: true,
    lastMessageAt: storyNow - 1000 * 60 * 120,
    updatedAt: storyNow - 1000 * 60 * 10
  }
];

export const storyActiveChat: Chat = {
  id: 'chat-active',
  title: 'Storybook setup',
  model: 'codex:gpt-5.1-codex',
  previousChat: undefined,
  messages: storyMessages,
  lastAnswer: storyMessages[1]?.content || '',
  busy: false,
  context: {
    tokens: 34800,
    maxTokens: 128000,
    percent: 27,
    inputCostUsd: 0.0042
  },
  usage: {
    promptTokens: 9200,
    completionTokens: 4100,
    totalTokens: 13300,
    costUsd: 0.0184
  },
  createdAt: storyNow - 1000 * 60 * 60,
  updatedAt: storyNow
};

export const storyAgentState: AgentState = {
  viewKind: 'editor',
  extensionVersion: '0.0.8',
  workspaceName: 'ai-agent',
  tools: storyTools,
  chats: storyChatSummaries,
  activeChat: storyActiveChat,
  models: storyModels,
  maxToolIterations: 6,
  reasoningEffort: 'medium',
  codexServiceTier: 'priority',
  editorContextMode: 'auto',
  streamingEnabled: false,
  compactionSettings: { enabled: true, thresholdPercent: 70, keepLastMessages: 0 },
  approvalNotificationSettings: {
    enabled: true,
    systemNotifications: true,
    sound: true,
    volume: 0.35,
    durationSeconds: 5
  },
  agentLanguage: 'ru',
  agentMode: 'frontend',
  agentModes: storyAgentModes,
  agentConfigScope: 'workspace',
  projectInstructions: 'Prefer simple implementations and run typecheck after edits.',
  promptConfig: storyPromptConfig,
  memoryItems: [
    {
      id: 'prefer-focused-tests',
      scope: 'project',
      note: 'Prefer focused Vitest coverage for the changed extension layer before broader checks.',
      enabled: true,
      createdAt: storyNow - 1000 * 60 * 60 * 24,
      updatedAt: storyNow - 1000 * 60 * 30
    }
  ],
  instructionSources: storyInstructionSources,
  customSkills: storyCustomSkills,
  codexAuthenticated: true,
  toolPermissions: storyToolPermissions,
  toolPermissionPresets: storyToolPermissionPresets,
  activeToolPermissionPresetId: 'balanced'
};
