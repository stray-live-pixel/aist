# 005 — Editor context mode

## Priority

P0/P1 — высокий profit, средняя сложность.

## Цель

Снизить случайное загрязнение prompt активным редактором и дать пользователю контроль над автоматическим context injection.

## Scope

- Добавить setting `openrouterAgent.editorContextMode`: `auto | selection | file | off`.
- Реализовать режимы в `getEditorContext()` или новом context module.
- `selection`: отправляет только выделение и file metadata.
- `file`: сохраняет текущее поведение.
- `off`: не отправляет active editor context.
- `auto`: MVP может вести себя как `selection`, а полный файл добавлять только при явном selection-empty + коротком файле или при follow-up эвристике.
- Добавить state/UI отображение текущего режима в settings.
- Добавить tests на режимы.

## Out of scope

- Полный ContextGovernor.
- Repo map cache.

## Acceptance criteria

- Пользователь может отключить automatic editor context.
- Selection продолжает работать предсказуемо.
- Existing behavior доступен через `file`.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для context builder
- ручная проверка chat ask с разными режимами
