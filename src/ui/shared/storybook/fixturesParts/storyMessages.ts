import { type ChatMessage } from '../../shared/types';
import { storyNow } from './storyNow';

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
