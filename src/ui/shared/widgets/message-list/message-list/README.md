# MessageList

Композиционный виджет истории сообщений чата. Отвечает за прокрутку, sticky-кнопку инструкций, группировку tool-call сообщений и отображение статуса активности.

## Состав

- `MessageList.tsx` — React-компонент и локальная секция предыдущего чата.
- `MessageList.module.scss` — локальные стили без Tailwind.
- `types.ts` — публичные props и типы группировки.
- `utils.ts` — группировка сообщений и scroll helpers.
- `MessageList.stories.tsx` — Storybook-сценарии.
