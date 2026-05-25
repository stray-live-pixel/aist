import { type ReactNode, createContext, useContext } from 'react';

import type { AgentState, Chat } from '../types';

const AgentStateContext = createContext<AgentState | null>(null);

/**
 * Что это: read-only provider последнего снапшота AgentState из extension.
 * Зачем нужно: source of truth остаётся в extension, а webview получает удобный доступ к данным без прокидывания
 * большого AgentState через каждый промежуточный компонент.
 */
export function AgentStateProvider({ state, children }: { state: AgentState; children: ReactNode }) {
  return <AgentStateContext.Provider value={state}>{children}</AgentStateContext.Provider>;
}

/**
 * Что это: безопасный доступ к AgentState из React-дерева.
 * Зачем нужно: хук явно падает вне provider, чтобы stories/страницы сразу показывали ошибку интеграции,
 * а не рендерили частично пустой UI.
 */
export function useAgentState(): AgentState {
  const state = useContext(AgentStateContext);

  if (!state) {
    throw new Error('useAgentState must be used inside AgentStateProvider');
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
