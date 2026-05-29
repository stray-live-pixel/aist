import { shouldSkipPath } from '../shared/shouldSkipPath';
import { matchesGlob } from './matchesGlob';

/**
 * Проверяет, должен ли grep_search пропустить workspace-relative путь.
 *
 * Сначала применяются стандартные игноры проекта вроде node_modules и .git,
 * затем пользовательские exclude-паттерны из конкретного вызова инструмента.
 */
export function shouldSkipRelativePath({
  relativePath,
  excludePatterns = []
}: {
  relativePath: string;
  excludePatterns?: string[];
}): boolean {
  return (
    relativePath.split('/').some((name) => shouldSkipPath({ name })) ||
    excludePatterns.some((pattern) => matchesGlob({ relativePath, pattern }))
  );
}
