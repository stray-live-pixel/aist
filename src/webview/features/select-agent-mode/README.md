# AgentModeSelect

Dropdown выбора режима агента и удаления пользовательских режимов с явным подтверждением.

## Состав

- `AgentModeSelect.tsx` — React-компонент и локальное состояние раскрытия/подтверждения.
- `AgentModeSelect.module.scss` — локальные стили без Tailwind utility-классов.
- `types.ts` — публичные props компонента.
- `utils.ts` — инвариант неудаляемых встроенных режимов.
- `AgentModeSelect.stories.tsx` — изолированные Storybook-сценарии.

## Инварианты

- Встроенные режимы `default` и `careful` нельзя удалить.
- Выбор и удаление отправляются в extension через IPC, callback props намеренно не вводятся.
- `className` допускается только для внешнего layout/sizing, внутренний вид задаётся CSS module.
