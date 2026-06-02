/**
 * Что это: приводит unknown error к строке для daemon result/log.
 * Зачем нужно: catch-блоки получают ошибки от файлов, модели, tools и JSON-RPC клиентов.
 * Какую продуктовую проблему решает: пользователь видит понятную ошибку вместо [object Object].
 */
export function formatError({ error }: { error: unknown }): string {
  return error instanceof Error ? error.message : String(error);
}
