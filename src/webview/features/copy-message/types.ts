/**
 * Что это: props кнопки копирования markdown-сообщения.
 * Зачем нужно: кнопка не знает о карточке сообщения, получает только готовый markdown и сама отправляет IPC copyMessage.
 */
export type CopyMessageButtonProps = {
  /** Markdown-текст для копирования; пустое значение отключает кнопку. */
  markdown: string;
};
