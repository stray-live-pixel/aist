# Composer

Нижняя панель ввода prompt и остановки текущей генерации.

## Состав

- `Composer.tsx` — React-компонент, локальное состояние prompt и IPC `ask`/`stop`.
- `Composer.module.scss` — локальные стили панели без Tailwind utility-классов.
- `types.ts` — публичные props и slot-элементы.
- `utils.ts` — autosize textarea, prompt продолжения и определение macOS-like платформы.
- `Composer.stories.tsx` — изолированные Storybook-сценарии.

## Инварианты

- Пустая отправка заменяется на prompt продолжения текущей задачи.
- Shortcut отображается как `⌘↵` на macOS-like платформах и `Ctrl↵` на остальных.
- `ComposerDivider` остаётся приватным helper-компонентом: у него нет собственного состояния, API или stories.
