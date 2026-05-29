/**
 * Стандартные имена папок и файлов, которые fs-инструменты не показывают агенту.
 *
 * Это защищает пользователя от лишнего шума в ответах: зависимости, git-данные,
 * сборочные артефакты и служебные папки AIST не попадают в обходы директорий.
 */
const STANDARD_IGNORED_NAMES = new Set(['.git', 'node_modules', 'dist', 'out', '.vscode-test']);

/**
 * Проверяет, нужно ли пропустить имя файла или папки при обходе workspace.
 *
 * Правило единое для list_files и поиска: так агент видит одинаковую картину
 * проекта во всех fs-инструментах и не получает противоречивые результаты.
 */
export function shouldSkipPath({ name }: { name: string }): boolean {
  return name.startsWith('.aist-') || STANDARD_IGNORED_NAMES.has(name);
}
