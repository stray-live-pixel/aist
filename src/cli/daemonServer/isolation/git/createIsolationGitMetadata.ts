import type { AuxiliaryModelInvoker } from '../../../../core/entities/model/auxiliaryModel';
import type { ReasoningEffort } from '../../../../core/shared/types/types';
import {
  buildMetadataSystemPrompt,
  buildMetadataUserPrompt,
  createFallbackGitMetadata,
  type IsolationGitMetadata
} from './metadata';
import { extractModelText } from './utils/extractModelText';
import { normalizeGitMetadata } from './utils/normalizeGitMetadata';

export type { IsolationGitMetadata };

/**
 * Что это: собирает commit message, PR title и PR body для isolated branch.
 * Зачем нужно: финализатор должен использовать смысл изменений, а не обрезанный пользовательский prompt.
 * Какую продуктовую проблему решает: reviewer получает понятный PR даже если исходная задача была длинной или разговорной.
 */
export async function createIsolationGitMetadata({
  auxiliaryModel,
  model,
  reasoningEffort,
  prompt,
  fallbackAnswer,
  diffSummary,
  statusSummary,
  sessionId
}: {
  auxiliaryModel?: AuxiliaryModelInvoker;
  model?: string;
  reasoningEffort?: ReasoningEffort;
  prompt: string;
  fallbackAnswer?: string;
  diffSummary: string;
  statusSummary: string;
  sessionId: string;
}): Promise<IsolationGitMetadata> {
  const fallback = createFallbackGitMetadata({ prompt, fallbackAnswer, statusSummary, sessionId });
  if (!auxiliaryModel || !diffSummary.trim()) {
    return fallback;
  }

  try {
    const response = await auxiliaryModel.invoke({
      model,
      reasoningEffort,
      messages: [
        { role: 'system', content: buildMetadataSystemPrompt() },
        {
          role: 'user',
          content: buildMetadataUserPrompt({ prompt, fallbackAnswer, diffSummary, statusSummary, sessionId })
        }
      ]
    });
    return normalizeGitMetadata({ rawText: extractModelText({ message: response }), fallback });
  } catch {
    return fallback;
  }
}
