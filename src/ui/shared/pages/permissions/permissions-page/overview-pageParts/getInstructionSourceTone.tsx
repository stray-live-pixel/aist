import type { AgentInstructionSource } from '../../../../types';
import type { BadgeTone } from '../../../../ui';

/**
 * Что это: задаёт мягкий визуальный акцент типу источника инструкций.
 * Зачем нужно: разные источники легче сканировать глазами без перегруза цветами.
 * Какую продуктовую проблему решает: пользователь быстро отличает роль, проектные правила и навыки.
 */
export function getInstructionSourceTone({ source }: { source: AgentInstructionSource }): BadgeTone {
  if (source.kind === 'mode') return 'accent';
  if (source.kind === 'file' || source.kind === 'declarative') return 'success';
  if (source.kind === 'skills') return 'warning';

  return 'neutral';
}
