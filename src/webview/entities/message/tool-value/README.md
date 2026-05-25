# toolValue

Безопасные reader-функции для JSON результатов инструментов.

## Состав

- `toolValue.ts` — функции `getToolResult`, `getToolPreview`, `asRecord`, `asString`, `arrayValue`.
- `toolValue.test.ts` — unit-тесты.

## Инварианты

- `getToolResult` возвращает `undefined` для preview-only обёрток.
- `asString` возвращает `undefined` для пустых и whitespace-only строк.
- `asRecord` отклоняет массивы и примитивы.
