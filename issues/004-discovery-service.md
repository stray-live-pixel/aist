# 004 — TypeScript frontmatter parser и discovery flows/runs

## Цель

Реализовать discovery flow/run definitions на TypeScript без Python. Discovery должен читать legacy `prompt/` как migration source и native `.aist-agent/autonomous/` как целевой source.

## Где реализовать

```text
src/extension/autonomous/frontmatter.ts
src/extension/autonomous/discovery.ts
src/extension/autonomous/discovery.test.ts
```

## Источники

Legacy:

```text
prompt/flows/<flow>/.index.md
prompt/runs/<run>/.index.md
```

Native:

```text
.aist-agent/autonomous/flows/<flow>/.index.md
.aist-agent/autonomous/runs/<run>/.index.md
```

## Frontmatter parser

Перенести behavior из `prompt/src/shared/frontmatter.py` в TS:

- split `---` frontmatter;
- scalar `key: value`;
- strings in quotes;
- `true/false/null`;
- integers;
- multiline `|`;
- list of strings;
- list of objects;
- nested multiline fields inside object list.

Не добавлять YAML dependency без причины: формат узкий и контролируемый.

## Discovery behavior

1. Найти workspace root.
2. Найти native roots и legacy roots.
3. Считать flows:
   - id;
   - title/description;
   - model/codex_model;
   - stages order;
   - stage titles;
   - contexts;
   - diagnostics.
4. Считать runs:
   - title;
   - workDir;
   - repeat;
   - tasks;
   - task bodies;
   - pending/done counters;
   - diagnostics.
5. Merge strategy:
   - native `.aist-agent` имеет приоритет над legacy `prompt` при одинаковом id;
   - UI показывает duplicate warning.

## Diagnostics

- `source.notFound`;
- `frontmatter.invalid`;
- `flow.indexMissing`;
- `flow.stageMissing`;
- `flow.legacyField`;
- `run.indexMissing`;
- `run.dirMissing`;
- `run.taskMissing`;
- `run.flowMissing`;
- `run.pathEscapesRoot`.

## Import helper

Добавить backend API:

```ts
importLegacyPromptDefinitions(): Promise<ImportResult>
```

Он копирует definitions из `prompt/flows` и `prompt/runs` в `.aist-agent/autonomous`, но не копирует Python/shell runtime. На первом этапе может быть отдельной командой или UI action `Import from prompt/`.

## Нельзя делать

- Не запускать `python3`.
- Не запускать `agent-auto.sh`.
- Не читать `.agent-auto-logs` в discovery.
- Не удалять `prompt/` автоматически.

## Тесты

Fixtures должны покрыть реальные examples:

- `example`;
- `create-edit-section`;
- `image-to-html-css`;
- `mini-gta-3d`;
- `benefits-list-analysis`.

Отдельно:

- invalid frontmatter;
- missing stage;
- path traversal task;
- duplicate id native/legacy.

## Критерии готовности

- Discovery работает на текущей папке `prompt/` без Python.
- Native `.aist-agent/autonomous` читается тем же кодом.
- Можно импортировать legacy definitions в native layout.
- `npm run test` покрывает parser/discovery.
