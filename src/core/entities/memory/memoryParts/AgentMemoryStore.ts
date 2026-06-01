import fs from 'node:fs';

import { appendJsonl, writeJsonAtomic } from '../../storage/storage';
import { AgentMemoryCandidate } from './AgentMemoryCandidate';
import { AgentMemoryEvent } from './AgentMemoryEvent';
import { AgentMemoryItem } from './AgentMemoryItem';
import { AgentMemoryScope } from './AgentMemoryScope';
import { AgentMemoryStorePaths } from './AgentMemoryStorePaths';
import { MEMORY_VERSION } from './MEMORY_VERSION';
import { StoredMemory } from './StoredMemory';
import { createMemoryId } from './createMemoryId';
import { normalizeMemoryItems } from './normalizeMemoryItems';
import { normalizeMemoryKey } from './normalizeMemoryKey';
import { sanitizeMemoryNote } from './sanitizeMemoryNote';

export class AgentMemoryStore {
  constructor(private readonly paths: AgentMemoryStorePaths) {}

  list(scope?: AgentMemoryScope): AgentMemoryItem[] {
    const items = [...this.readScope('global'), ...this.readScope('project')];
    return scope ? items.filter((item) => item.scope === scope) : items;
  }

  async add(candidate: AgentMemoryCandidate): Promise<AgentMemoryItem | undefined> {
    const note = sanitizeMemoryNote(candidate.note);
    if (!note) {
      return undefined;
    }

    const current = this.readScope(candidate.scope);
    const duplicate = current.find((item) => normalizeMemoryKey(item.note) === normalizeMemoryKey(note));
    const now = Date.now();
    const nextItem: AgentMemoryItem = duplicate
      ? { ...duplicate, note, enabled: true, updatedAt: now }
      : {
          id: createMemoryId(
            note,
            current.map((item) => item.id)
          ),
          scope: candidate.scope,
          note,
          enabled: true,
          createdAt: now,
          updatedAt: now
        };
    const nextItems = duplicate
      ? current.map((item) => (item.id === duplicate.id ? nextItem : item))
      : [...current, nextItem];

    await this.writeScope(candidate.scope, nextItems);
    await this.appendEvent({ timestamp: now, action: 'add', scope: candidate.scope, itemId: nextItem.id });
    return nextItem;
  }

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
