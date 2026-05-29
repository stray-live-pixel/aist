import type { AgentInstructionSource } from '../../systemPrompt';
import type { FilePromptConfig } from '../types';

/**
 * Что это: превращает активную роль агента в секцию system prompt.
 * Зачем нужно: выбранный mode задаёт основной стиль поведения и должен реально отправляться модели.
 */
export function getActiveModeSource(params: { config: FilePromptConfig }): AgentInstructionSource | undefined {
  const ref = params.config.activeModeRef;
  if (!ref) return undefined;

  const mode = [...params.config.globalModes, ...params.config.localModes].find(
    (item) => item.scope === ref.scope && item.id === ref.id
  );
  if (!mode) return undefined;

  return {
    id: `${mode.scope}:mode:${mode.id}`,
    title: `${mode.scope === 'global' ? 'Global' : 'Project'} mode: ${mode.label}`,
    content: mode.instructions,
    priority: mode.scope === 'global' ? 100 : 120,
    kind: 'mode',
    source: `${mode.scope}:mode:${mode.id}`
  };
}
