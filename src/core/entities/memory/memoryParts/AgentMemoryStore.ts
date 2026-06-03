import fs from 'node:fs';

import { appendJsonl, writeJsonAtomic } from '../../storage/storage';
import { AgentMemoryCandidate } from './AgentMemoryCandidate';
import { AgentMemoryEvent } from './AgentMemoryEvent';
import { AgentMemoryItem } from './AgentMemoryItem';
import { AgentMemoryScope } from './AgentMemoryScope';
import { AgentMemoryStorePaths } from './AgentMemoryStorePaths';
import { DEFAULT_MEMORY_IMPORTANCE } from './DEFAULT_MEMORY_IMPORTANCE';
import { MEMORY_VERSION } from './MEMORY_VERSION';
import { StoredMemory } from './StoredMemory';
import { createMemoryId } from './createMemoryId';
import { normalizeMemoryImportance } from './normalizeMemoryImportance';
import { normalizeMemoryItems } from './normalizeMemoryItems';
import { normalizeMemoryKey } from './normalizeMemoryKey';
import { sanitizeMemoryNote } from './sanitizeMemoryNote';
import { sortMemoryItems } from './sortMemoryItems';

/**
 * Что это: файловое хранилище заметок памяти агента.
 * Зачем нужно: global/project память хранится отдельно, но читается и обновляется через единый API.
 * Какую продуктовую проблему решает: ручное и автоматическое сохранение заметок не создают разные источники правды.
 */
export class AgentMemoryStore {
  constructor(private readonly paths: AgentMemoryStorePaths) {}

  /** Возвращает заметки, отсортированные по полезности и свежести. */
  list(scope?: AgentMemoryScope): AgentMemoryItem[] {
    const items = sortMemoryItems({ items: [...this.readScope('global'), ...this.readScope('project')] });
    return scope ? items.filter((item) => item.scope === scope) : items;
  }

  /** Добавляет или обновляет заметку без удаления других заметок. */
  async add(candidate: AgentMemoryCandidate): Promise<AgentMemoryItem | undefined> {
    const note = sanitizeMemoryNote(candidate.note);
    if (!note) {
      return undefined;
    }

    const current = this.readScope(candidate.scope);
    const duplicate = current.find((item) => normalizeMemoryKey(item.note) === normalizeMemoryKey(note));
    const now = Date.now();
    const importance = normalizeMemoryImportance({ value: candidate.importance, fallback: DEFAULT_MEMORY_IMPORTANCE });
    const nextItem: AgentMemoryItem = duplicate
      ? { ...duplicate, note, enabled: true, importance, updatedAt: now }
      : {
          id: createMemoryId(
            note,
            current.map((item) => item.id)
          ),
          scope: candidate.scope,
          note,
          enabled: true,
          importance,
          createdAt: now,
          updatedAt: now
        };
    const nextItems = duplicate
      ? current.map((item) => (item.id === duplicate.id ? nextItem : item))
      : [...current, nextItem];

    await this.writeScope(candidate.scope, sortMemoryItems({ items: nextItems }));
    await this.appendEvent({ timestamp: now, action: 'add', scope: candidate.scope, itemId: nextItem.id });
    return nextItem;
  }

  /** Добавляет заметку и при необходимости удаляет одну менее полезную заметку. */
  async replace(input: {
    candidate: AgentMemoryCandidate;
    replaceItemId?: string;
  }): Promise<AgentMemoryItem | undefined> {
    const note = sanitizeMemoryNote(input.candidate.note);
    if (!note) {
      return undefined;
    }

    const now = Date.now();
    const current = this.readScope(input.candidate.scope).filter((item) => item.id !== input.replaceItemId);
    const importance = normalizeMemoryImportance({
      value: input.candidate.importance,
      fallback: DEFAULT_MEMORY_IMPORTANCE
    });
    const nextItem: AgentMemoryItem = {
      id: createMemoryId(
        note,
        current.map((item) => item.id)
      ),
      scope: input.candidate.scope,
      note,
      enabled: true,
      importance,
      createdAt: now,
      updatedAt: now
    };

    await this.writeScope(input.candidate.scope, sortMemoryItems({ items: [...current, nextItem] }));
    await this.appendEvent({
      timestamp: now,
      action: input.replaceItemId ? 'replace' : 'add',
      scope: input.candidate.scope,
      itemId: nextItem.id,
      replacedItemId: input.replaceItemId
    });
    return nextItem;
  }

  /** Удаляет заметку памяти. */
  async delete(scope: AgentMemoryScope, id: string): Promise<boolean> {
    const current = this.readScope(scope);
    const nextItems = current.filter((item) => item.id !== id);
    if (nextItems.length === current.length) {
      return false;
    }

    await this.writeScope(scope, nextItems);
    await this.appendEvent({ timestamp: Date.now(), action: 'delete', scope, itemId: id });
    return true;
  }

  /** Включает или выключает заметку без удаления текста. */
  async setEnabled(scope: AgentMemoryScope, id: string, enabled: boolean): Promise<boolean> {
    const current = this.readScope(scope);
    let changed = false;
    const now = Date.now();
    const nextItems = current.map((item) => {
      if (item.id !== id) {
        return item;
      }
      changed = item.enabled !== enabled;
      return { ...item, enabled, updatedAt: now };
    });

    if (!changed) {
      return false;
    }

    await this.writeScope(scope, nextItems);
    await this.appendEvent({ timestamp: now, action: 'setEnabled', scope, itemId: id, enabled });
    return true;
  }

  private readScope(scope: AgentMemoryScope): AgentMemoryItem[] {
    const filePath = scope === 'global' ? this.paths.globalPath : this.paths.projectPath;
    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as StoredMemory;
      return normalizeMemoryItems(parsed.items, scope);
    } catch (error) {
      console.error('[aist] Failed to read agent memory', error);
      return [];
    }
  }

  private async writeScope(scope: AgentMemoryScope, items: AgentMemoryItem[]): Promise<void> {
    const filePath = scope === 'global' ? this.paths.globalPath : this.paths.projectPath;
    await writeJsonAtomic(filePath, { version: MEMORY_VERSION, items });
  }

  private async appendEvent(event: AgentMemoryEvent): Promise<void> {
    await appendJsonl(this.paths.eventsPath, event);
  }
}
