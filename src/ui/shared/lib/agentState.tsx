import { type ReactNode, useEffect, useState } from 'react';

import { useAgentStore } from '../store/agentStore';
import type { AgentState, Chat } from '../types';

/**
 * Что это: совместимый provider, который засевает общий store снапшотом AgentState.
 * Зачем нужно: Storybook, screenshot-харнесс и страницы могут отрендериться с фиксированным
 * состоянием без реального хоста. В рантайме store наполняет App через ingest(), поэтому provider
 * здесь — это удобная точка для статичных снапшотов.
 */
export function AgentStateProvider({ state, children }: { state: AgentState; children: ReactNode }) {
  // Засеваем синхронно один раз до рендера детей, чтобы их useAgentState() не падал до эффекта.
  useState(() => {
    useAgentStore.setState({ state });
    return null;
  });

  useEffect(() => {
    useAgentStore.setState({ state });
  }, [state]);

  return <>{children}</>;
}

/**
 * Что это: безопасный доступ к AgentState из React-дерева.
 * Зачем нужно: хук явно падает, если состояние ещё не загружено, чтобы stories/страницы сразу
 * показывали ошибку интеграции, а не рендерили частично пустой UI.
 */
export function useAgentState(): AgentState {
  const state = useAgentStore((store) => store.state);

  if (!state) {
    throw new Error('useAgentState must be used after AgentState is loaded');
  }

  return state;
}

/**
 * Что это: короткий selector активного чата.
 * Зачем нужно: это самый частый срез AgentState, и отдельный хук делает намерение компонента явным.
 */
export function useActiveChat(): Chat {
  return useAgentState().activeChat;
}
