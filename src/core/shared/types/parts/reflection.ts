export type AgentReflectionCandidateKind =
  | 'memory_preference'
  | 'project_lesson'
  | 'verification_command'
  | 'declarative_definition';

export type AgentReflectionCandidateStatus = 'pending' | 'saved' | 'rejected';

/**
 * Что это: кандидат на сохранение в память, который пользователь должен подтвердить.
 * Зачем нужно: предложения остаются reviewable и могут быть связаны с конкретным запуском субагента.
 */
export type AgentReflectionCandidate = {
  id: string;
  kind: AgentReflectionCandidateKind;
  title: string;
  content: string;
  reason?: string;
  scope?: 'global' | 'project' | 'local';
  status: AgentReflectionCandidateStatus;
  createdAt: number;
  sourceSubagentRunId?: string;
};
