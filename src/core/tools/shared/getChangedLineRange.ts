/**
 * Считает диапазон строк, который реально изменился между старым и новым текстом.
 *
 * Инструменты редактирования показывают этот диапазон пользователю и интерфейсу,
 * чтобы было понятно, где именно произошла запись. Если текст не изменился,
 * возвращаем пустой объект и сохраняем прежний контракт инструментов.
 */
export function getChangedLineRange({
  beforeContent,
  afterContent
}: {
  beforeContent: string;
  afterContent: string;
}): Record<string, number> {
  if (beforeContent === afterContent) {
    return {};
  }

  const beforeLines = beforeContent.split(/\r?\n/);
  const afterLines = afterContent.split(/\r?\n/);

  // Идём сверху вниз до первой отличающейся строки.
  let start = 0;
  while (start < beforeLines.length && start < afterLines.length && beforeLines[start] === afterLines[start]) {
    start += 1;
  }

  // Идём снизу вверх, чтобы не считать неизменившийся хвост файла частью изменения.
  let beforeEnd = beforeLines.length - 1;
  let afterEnd = afterLines.length - 1;
  while (beforeEnd >= start && afterEnd >= start && beforeLines[beforeEnd] === afterLines[afterEnd]) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }

  const changedStartLine = start + 1;
  const changedEndLine = Math.max(changedStartLine, afterEnd + 1);

  return {
    changedStartLine,
    changedStartColumn: 1,
    changedEndLine,
    changedEndColumn: afterLines[changedEndLine - 1]?.length + 1 || 1
  };
}
