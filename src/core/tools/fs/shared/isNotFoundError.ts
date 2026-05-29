/**
 * Определяет, что ошибка Node.js означает отсутствие файла или папки.
 *
 * Это нужно инструментам, которые различают безопасно отсутствующий путь и
 * реальные системные ошибки доступа, прав или диска.
 */
export function isNotFoundError({ error }: { error: unknown }): boolean {
  return (
    error !== null && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 'ENOENT'
  );
}
