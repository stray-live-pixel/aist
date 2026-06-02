import { type FrontmatterValue } from '../../../shared/lib/frontmatter';

/**
 * Что это: извлекает положительное целое число из frontmatter, если оно задано.
 * Зачем нужно: некоторые поля autonomous contexts опциональны и не имеют fallback.
 * Какую проблему решает: обязательные числовые поля и опциональные поля не смешивают разные типы fallback.
 */
export function asOptionalPositiveInteger(value: FrontmatterValue | undefined): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}
