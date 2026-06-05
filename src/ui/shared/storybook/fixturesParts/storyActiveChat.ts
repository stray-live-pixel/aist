import { type Chat } from '../../shared/types';
import { createModelSettings } from './createModelSettings';
import { storyMessages } from './storyMessages';
import { storyNow } from './storyNow';

export const storyActiveChat: Chat = {
  id: 'chat-active',
  title: 'Storybook setup',
  model: 'codex:gpt-5.1-codex',
  modelSettings: createModelSettings('codex:gpt-5.1-codex'),
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
