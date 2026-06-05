import { type ChatSummary } from '../../shared/types';
import { createModelSettings } from './createModelSettings';
import { storyMessages } from './storyMessages';
import { storyNow } from './storyNow';

export const storyChatSummaries: ChatSummary[] = [
  {
    id: 'chat-active',
    title: 'Storybook setup',
    model: 'codex:gpt-5.1-codex',
    modelSettings: createModelSettings('codex:gpt-5.1-codex'),
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
    modelSettings: createModelSettings('openai/gpt-4o-mini'),
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
    modelSettings: createModelSettings('anthropic/claude-3.7-sonnet'),
    messageCount: 7,
    lastUserMessage: 'Run typecheck and fix the failing TypeScript errors.',
    busy: true,
    lastMessageAt: storyNow - 1000 * 60 * 120,
    updatedAt: storyNow - 1000 * 60 * 10
  }
];
