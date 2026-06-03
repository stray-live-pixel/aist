import { Agent, type Dispatcher } from 'undici';

/**
 * Что это: единый лимит ожидания ответа модели на уровне HTTP transport.
 * Зачем нужно: провайдер может долго держать запрос без первых токенов, пока модель рассуждает.
 * Какую продуктовую проблему решает: AIST не обрывает полезный model request из-за стандартного короткого timeout сети.
 */
export const MODEL_REQUEST_TIMEOUT_MS = 24 * 60 * 60 * 1000;

const modelRequestDispatcher = new Agent({
  headersTimeout: MODEL_REQUEST_TIMEOUT_MS,
  bodyTimeout: MODEL_REQUEST_TIMEOUT_MS
});

type RequestInitWithDispatcher = RequestInit & {
  dispatcher?: Dispatcher;
};

/**
 * Что это: добавляет к fetch-настройкам undici dispatcher с длинным timeout.
 * Зачем нужно: Node fetch по умолчанию может завершить ожидание headers/body раньше, чем модель ответит.
 * Какую продуктовую проблему решает: долгие рассуждения модели не выглядят для пользователя как случайный обрыв запроса.
 */
export function withModelRequestTimeout({ init }: { init: RequestInit }): RequestInit {
  return {
    ...init,
    dispatcher: modelRequestDispatcher
  } as RequestInitWithDispatcher;
}
