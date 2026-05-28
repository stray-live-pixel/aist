import {
  AgentMemoryStore as CoreAgentMemoryStore,
  MemoryRetriever as CoreMemoryRetriever,
  createMemoryStorePaths,
  formatMemoryPromptBlock,
  sanitizeMemoryNote
} from '../../../core/entities/memory/memory';
import type {
  AgentMemoryCandidate,
  AgentMemoryItem,
  AgentMemoryScope,
  AgentMemoryStorePaths
} from '../../../core/entities/memory/memory';
import { getWorkspaceFolder } from '../../shared/workspace';

export type { AgentMemoryCandidate, AgentMemoryItem, AgentMemoryScope, AgentMemoryStorePaths };
export { createMemoryStorePaths, formatMemoryPromptBlock, sanitizeMemoryNote };

export class AgentMemoryStore extends CoreAgentMemoryStore {
  constructor(paths: AgentMemoryStorePaths = getDefaultMemoryPaths()) {
    super(paths);
  }
}

export class MemoryRetriever extends CoreMemoryRetriever {
  constructor(store: AgentMemoryStore = new AgentMemoryStore()) {
    super(store);
  }
}

export function getAgentMemoryItems(): AgentMemoryItem[] {
  return new AgentMemoryStore().list();
}

export async function addAgentMemory(candidate: AgentMemoryCandidate): Promise<AgentMemoryItem | undefined> {
  return new AgentMemoryStore().add(candidate);
}

export async function deleteAgentMemory(scope: AgentMemoryScope, id: string): Promise<boolean> {
  return new AgentMemoryStore().delete(scope, id);
}

export async function setAgentMemoryEnabled(scope: AgentMemoryScope, id: string, enabled: boolean): Promise<boolean> {
  return new AgentMemoryStore().setEnabled(scope, id, enabled);
}

export function getRelevantMemoryPromptBlock(prompt: string): string {
  return new MemoryRetriever().formatPromptBlock(prompt);
}

function getDefaultMemoryPaths(): AgentMemoryStorePaths {
  return createMemoryStorePaths({ workspaceRoot: getWorkspaceFolder().uri.fsPath });
}
