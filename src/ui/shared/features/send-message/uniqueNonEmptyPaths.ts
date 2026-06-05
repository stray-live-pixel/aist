/**
 * Что это: убирает пустые значения и дубли, сохраняя порядок пользователя.
 * Зачем нужно: один и тот же файл может прийти сразу из FileList и uri-list, но вставлять его дважды нельзя.
 */
export function uniqueNonEmptyPaths({ paths }: { paths: string[] }): string[] {
  const seen = new Set<string>();

  return paths.filter((path) => {
    const normalizedPath = path.trim();

    if (!normalizedPath || seen.has(normalizedPath)) {
      return false;
    }

    seen.add(normalizedPath);
    return true;
  });
}
