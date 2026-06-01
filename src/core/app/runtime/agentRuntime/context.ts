import type { ActiveRun, AgentRuntimeServiceDeps, AgentRuntimeText } from './types';

/**
 * Что это: внутреннее состояние AgentRuntimeService, доступное вынесенным action-функциям.
 * Зачем нужно: крупные сценарии runtime можно декомпозировать без наследования и hidden globals.
 * Какую продуктовую проблему решает: запуск агента остаётся одним согласованным процессом, но код читается по этапам.
 */
export type AgentRuntimeContext = {
  deps: AgentRuntimeServiceDeps;
  activeRunsByChat: Map<string, ActiveRun>;
  activeRunsById: Map<string, ActiveRun>;
  now: () => number;
  idFactory: () => string;
  text: AgentRuntimeText;
};
