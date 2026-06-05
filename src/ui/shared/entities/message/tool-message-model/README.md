# toolMessageModel

Нормализатор tool-сообщения в компактную модель для UI.

## Состав

- `toolMessageModel.ts` — функция `buildToolDisplayModel`.
- `types.ts` — типы `ToolDisplayModel`, `FileReference`, `ToolTone`.
- `toolMessageModel.test.ts` — unit-тесты.

## Инварианты

- `buildToolDisplayModel` всегда возвращает валидную модель, даже для неизвестных инструментов.
- `primaryFile` извлекается из `args.path` или `result.path`, с приоритетом у args.
- `uniqueFiles` дедуплицирует по комбинации path:line:column:endLine:endColumn.
