import type { AgentAttachment } from '../../../types';

/**
 * Что это: snapshot отправленного composer для exit-анимации.
 * Зачем нужно: React должен показать старый prompt отдельным слоем, пока новый composer очищен.
 * Какую продуктовую проблему решает: отправка сообщения выглядит плавно и не теряет текст пользователя во время анимации.
 */
export type SentComposerSnapshot = {
  id: number;
  prompt: string;
  attachments: AgentAttachment[];
};
