# messageFormatting

Formatter-функции для заголовков сообщений: дата, usage, статус tool-call.

## Состав

- `messageFormatting.tsx` — React-форматтеры (`formatMessageDate`, `formatMessageUsage`, `formatMessageUsagePill`, `formatToolStatusLocalized`, `getToolStatusClass`).
- `MessageFormatting.module.scss` — стили для dateLabel, usageInline, usagePill.
- `utils.ts` — чистые функции (`formatTokens`, `formatCost`, `getUsageLabel`, `padTimePart`).
- `types.ts` — вспомогательные типы.

## Инварианты

- `formatMessageDate` возвращает `null` для отсутствующего timestamp.
- `getToolStatusClass` возвращает `'error'` или `'neutral'` — CSS-модульные классы, не глобальные строки.
