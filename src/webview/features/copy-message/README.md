# CopyMessageButton

Кнопка копирования markdown-содержимого сообщения.

## Состав

- `CopyMessageButton.tsx` — React-компонент и IPC `copyMessage`.
- `CopyMessageButton.module.scss` — локальная module-точка расширения; внешний вид сейчас делегирован shared `IconButton`.
- `types.ts` — публичные props компонента.
- `CopyMessageButton.stories.tsx` — изолированные Storybook-сценарии.

## Инварианты

- Пустой markdown отключает кнопку.
- Компонент не использует Clipboard API напрямую: копирование выполняет extension, чтобы поведение было одинаковым внутри VS Code webview.
