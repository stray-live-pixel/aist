/**
 * Что это: ошибка остановки tool-call после пользовательского deny.
 * Зачем нужно: handleToolCall отличает осознанный отказ от runtime failure.
 * Какую продуктовую проблему решает: deny не отображается как техническая поломка tool execution.
 */
export class ToolCallDeniedError extends Error {
  constructor() {
    super('The user denied this tool call.');
  }
}
