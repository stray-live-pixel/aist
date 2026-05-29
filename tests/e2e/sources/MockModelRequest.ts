/**
 * Что это: запись запроса, который daemon отправил в локальный OpenRouter mock.
 * Зачем нужно: e2e проверяет реальную интеграцию расширения и daemon, но без внешних ИИ-запросов.
 */
export type MockModelRequest = {
  method: string;
  url: string;
  body: Record<string, unknown>;
};
