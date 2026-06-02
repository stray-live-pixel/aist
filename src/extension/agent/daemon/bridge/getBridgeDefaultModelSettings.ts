import type { ChatModelSettings } from '../../../../core/shared/types/types';
import { getDefaultModelSettings } from '../../config/settingsSnapshot';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';

/**
 * Что это: собирает default model settings для daemon chat.create.
 * Зачем нужно: settingsSnapshot может вернуть пустую модель, а bridge знает fallback из extension bootstrap.
 * Какую продуктовую проблему решает: новый чат всегда стартует с валидной моделью.
 */
export function getBridgeDefaultModelSettings({ context }: { context: BridgeRuntimeContext }): ChatModelSettings {
  const settings = getDefaultModelSettings();
  return { ...settings, model: settings.model || context.defaultModel };
}
