/**
 * Добавляет новый кусок stdout/stderr и ограничивает итоговую длину.
 *
 * Для пользователя это защита от бесконечного или слишком шумного скрипта:
 * инструмент сохраняет начало вывода и явно отмечает, что поток был усечён.
 */
export function appendOutput({ current, chunk, maxChars }: { current: string; chunk: string; maxChars: number }): {
  text: string;
  truncated: boolean;
} {
  const next = current + chunk;
  if (next.length <= maxChars) {
    return { text: next, truncated: false };
  }

  return {
    text: next.slice(0, maxChars),
    truncated: true
  };
}
