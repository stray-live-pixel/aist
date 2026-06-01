import type {
  AgentReflectionCandidate,
  Chat,
  ChatContextEstimate,
  ChatModelRequestStatus,
  ChatPlan
} from '../../../shared/types/types';

/**
 * Что это: persisted runtime-состояние чата в state.json.
 * Зачем нужно: статус агента, план и context estimate переживают refresh webview.
 * Какую продуктовую проблему решает: пользователь не теряет видимый прогресс выполнения при переподключении.
 */
export type StoredChatState = {
  schemaVersion: number;
  busy: boolean;
  activity?: Chat['activity'];
  activityDetail?: string;
  modelRequest?: ChatModelRequestStatus;
  context?: ChatContextEstimate;
  contextLength?: number;
  activePlan?: ChatPlan;
  reflectionCandidates?: AgentReflectionCandidate[];
};
