import type { OpenRouterMock } from './OpenRouterMock';

/**
 * Что это: останавливает локальный OpenRouter mock server.
 * Зачем нужно: каждый e2e worker должен освобождать порт после завершения тестов.
 */
export async function stopOpenRouterMock({ mock }: { mock: OpenRouterMock }): Promise<void> {
  await new Promise<void>((resolve) => {
    mock.server.close(() => resolve());
  });
}
