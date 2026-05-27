# 006 — `grep_search` output controls

## Priority

P1 — высокий/средний profit, средняя сложность.

## Цель

Сделать поиск экономнее по токенам и точнее для широких queries.

## Scope

- Добавить параметры `filesOnly`, `countOnly`, `beforeLines`, `afterLines`, `exclude`.
- Сохранить backward compatibility с `contextLines`.
- `filesOnly` возвращает только paths с совпадениями.
- `countOnly` возвращает paths + counts без строк.
- `exclude` дополняет стандартный ignore set.
- Обновить schema description и tests.

## Out of scope

- Индексация repo.
- Fuzzy search.

## Acceptance criteria

- Старые вызовы `grep_search` работают без изменений.
- Новые режимы уменьшают размер результата для широких поисков.
- Ошибки regex остаются понятными.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для grep_search
