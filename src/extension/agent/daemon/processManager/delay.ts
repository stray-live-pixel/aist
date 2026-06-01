/**
 * Что это: Promise-обёртка над setTimeout.
 * Зачем нужно: ожидание socket daemon читается как async workflow.
 * Какую проблему решает: polling запуска не смешивает callback-код с lifecycle manager.
 */
export function delay({ ms }: { ms: number }): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
