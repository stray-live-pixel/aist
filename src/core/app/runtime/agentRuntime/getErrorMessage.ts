/**
 * Что это: приводит unknown error к строке для пользовательского статуса или tool-result.
 * Зачем нужно: runtime часто ловит ошибки из разных adapters и должен показывать их единообразно.
 * Какую продуктовую проблему решает: пользователь видит понятный текст вместо [object Object] или пустого результата.
 */
export function getErrorMessage({ error }: { error: unknown }): string {
  return error instanceof Error ? error.message : String(error);
}
