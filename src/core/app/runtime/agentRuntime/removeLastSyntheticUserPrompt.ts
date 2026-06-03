import type { OpenRouterMessage } from '../../../shared/types/types';

/**
 * Что это: удаляет последний synthetic user prompt из истории модели.
 * Зачем нужно: служебные ask-сценарии могут использовать prompt как инструкцию без записи в chat history.
 * Какую продуктовую проблему решает: пользовательская история не загрязняется внутренними запросами агента.
 */
export function removeLastSyntheticUserPrompt({
  messages,
  prompt
}: {
  messages: OpenRouterMessage[];
  prompt: string;
}): OpenRouterMessage[] {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role === 'user' && getMessageTextContent({ message }) === prompt) {
      return [...messages.slice(0, index), ...messages.slice(index + 1)];
    }
  }

  return messages;
}

/** Извлекает текст user prompt из обычного или multipart content. */
function getMessageTextContent({ message }: { message: OpenRouterMessage }): string | undefined {
  if (typeof message.content === 'string') {
    return message.content;
  }

  return message.content?.find((part) => part.type === 'text')?.text;
}
