import type { ModelClient } from '../../../entities/model/modelTransport';
import type { AutonomousEngineDescriptor, AutonomousEngineId } from '../types';
import { createCodexApiEngine, createOpenRouterApiEngine } from './apiEngines';
import { createClaudeCliEngine } from './claudeCliEngine';
import { createCodexCliEngine } from './codexCliEngine';
import { createDryRunEngine } from './dryRunEngine';
import type { AutonomousEngine, AutonomousEngineRegistry } from './types';

export type AutonomousEngineRegistryDeps = {
  openRouterClient?: ModelClient;
  codexClient?: ModelClient;
};

const API_PLACEHOLDERS: AutonomousEngineDescriptor[] = [
  { id: 'openrouter-api', label: 'OpenRouter API', capabilities: { resume: false, fork: false, tools: false } },
  {
    id: 'codex-api',
    label: 'ChatGPT Codex API',
    capabilities: { resume: false, fork: false, tools: false, requiresAuth: true }
  }
];

/**
 * Реестр engines отделяет выбор execution backend от orchestrator. CLI engines
 * запускают внешние binaries напрямую, API engines переиспользуют существующие
 * clients, а dry-run остаётся безопасным default для проверки flow/run.
 */
export function createAutonomousEngineRegistry(deps: AutonomousEngineRegistryDeps = {}): AutonomousEngineRegistry {
  const engines = new Map<AutonomousEngineId, AutonomousEngine>();
  for (const engine of [createDryRunEngine(), createClaudeCliEngine(), createCodexCliEngine()]) {
    engines.set(engine.id, engine);
  }

  if (deps.openRouterClient) {
    const engine = createOpenRouterApiEngine(deps.openRouterClient);
    engines.set(engine.id, engine);
  }
  if (deps.codexClient) {
    const engine = createCodexApiEngine(deps.codexClient);
    engines.set(engine.id, engine);
  }

  for (const descriptor of API_PLACEHOLDERS) {
    if (!engines.has(descriptor.id)) {
      engines.set(descriptor.id, createUnsupportedEngine(descriptor));
    }
  }

  return {
    list() {
      return [...engines.values()].map(({ id, label, capabilities }) => ({ id, label, capabilities }));
    },
    get(engineId) {
      const engine = engines.get(engineId);
      if (!engine) {
        throw new Error(`Unknown autonomous engine: ${engineId}`);
      }
      return engine;
    }
  };
}

function createUnsupportedEngine(descriptor: AutonomousEngineDescriptor): AutonomousEngine {
  return {
    ...descriptor,
    async run() {
      throw new Error(`${descriptor.label} client is not available in this context.`);
    }
  };
}
