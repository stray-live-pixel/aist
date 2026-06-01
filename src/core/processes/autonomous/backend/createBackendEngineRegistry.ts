import { createAutonomousEngineRegistry } from '../engines/registry';
import type { AutonomousEngineRegistry } from '../engines/types';
import type { AutonomousBackendContext } from './AutonomousBackendContext';
import { createCodexEngineClient } from './createCodexEngineClient';
import { createOpenRouterEngineClient } from './createOpenRouterEngineClient';

/**
 * Что это: собирает registry автономных model engines для текущего backend context.
 * Зачем нужно: injected modelClient должен переиспользоваться для обоих API engines в тестах и CLI overrides.
 * Какую продуктовую проблему решает: flow/run запускаются одинаково независимо от выбранного engine типа.
 */
export function createBackendEngineRegistry({
  context
}: {
  context: AutonomousBackendContext;
}): AutonomousEngineRegistry {
  const injected = context.modelClient;
  return createAutonomousEngineRegistry({
    openRouterClient: injected || createOpenRouterEngineClient({ context }),
    codexClient: injected || createCodexEngineClient({ context })
  });
}
