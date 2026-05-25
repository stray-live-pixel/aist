# ToolResultPreview

Человекочитаемый preview результата tool-call.

## Состав

- `ToolResultPreview.tsx` — React-компонент с приватными субкомпонентами (CodePreview, EntriesList, SearchFiles, BashScriptResult, OutputBlock, FileLinks, CompactFacts, Reason, ErrorText).
- `ToolResultPreview.module.scss` — локальные стили без Tailwind.
- `types.ts` — публичные props и BashFact.
- `utils.ts` — извлечение bash-фактов, файлов, secondary files.
- `ToolResultPreview.stories.tsx` — Storybook-сценарии.

## Инварианты

- Код длиннее 1200 символов обрезается с «…».
- Списки ограничены 24 элементами с пометкой «more items».
- stderr выделяется красной рамкой через `styles.stderr`.
