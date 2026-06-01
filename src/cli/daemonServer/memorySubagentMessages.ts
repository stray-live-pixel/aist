import type { AgentMemoryScope } from '../../core/entities/memory/memory';
import { validateReflectionCandidates } from '../../core/features/reflection/reflection';

/**
 * Что это: создаёт историю subagent run для анализа памяти.
 * Зачем нужно: subagent repository должен хранить понятный task/tool/final trace.
 * Какую продуктовую проблему решает: пользователь и QA видят, как memory-субагент пришёл к candidates.
 */
export function createMemorySubagentMessages(input: {
  runId: string;
  parentChatId: string;
  startedAt: number;
  finishedAt: number;
  candidateCount: number;
  error?: string;
  responseContent?: string;
}) {
  const taskMessage = {
    id: `${input.runId}-task`,
    role: 'user' as const,
    content: 'Проанализируй текущий чат и предложи 0–3 безопасные заметки для долговременной памяти.',
    createdAt: input.startedAt
  };
  const modelMessage = {
    id: `${input.runId}-model`,
    role: 'tool' as const,
    name: 'memory.analysis',
    status: input.error ? ('error' as const) : ('done' as const),
    reason: 'Субагент получает историю чата и уже сохранённые заметки памяти.',
    nextStep: 'Вернуть JSON-кандидаты, которые пользователь сможет сохранить или отклонить.',
    args: { chatId: input.parentChatId, mode: 'single_model_call', tools: [] },
    result: input.error ? { ok: false, error: input.error } : { ok: true, candidateCount: input.candidateCount },
    modelResult: input.error ? { ok: false, error: input.error } : { ok: true, candidateCount: input.candidateCount },
    createdAt: input.startedAt + 1
  };
  const finalMessage = {
    id: `${input.runId}-${input.error ? 'error' : 'answer'}`,
    role: input.error ? ('error' as const) : ('assistant' as const),
    content: input.error
      ? `Анализ памяти не завершился: ${input.error}`
      : input.responseContent || formatMemorySubagentSuccessText({ candidateCount: input.candidateCount }),
    createdAt: input.finishedAt
  };
  return [taskMessage, modelMessage, finalMessage];
}

/**
 * Что это: текст успешного завершения memory-субагента.
 * Зачем нужно: карточка subagent в чате показывает понятный итог.
 * Какую продуктовую проблему решает: пользователь видит, были ли найдены новые безопасные заметки.
 */
export function formatMemorySubagentSuccessText({ candidateCount }: { candidateCount: number }): string {
  return candidateCount
    ? `Субагент памяти завершил анализ: найдено предложений — ${candidateCount}.`
    : 'Субагент памяти завершил анализ: новых безопасных заметок не найдено.';
}

/**
 * Что это: выбирает файл памяти для подтверждённого предложения.
 * Зачем нужно: global сохраняет только явные пользовательские предпочтения, а проектные правила остаются в workspace памяти.
 * Какую продуктовую проблему решает: память не смешивает личные глобальные предпочтения и правила проекта.
 */
export function getReflectionMemoryScope({
  candidate
}: {
  candidate: NonNullable<ReturnType<typeof validateReflectionCandidates>[number]>;
}): AgentMemoryScope {
  return candidate.kind === 'memory_preference' && candidate.scope === 'global' ? 'global' : 'project';
}

/**
 * Что это: нормализует текст кандидата перед записью в память.
 * Зачем нужно: в памяти хранится понятная заметка, а не технический enum из reflection-системы.
 * Какую продуктовую проблему решает: будущий агент читает память как естественное правило или предпочтение.
 */
export function getReflectionMemoryNote({
  candidate
}: {
  candidate: NonNullable<ReturnType<typeof validateReflectionCandidates>[number]>;
}): string {
  if (candidate.kind === 'verification_command') {
    return `Verification command: ${candidate.content}`;
  }
  if (candidate.kind === 'declarative_definition') {
    return `Possible declarative definition: ${candidate.content}`;
  }
  return candidate.content;
}
