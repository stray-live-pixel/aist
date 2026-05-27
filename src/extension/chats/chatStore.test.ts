import { describe, expect, it, vi } from 'vitest';

import { selectCompactionTailMessages, splitCompactionHistory } from '../agent/runtime/compaction';
import { ChatStore } from './chatStore';
import type { ChatMessage } from './types';

type Listener<T> = (event: T) => unknown;

vi.mock('vscode', () => {
  class EventEmitter<T> {
    private listeners: Listener<T>[] = [];

    event = (listener: Listener<T>) => {
      this.listeners.push(listener);
      return { dispose: () => undefined };
    };

    fire(event: T): void {
      for (const listener of this.listeners) {
        listener(event);
      }
    }

    dispose(): void {
      this.listeners = [];
    }
  }

  return { EventEmitter };
});

describe('ChatStore.compactChat', () => {
  it('creates summary-only compacted chat when keepLastMessages is 0', () => {
    const store = createStore();
    const source = store.getActiveChat();
    appendConversation(store, source.id, ['Plan the change.', 'Change planned.']);
    store.setHistory(source.id, [
      { role: 'user', content: 'Plan the change.' },
      { role: 'assistant', content: 'Change planned.' }
    ]);

    const { summaryHistory, tailHistory } = splitCompactionHistory(source.history, 0);
    const tailMessages = selectCompactionTailMessages(source.messages, 0);
    const compacted = store.compactChat(source.id, 'Summary handoff.', {
      messages: tailMessages,
      history: tailHistory
    });

    expect(summaryHistory.map((message) => message.content)).toEqual(['Plan the change.', 'Change planned.']);
    expect(compacted.previousChatId).toBe(source.id);
    expect(compacted.messages.map((message) => message.content)).toEqual(['Summary handoff.']);
    expect(compacted.history).toEqual([{ role: 'assistant', content: 'Summary handoff.' }]);
    expect(compacted.usage).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
  });

  it('keeps the last message after the summary when keepLastMessages is 1', () => {
    const store = createStore();
    const source = store.getActiveChat();
    appendConversation(store, source.id, ['Inspect file.', 'File inspected.', 'Now patch it.']);
    store.setHistory(source.id, [
      { role: 'user', content: 'Inspect file.' },
      { role: 'assistant', content: 'File inspected.' },
      { role: 'user', content: 'Now patch it.' }
    ]);
    const originalTailId = source.messages.at(-1)?.id;

    const { summaryHistory, tailHistory } = splitCompactionHistory(source.history, 1);
    const tailMessages = selectCompactionTailMessages(source.messages, 1);
    const compacted = store.compactChat(source.id, 'Summary handoff.', {
      messages: tailMessages,
      history: tailHistory
    });

    expect(summaryHistory.map((message) => message.content)).toEqual(['Inspect file.', 'File inspected.']);
    expect(compacted.messages.map((message) => message.content)).toEqual(['Summary handoff.', 'Now patch it.']);
    expect(compacted.messages[1]?.id).not.toBe(originalTailId);
    expect(compacted.history).toEqual([
      { role: 'assistant', content: 'Summary handoff.' },
      { role: 'user', content: 'Now patch it.' }
    ]);
  });

  it('keeps the full source history after the summary when keepLastMessages exceeds history length', () => {
    const store = createStore();
    const source = store.getActiveChat();
    appendConversation(store, source.id, ['First.', 'Second.']);
    store.setHistory(source.id, [
      { role: 'user', content: 'First.' },
      { role: 'assistant', content: 'Second.' }
    ]);

    const { summaryHistory, tailHistory } = splitCompactionHistory(source.history, 10);
    const tailMessages = selectCompactionTailMessages(source.messages, 10);
    const compacted = store.compactChat(source.id, 'Summary handoff.', {
      messages: tailMessages,
      history: tailHistory
    });

    expect(summaryHistory).toEqual([]);
    expect(compacted.messages.map((message) => message.content)).toEqual(['Summary handoff.', 'First.', 'Second.']);
    expect(compacted.history).toEqual([
      { role: 'assistant', content: 'Summary handoff.' },
      { role: 'user', content: 'First.' },
      { role: 'assistant', content: 'Second.' }
    ]);
  });
});

function createStore(): ChatStore {
  return new ChatStore(createMemento(), 'test-model');
}

function appendConversation(store: ChatStore, chatId: string, contents: string[]): ChatMessage[] {
  return contents.map((content, index) =>
    store.appendMessage(chatId, {
      role: index % 2 === 0 ? 'user' : 'assistant',
      content
    })
  );
}

function createMemento() {
  const values = new Map<string, unknown>();

  return {
    get<T>(key: string): T | undefined {
      return values.get(key) as T | undefined;
    },
    update(key: string, value: unknown): Thenable<void> {
      values.set(key, value);
      return Promise.resolve();
    },
    keys(): readonly string[] {
      return [...values.keys()];
    }
  };
}
