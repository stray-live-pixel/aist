/**
 * Что это: параметры кнопки запуска анализа памяти.
 * Зачем нужно: кнопка знает только chatId и не хранит бизнес-логику анализа внутри UI.
 */
export type AnalyzeMemoryButtonProps = {
  chatId: string;
  disabled?: boolean;
};
