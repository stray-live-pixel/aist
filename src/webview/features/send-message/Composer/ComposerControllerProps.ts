import type { ComposerProps } from '../types';

/**
 * Что это: публичные входные параметры hook-контроллера Composer.
 * Зачем нужно: сценарии отправки, истории и вложений получают один и тот же контракт без дублирования типов.
 * Какую продуктовую проблему решает: UI Composer стабильно связывает chatId, busy-state и callback-и VS Code bridge.
 */
export type ComposerControllerProps = Pick<ComposerProps, 'chatId' | 'busy' | 'onSubmitPrompt' | 'onStopRequested'>;
