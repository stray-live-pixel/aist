# 017 — Declarative shell tools from `.aist-agent/tools`

## Priority

P3 — высокий strategic profit, очень высокая сложность.

## Цель

Разрешить проекту объявлять дополнительные tools через Markdown definitions + shell scripts в `.aist-agent/tools`.

## Scope

- Добавить parser `.aist-agent/tools/*.md` с frontmatter: id, label, description, permission, script, input_schema, output_mode.
- Добавить `AgentToolRegistry`, объединяющий built-in tools, skills и declarative tools.
- Валидировать schema и обязательный `reason`.
- Запускать scripts с JSON input через stdin, cwd workspace root, approval default `ask`.
- Ограничить script paths и запретить path traversal.
- Добавить digest/version для definitions и hot reload перед следующим model request.
- Добавить UI enable/disable для project tools.
- Добавить tests на parser, registry, execution, security constraints.

## Out of scope

- Global declarative tools.
- Cloud sync definitions.
- Auto-generation of tools by reflection.

## Acceptance criteria

- Новый `.aist-agent/tools/*.md` появляется в tools следующего model request.
- Tool script выполняется только после approval.
- Broken tool definition не ломает built-in tools и показывается как diagnostic.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для registry/parser/executor
- ручная проверка project tool
