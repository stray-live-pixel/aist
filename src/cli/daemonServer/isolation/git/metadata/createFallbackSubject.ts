import { truncateText } from '../utils/truncateText';

/**
 * Что это: создаёт короткий subject без модели.
 * Зачем нужно: git finalizer должен работать даже при ошибке auxiliary model.
 * Какую продуктовую проблему решает: isolated agent не теряет возможность сделать commit/PR из-за сетевой ошибки модели.
 */
export function createFallbackSubject({
  prompt,
  fallbackAnswer,
  statusSummary
}: {
  prompt: string;
  fallbackAnswer?: string;
  statusSummary: string;
}): string {
  const source = fallbackAnswer?.trim() || statusSummary.trim() || prompt.trim() || 'AIST isolated agent changes';
  const normalized = source.replace(/\s+/g, ' ').replace(/[.。]+$/u, '').trim();
  return truncateText({ value: normalized || 'AIST isolated agent changes', maxLength: 72 });
}
