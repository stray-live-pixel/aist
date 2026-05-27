# AIST agent prompt and tool optimization proposals

Документ фиксирует предложения по снижению token overhead, повышению надёжности tool-use и улучшению управляемости агента на основе текущей реализации `src/extension/agent/**`, `src/extension/tools/**`, `src/extension/openrouter/**` и `src/extension/codex/**`.

## Executive summary

Текущая архитектура уже удачно разделяет system prompt, пользовательские инструкции, tools, approvals и runtime loop. Главный потенциал оптимизации сейчас не в переписывании всего агента, а в трёх местах:

1. **Сжать и структурировать базовый system prompt**: убрать повторяющиеся правила, сделать явные фазы работы и tool-use policy, оставить расширяемые инструкции отдельными блоками.
2. **Сделать инструменты более семантическими и экономными**: объединить похожие операции, добавить read ranges, patch-style edit и typed diagnostics, чтобы модель реже читала/переписывала большие файлы.
3. **Улучшить контекстную экономику runtime**: отправлять active editor context только когда он релевантен, хранить краткие tool-result summaries и использовать compaction, учитывающую последние сообщения.

## Что уже хорошо

- **Prompt собирается динамически**: `buildAgentSystemPrompt()` не сохраняет system prompt в истории, поэтому смена языка, modes, skills и инструкций применяется к следующим запросам.
- **Tool permissions вынесены отдельно**: read/search по умолчанию безопасны, мутации и shell требуют approval.
- **Planning tools уже есть**: модель получает явный механизм планирования вместо длинных рассуждений в обычном ответе.
- **Diff preview для edits**: `write_file` и `replace_in_file` показывают editable diff до approval, что снижает риск неконтролируемых изменений.
- **Runtime устойчив к повторам**: `findRepeatedToolCall()` останавливает циклы одинаковых tool calls.
- **Есть Codex/OpenRouter abstraction**: можно оптимизировать prompt/tool contract единообразно для двух transport-ов.

## Основные проблемы и риски

### 1. Базовый prompt слишком длинный и частично дублирует tool schemas

`getSystemPrompt()` перечисляет много правил про tool usage, plan tools, run_bash_script и финальные ответы. Часть этих требований уже продублирована в tool descriptions и developer-level инструкциях. Это увеличивает стоимость каждого запроса и размывает приоритеты.

**Риск:** модель хуже запоминает самые важные инварианты: workspace-relative paths, русские `reason`, approval-safe edits, не повторять одинаковые tool calls.

### 2. Prompt не задаёт компактный алгоритм работы

Сейчас правила идут списком, но не формируют короткую процедуру: inspect → plan → edit → verify → final. Модель может либо слишком рано редактировать, либо слишком много читать и планировать.

**Риск:** больше лишних tool calls и токенов на простых задачах.

### 3. `getEditorContext()` всегда добавляет активный файл к каждому ask

Если открыт большой или нерелевантный файл, runtime добавляет его к prompt до `maxContextChars`. Это полезно для inline-задач, но дорого и иногда загрязняет контекст.

**Риск:** модель фокусируется на случайном active editor вместо запроса пользователя; растёт prompt token usage.

### 4. File tools провоцируют чтение больших файлов целиком

`read_file` поддерживает только `maxChars`, но не range/offset. `grep_search` возвращает строки и небольшой context, однако следующий шаг часто — читать весь файл.

**Риск:** дорогое чтение и последующие большие replacements.

### 5. `replace_in_file` требует exact search и часто ломается на больших/слегка изменённых фрагментах

Exact replace хорош для безопасности, но модель вынуждена вставлять большие блоки текста в `search` и `replace`.

**Риск:** большие tool args, ошибки из-за whitespace, сложный review.

### 6. Tool result history может раздуваться

Filesystem tools возвращают содержимое файлов, grep matches, stdout/stderr и JSON previews. Всё это затем попадает в model context через history.

**Риск:** последующие запросы становятся дороже, compaction срабатывает поздно или суммаризирует слишком много технического шума.

### 7. Compaction settings имеют `keepLastMessages`, но текущая реализация не использует это поле

`CompactionSettings.keepLastMessages` нормализуется, но `compactChat()` создаёт новый чат только с summary.

**Риск:** после compaction теряются свежие детали, которые могли быть важнее общего summary.

## Эталонный базовый system prompt vNext

Цель: сделать prompt короче, иерархичнее и сильнее. Ниже вариант на английском как основной машинный язык инструкций; языковая политика остаётся параметром.

```text
You are AIST, a coding agent running inside VS Code.

Operate in this order:
1. Understand the task and inspect only the files needed for the next decision.
2. Before code changes, create a short plan unless the task is trivial or read-only.
3. Make focused edits that preserve the existing project style.
4. Verify once when useful with the smallest relevant command.
5. Finish with a concise summary and mention changed files.

Tool rules:
- All paths are workspace-relative.
- Every tool call must include a short reason in the required language.
- Prefer read/search tools before edits.
- Use shell freely for project commands, tests, builds, diagnostics, and git-safe inspection.
- Prefer previewable file-edit tools for workspace mutations when they fit the change.
- Do not repeat the same tool call with the same arguments; use the previous result instead.
- If a tool fails, adjust once using the error; do not loop.

Editing rules:
- Keep changes small and localized.
- Do not invent files, APIs, or test results.
- Do not claim a change unless a tool succeeded.
- When approval is required, make the proposed diff reviewable.

Language:
- Final answers and tool-call reasons must be in {language}.
```

### Почему это лучше

- Сохраняет ключевые инварианты, но убирает длинные повторяющиеся пояснения.
- Даёт модели явный workflow, а не разрозненный список запретов.
- Отделяет tool rules от editing rules, что облегчает соблюдение.
- Оставляет место для custom instructions, modes и skills без чрезмерного роста system prompt.

## Рекомендуемая структура итогового prompt

Собирать system prompt в фиксированных коротких секциях:

```text
# Identity
...

# Workflow
...

# Tool rules
...

# Editing rules
...

# Project instructions
...AGENTS.md / CLAUDE.md / active instruction refs...

# Active mode
...mode instructions...

# Skills
...only if skills exist...
```

Практическое изменение: `getSystemPrompt()` сейчас возвращает один длинный paragraph через `.join(' ')`. Лучше вернуть Markdown-подобные секции с короткими bullets. Это немного увеличит символы-разделители, но улучшит attention и compliance.

## Оптимизация пользовательских инструкций и modes

### Текущая проблема

Default instructions и default modes повторяют общие правила:

- `Practical coding`: inspect files, preserve style.
- `Safe changes`: small focused changes, verify once.
- `Coder`: implementation-focused, mention changed files.

Эти правила уже должны быть в base prompt. Если они активны как preset, они добавляют токены без новой информации.

### Предложение

1. Сделать default preset минимальным:

```text
Mode: Coder
Ship focused implementation changes. Prefer direct edits over long discussion.
```

2. Перенести общие правила `inspect`, `small focused changes`, `verify once`, `mention changed files` в base prompt.
3. Оставить user/project instructions только для реально специфичных ограничений проекта.
4. В UI показать предупреждение: “This instruction duplicates base AIST rules” для стандартных boilerplate-инструкций.

## Оптимизация active editor context

### Предложение A: режим `auto | selection | file | off`

Добавить настройку `openrouterAgent.editorContextMode`:

- `auto`: отправлять selection всегда; файл целиком — только если prompt похож на задачу про активный файл.
- `selection`: отправлять только выделение.
- `file`: текущее поведение.
- `off`: не добавлять editor context автоматически.

### Предложение B: lightweight context header

Вместо полного файла по умолчанию отправлять:

```text
Active editor:
- file: src/...
- language: typescript
- selection: present/empty
```

А полный текст модель должна запросить через `read_file` или пользователь через selection.

### Ожидаемый эффект

- Меньше случайного context pollution.
- Снижение prompt tokens на каждом ask.
- Более предсказуемое поведение для задач, не связанных с открытым редактором.

## Оптимизация compaction

### Улучшение 1: использовать `keepLastMessages`

`keepLastMessages` уже есть в настройках, но не применяется при создании compacted chat. Предлагаемый алгоритм:

1. Summary строится по старой истории без последних N сообщений.
2. Новый чат получает первое assistant summary-сообщение.
3. Затем добавляются последние N сообщений как verbatim tail.

Это сохраняет свежие детали и снижает риск “summary forgot what just happened”.

### Улучшение 2: структурированный compaction prompt

Текущий prompt хороший, но можно сделать output schema:

```text
Write a compact handoff in this structure:
- Goal:
- Current status:
- Constraints:
- Decisions:
- Files changed:
- Commands run:
- Open tasks:
- Errors/blockers:
```

### Улучшение 3: не суммаризировать raw tool outputs полностью

Перед compaction преобразовывать tool messages в краткие записи:

```text
Tool read_file src/a.ts: returned 12k chars, relevant facts: ...
Tool run_bash_script npm test: exit 1, failing tests: ...
```

## Оптимизация tools

## Приоритет P0: добавить `read_file_range`

### Зачем

Модель часто знает нужную область после `grep_search`, но вынуждена читать файл целиком.

### Schema

```json
{
  "name": "read_file_range",
  "description": "Read a line range from a UTF-8 workspace file.",
  "parameters": {
    "type": "object",
    "properties": {
      "reason": { "type": "string" },
      "path": { "type": "string" },
      "startLine": { "type": "number" },
      "endLine": { "type": "number" }
    },
    "required": ["reason", "path", "startLine", "endLine"],
    "additionalProperties": false
  }
}
```

### Runtime notes

- Ограничить диапазон, например максимум 400 строк.
- Возвращать `totalLines`, `startLine`, `endLine`, `content`.
- Default permission: `auto`.

## Приоритет P0: добавить patch-style edit tool

### Зачем

`replace_in_file` с exact large block дорогой и хрупкий. Patch tool позволит маленькие targeted edits.

### Schema-вариант

```json
{
  "name": "apply_patch",
  "description": "Apply a unified diff patch to workspace files with preview before approval.",
  "parameters": {
    "type": "object",
    "properties": {
      "reason": { "type": "string" },
      "patch": { "type": "string" }
    },
    "required": ["reason", "patch"],
    "additionalProperties": false
  }
}
```

### Safety

- Всегда `ask` по умолчанию.
- Preview через existing editable diff infrastructure.
- Reject patch paths outside workspace.
- Reject binary patches.

## Приоритет P1: улучшить `grep_search`

Добавить опции:

- `countOnly`: вернуть только файлы и количество совпадений.
- `filesOnly`: вернуть только paths.
- `beforeLines`/`afterLines` вместо одного `contextLines`, если нужна асимметрия.
- `exclude`: пользовательский glob exclude поверх стандартного.

Это уменьшит результаты поиска для широких queries.

## Приоритет P1: добавить `list_symbols` или `outline_file`

### Зачем

Для TypeScript/React модель часто хочет понять структуру файла, но чтение всего файла дорого.

### Возможная реализация

Через VS Code document symbols API:

```json
{
  "ok": true,
  "path": "src/...",
  "symbols": [
    { "name": "AgentSettingsSummary", "kind": "Function", "line": 28, "endLine": 57 },
    { "name": "getModelOptions", "kind": "Function", "line": 140, "endLine": 149 }
  ]
}
```

Default permission: `auto`.

## Приоритет P1: сохранить полноценный shell без typed wrappers

`run_bash_script` не стоит дробить на `run_npm_script`, `run_tests` и похожие helper-инструменты. Нормальный доступ к shell упрощает работу агенту: модель может использовать реальные команды проекта, комбинировать диагностику, запускать точечные проверки и не упираться в искусственные ограничения wrapper-API.

Что улучшать вместо новых shell wrappers:

- Оставить `run_bash_script` как основной универсальный shell-инструмент.
- Сохранить permission `ask` по умолчанию для shell, потому что команда может менять workspace или окружение.
- Усилить prompt-правило: модель должна объяснять `reason` для любого shell-вызова конкретно, а не общими словами.
- В UI approval показывать `cwd`, `timeoutMs`, факт truncation и сам script максимально читаемо.
- В tool result возвращать structured metadata: `exitCode`, `signal`, `timedOut`, `durationMs`, `stdoutTruncated`, `stderrTruncated` уже есть; можно добавить `commandKind` эвристически только для отображения, не как отдельный tool.

Важно: рекомендация “prefer file-edit tools over shell edits” не должна запрещать shell. Её смысл — не использовать shell для массовых правок, когда безопаснее показать editable diff через file tools. Для диагностики, сборки, тестов, git-safe инспекций и проектных команд shell остаётся нормальным и полезным путём.

## Решения и обоснования через обязательный `reason`, без отдельного decision tool

Отдельные `write_decision` / `remember_decision` не нужны. Если модель обязана обосновывать любой вызов инструмента через поле `reason`, то audit trail уже формируется естественно: рядом с каждым действием видно, почему модель решила его выполнить.

Что улучшать вместо отдельного decision tool:

- Сделать `reason` обязательным для всех tools, включая будущие tools.
- В prompt явно требовать конкретный reason: “что нужно узнать/изменить и почему без этого нельзя перейти к следующему шагу”.
- В UI tool-card показывать reason заметнее и сохранять его в истории.
- Для compaction включать reasons в краткую историю действий: “read_file X — reason — факт/результат”.
- Не плодить отдельные memory/decision tools, пока нет отдельного durable artifact store для таких решений.

## Tool descriptions vNext

Текущие descriptions местами длинные и повторяют глобальные правила. Предлагаемый стиль:

- Description: коротко “когда использовать”.
- Parameters: коротко “что передать”.
- Safety/policy: в system prompt, а не в каждом tool.

Пример:

```text
read_file: Read a UTF-8 workspace file. Use read_file_range when only specific lines are needed.
replace_in_file: Replace exact text in one file. Prefer small replacements; use apply_patch for multi-location edits.
run_bash_script: Run a focused Bash command for tests, builds, diagnostics, or repo inspection. Do not use it for edits when file-edit tools can do the change.
```

## Улучшение runtime-политик для tool-use

### 1. Soft budget на tool calls

Передавать модели в system prompt текущий бюджет, например:

```text
For small tasks, aim for <= 4 tool calls before editing and <= 1 verification command.
```

Не делать это жёстким лимитом, иначе модель будет экономить на важных inspect steps.

### 2. Tool result compression

После каждого tool result хранить в history не всегда полный JSON, а:

- полный результат для read/search до лимита;
- для больших outputs — `summary + artifactRef`;
- в UI показывать полный output из message result, но модели отправлять сжатую версию.

### 3. Ошибки tools делать actionable

Сейчас многие ошибки строковые. Лучше возвращать `code`:

```json
{ "ok": false, "code": "TEXT_NOT_FOUND", "error": "Text was not found in src/a.ts." }
```

Модель надёжнее выберет следующий шаг: reread range, adjust patch, stop.

## Улучшение planning tools

### Текущая позиция

`create_plan` и `update_plan` стоит оставить с approval `ask` по умолчанию. Хотя план не меняет workspace-файлы, он задаёт направление работы агента; пользователю полезно явно видеть и подтверждать, что модель собирается делать дальше.

### Что улучшать без отключения approval

- Оставить `create_plan` и `update_plan` в режиме `ask`.
- Оставить `set_plan_item_status` в режиме `auto`, потому что это только синхронизация прогресса уже принятого плана.
- Делать планы короткими, чтобы approval не превращался в чтение длинного документа.
- В tool-card для plan approval показывать title и 2-5 шагов максимально компактно.
- В prompt запретить планировать для простых read-only ответов, чтобы не создавать лишние подтверждения.

### Prompt rule

```text
Use planning tools for non-trivial code changes. Keep plans 2-5 steps. Do not plan for simple answers or single read-only inspections. Wait for approval before treating a new or meaningfully changed plan as accepted.
```

## Skills optimization

`run_skill` добавляется в tool list только при наличии skills — это правильно. Улучшения:

1. В system prompt показывать skills компактно:

```text
Skills available via run_skill:
- id — label: short description
```

2. Добавить optional `inputFormat` в skill config: `text | json`.
3. Добавить `examples` в skill config, но не включать их в system prompt всегда; показывать по запросу отдельным tool `describe_skill`.

## Codex/OpenRouter-specific notes

### OpenRouter

- Streaming с usage включён: хорошо.
- Reasoning effort нормализуется: хорошо.
- Для моделей без tool support стоит либо скрывать tools, либо явно предупреждать в state. Сейчас `supportsTools` есть в model option, но `runAgentLoop()` всегда передаёт tools.

### Codex

- Codex transport преобразует OpenRouter-style tool calls в Responses API input: хорошо.
- Service tier уже нормализуется и показывается только для supported models: хорошо.
- Стоит проверить, не нужно ли для Codex API передавать system instructions короче: Codex-модели обычно лучше реагируют на procedural bullets, чем на длинные абзацы.

## Максимально сильные идеи для следующего скачка качества

Ниже идеи не про косметическую экономию токенов, а про изменение качества агентского цикла: меньше случайных действий, быстрее путь к правильному edit, лучше восстановление после ошибок и выше предсказуемость.

### 1. Context governor: отдельный слой принятия решения о контексте

Сейчас контекст добавляется простым правилом: active editor context плюс история. Более сильный вариант — ввести `ContextGovernor`, который перед каждым model request решает, что именно попадёт в prompt.

Что делает governor:

- классифицирует запрос: `question`, `code-edit`, `debug`, `test-fix`, `repo-inspection`, `planning-only`;
- выбирает context pack: active selection, active file header, relevant files from previous turns, recent tool summaries;
- ограничивает budget на историю, tool outputs и editor context отдельно;
- может исключить нерелевантный active editor, если запрос явно про другой файл или весь проект;
- добавляет короткий `Context note`, чтобы модель понимала, почему этот контекст дан.

Пример итогового блока:

```text
# Context note
Task classified as code-edit. Active selection is included. Full active file is omitted; read it only if needed.
Relevant prior files: src/extension/agent/config/prompts.ts, src/extension/tools/filesystemTools.ts.
```

Ожидаемый эффект: меньше случайной привязки к открытому файлу, ниже prompt tokens, быстрее первый полезный tool call.

### 2. Repo map cache: дешёвая карта проекта вместо постоянных `list_files`

Добавить workspace-local cache с краткой картой проекта:

- package manager, основные scripts, test commands;
- top-level directories;
- важные config files;
- public exports / symbols для крупных файлов;
- timestamp/hash для invalidation.

Модель получает не весь repo map всегда, а короткий блок при необходимости:

```text
# Repo map excerpt
Package: npm
Scripts: compile, test, test:unit, lint, build:webview
Likely test command for TS unit tests: npm run test:unit -- --run
```

Это не заменяет shell, а помогает модели быстрее выбрать правильную команду и меньше дергать `list_files`/`read_file`.

### 3. Tool result dual-channel: полный output в UI, сжатый output в model history

Сейчас tool result одновременно нужен человеку и модели. Это разные задачи. Идея: хранить полный result в chat message/UI, но в `workingMessages` отправлять модельно-оптимизированную версию.

Примеры:

- `read_file`: модель получает полный текст только до лимита; сверх лимита — outline + first/last relevant lines + artifact marker.
- `grep_search`: модель получает top matches и count, UI хранит всё.
- `run_bash_script`: модель получает exit code, failing lines, final summary; UI хранит stdout/stderr.
- diff preview: модель получает changed range и file path, не весь generated content повторно.

Ожидаемый эффект: резко меньше history bloat на длинных сессиях без потери observability для пользователя.

### 4. Edit strategy selector: модель выбирает намерение, runtime выбирает лучший edit primitive

Вместо того чтобы модель всегда сама решала `write_file` vs `replace_in_file` vs будущий `apply_patch`, можно добавить промежуточный semantic edit tool:

```json
{
  "name": "edit_file",
  "arguments": {
    "reason": "...",
    "path": "src/a.ts",
    "strategy": "replace_exact | patch | rewrite_small_file",
    "instructions": "...",
    "expectedChange": "..."
  }
}
```

Runtime может:

- запросить текущий файл;
- построить preview;
- отказать, если файл слишком большой для rewrite;
- выбрать safer primitive;
- показать пользователю единый approval UI.

Это более радикальная идея, чем `apply_patch`: модель описывает намерение и ожидаемый результат, а runtime обеспечивает безопасное применение. Для MVP проще начать с `apply_patch`, но стратегически semantic edit уменьшит ошибки exact replace.

### 5. Self-check gate перед дорогими или опасными tool calls

Не нужен отдельный model request. Достаточно prompt-инварианта и runtime validation: для мутаций, shell и delete проверять, что `reason` содержит конкретику.

Примеры плохих reasons, которые можно подсветить или отклонить:

- “Нужно выполнить команду.”
- “Проверка.”
- “Изменить файл.”

Примеры хороших:

- “Проверяю TypeScript compile после изменения API AgentRunService.”
- “Заменяю exact import path после переноса prompt builder.”

Можно сделать мягко: UI показывает warning “reason too generic” на approval card, но не блокирует пользователя.

### 6. Model capability routing

Сейчас выбранная модель используется для всего. Сильная оптимизация — разделить задачи по типу:

- main reasoning/edit model: выбранная пользователем;
- cheap summarizer: compaction, tool output summaries;
- fast classifier: context governor и task classification;
- optional strong reviewer: review pass для крупных diff.

Важно: это должно быть опционально и прозрачно в UI, потому что multi-model routing влияет на стоимость и приватность. Но для качества/скорости это один из самых больших рычагов.

### 7. Automatic verification planner без typed shell ограничения

Не добавлять typed shell wrappers, но научить runtime подсказывать модели вероятные команды проверки из repo map:

```text
Verification hints:
- Type check: npm run compile
- Unit tests: npm run test:unit -- --run
- Webview CSS: npm run build:webview-css
```

Модель всё равно вызывает полноценный `run_bash_script`, но быстрее выбирает правильную команду и лучше объясняет reason.

### 8. Failure memory внутри одного run

Добавить transient memory не как отдельный tool, а как runtime state:

- failed exact search patterns;
- failed commands and exit codes;
- denied tool calls and user comments;
- repeated file reads;
- files already inspected.

Эту память можно кратко включать в следующий request:

```text
# Run notes
- replace_in_file failed in src/a.ts because search text was stale.
- User denied deleting docs/old.md: keep backward compatibility notes.
```

Это снижает повтор ошибок без долговременного decision tool.

### 9. Approval feedback as first-class model signal

Сейчас approval comment может попасть в tool result. Стоит сделать это более явным:

- approved with comment → модель видит `userApprovalComment` рядом с result;
- deny-continue → модель видит структурированный отказ и должна адаптировать план;
- deny-stop → завершение без попыток продолжить.

Prompt rule:

```text
Treat approval comments as high-priority user instructions for the current run.
```

### 10. Self-improving memory: агент учится на своих ошибках и предпочтениях пользователя

Идея сильная и, вероятно, одна из самых ценных для качества AIST. Но её нужно делать не как свободную “память модели”, а как управляемую систему заметок с явным consent, scope, TTL, review и защитой от prompt injection.

#### Что именно запоминать

Полезная память должна быть не логом всего подряд, а короткими нормализованными preferences/lessons:

- **Global user preferences**: стиль работы пользователя во всех проектах.
  - “Пользователь предпочитает полноценный shell вместо typed wrappers.”
  - “Пользователь хочет approval для planning tools.”
  - “Финальные ответы держать короткими, но указывать изменённые файлы.”
- **Project preferences**: правила конкретного workspace.
  - “В этом проекте для проверки TS использовать `npm run compile`.”
  - “Комментарии в коде писать по-русски и объяснять почему.”
  - “Не запускать e2e без явного запроса: они долгие.”
- **Tool-use lessons**: что работало или не работало.
  - “Для больших markdown-файлов сначала использовать grep/read range, не читать целиком.”
  - “Если `replace_in_file` не нашёл текст, перечитать диапазон перед повтором.”
- **User correction patterns**: замечания пользователя к действиям агента.
  - “Не предлагать отдельные decision tools; использовать обязательный `reason`.”
  - “Не отключать approval у планов ради скорости.”

Что не стоит запоминать автоматически:

- секреты, токены, приватные фрагменты кода;
- временные детали одного бага;
- raw stdout/stderr;
- большие куски файлов;
- выводы, которые модель не может обосновать конкретным событием.

#### UX approval comments vNext

Комментарий к tool approval стоит расширить до трёх полей:

1. **Комментарий к текущему вызову** — попадает в текущий run как high-priority feedback.
2. **Запомнить глобально** — сохраняется в user-level memory и применяется во всех workspace.
3. **Запомнить для проекта** — сохраняется в project-level memory рядом с workspace config.

UI может выглядеть так:

```text
Comment for this tool call:
[ Не удаляй файл, он нужен для backward compatibility ]

Remember globally (optional):
[ Не предлагай удаление файлов без явного запроса ]

Remember for this project (optional):
[ В этом проекте deprecated файлы оставляем до major release ]
```

Важно: глобальное/проектное запоминание должно быть явным действием пользователя. Комментарий к текущему вызову не должен автоматически становиться долговременной памятью.

#### Post-run reflection loop

После завершения agent loop можно запускать короткий reflection pass. Это отдельный model request или cheap summarizer, который получает не весь чат, а структурированный trace:

```json
{
  "task": "...",
  "outcome": "success | stopped | error",
  "tools": [
    { "name": "read_file", "reason": "...", "ok": true },
    { "name": "replace_in_file", "reason": "...", "ok": false, "errorCode": "TEXT_NOT_FOUND" }
  ],
  "approvalFeedback": [
    { "decision": "deny-continue", "comment": "...", "rememberGlobal": "...", "rememberProject": "..." }
  ],
  "changedFiles": ["..."],
  "verification": [{ "command": "...", "exitCode": 0 }]
}
```

Задача reflection:

- предложить 0-3 краткие memory candidates;
- классифицировать scope: `global | project | none`;
- указать evidence: какой tool/user comment/error это подтверждает;
- оценить confidence;
- не сохранять ничего без оснований.

Пример output:

```json
{
  "candidates": [
    {
      "scope": "project",
      "kind": "verification",
      "text": "Для TypeScript-проверки в этом проекте использовать npm run compile.",
      "evidence": "User accepted run_bash_script with npm run compile and it validated the change.",
      "confidence": 0.82
    }
  ]
}
```

#### Human-in-the-loop сохранение

Есть три режима:

1. **Manual**: reflection показывает предложения, пользователь нажимает “Save”. Самый безопасный старт.
2. **Confirm once per run**: после успешного run показывать компактный список proposed memories.
3. **Auto-save high confidence**: только для явно пользовательских `rememberGlobal/rememberProject` полей и confidence выше порога.

Рекомендуемый MVP: manual + auto-save только для явных полей пользователя.

#### Memory store: локально

Использовать два уровня хранения:

```text
~/.aist-agent/memory.json              # global user memory
.aist-agent/memory.json                # project memory
.aist-agent/memory-events.jsonl        # append-only audit trail проекта
```

Формат заметки:

```json
{
  "id": "mem_...",
  "scope": "global | project",
  "kind": "preference | workflow | tool_lesson | verification | style | safety",
  "text": "Короткая заметка в повелительной или декларативной форме.",
  "evidence": "Почему это сохранено.",
  "source": "user_explicit | approval_comment | post_run_reflection | manual_edit",
  "confidence": 0.0,
  "createdAt": "...",
  "updatedAt": "...",
  "lastUsedAt": "...",
  "useCount": 0,
  "ttlDays": 180,
  "status": "active | archived | rejected"
}
```

Почему append-only events полезны: можно объяснить пользователю, откуда появилась память, откатить ошибочную заметку и не превращать memory в непрозрачный prompt injection канал.

#### Memory retrieval в prompt

Нельзя вставлять все заметки всегда. Нужен `MemoryRetriever`:

- выбирает top 3-7 заметок по workspace, task type, mentioned files/tools и recency;
- отделяет global от project;
- дедуплицирует похожие заметки;
- не включает archived/rejected/expired;
- добавляет короткий блок после base rules, но до project instructions.

Пример:

```text
# User memory
- Prefer full shell access for project commands; do not suggest typed shell wrappers.
- Keep planning tool approvals enabled unless the user explicitly changes this.

# Project memory
- Verify extension TypeScript changes with npm run compile.
- Code comments should be in Russian and explain why, not only what.
```

#### Защита от плохой памяти и prompt injection

Самоулучшение опасно, если модель сама бесконтрольно пишет себе инструкции. Нужны ограничения:

- модель может только предлагать candidates, не писать память напрямую;
- user explicit fields имеют приоритет над reflection;
- память должна быть короткой и без raw code/secrets;
- каждая заметка имеет evidence и source;
- UI позволяет редактировать, отключать и удалять заметки;
- project memory не должна автоматически становиться global;
- облачная синхронизация только opt-in.

#### Cloud memory server

Идея облачного сервера хороша как следующий этап: пользователь получает накопленный опыт между машинами и проектами. Но это privacy-sensitive feature, поэтому нужна архитектура с opt-in и понятными границами.

Минимальный дизайн:

- локальный memory store остаётся source of truth;
- cloud server синхронизирует только выбранные memory items, не raw chats/tool outputs;
- user может помечать заметки `sync: true | false`;
- project memory по умолчанию не синхронизируется или синхронизируется только в private namespace;
- end-to-end encryption желательно с ключом пользователя;
- server API: `pull`, `push`, `resolve conflicts`, `delete`, `audit log`;
- conflict resolution: last-write-wins только для metadata, text conflict требует manual review.

Возможная схема API:

```http
GET /v1/memory?workspaceHash=...
POST /v1/memory:batchUpsert
POST /v1/memory:delete
GET /v1/memory/audit
```

Не стоит отправлять в облако:

- полный chat history;
- tool outputs;
- paths, если пользователь включил privacy mode;
- секреты и env.

#### Как улучшить идею ещё сильнее

1. **Memory quality score**: заметка повышает score, если помогла избежать ошибки или была использована в успешном run; понижает, если пользователь её отклонил.
2. **Contradiction detector**: если новая заметка конфликтует со старой, UI спрашивает, какую оставить.
3. **Memory review inbox**: отдельная страница настроек “Agent learned”, где пользователь раз в неделю чистит/подтверждает заметки.
4. **Project onboarding**: при первом открытии проекта агент предлагает извлечь project memory из `AGENTS.md`, `CLAUDE.md`, package scripts и прошлых approvals.
5. **Privacy labels**: `public`, `private`, `sensitive`, `local-only` для каждой заметки.
6. **Decay by default**: заметки без использования архивируются через TTL, чтобы агент не тащил старые предпочтения вечно.
7. **Explain memory use**: если заметка повлияла на действие, tool card показывает “Used memory: ...”.
8. **Memory export/import**: Markdown/JSON экспорт для доверия и переносимости.

#### MVP implementation path

1. Добавить типы `AgentMemoryItem`, `AgentMemoryCandidate`, `AgentMemoryScope`.
2. Добавить локальное хранилище global/project memory.
3. Расширить approval comment model тремя полями: текущий комментарий, remember global, remember project.
4. Включать explicit remembered notes в следующий prompt через `MemoryRetriever`.
5. Добавить post-run reflection, но сначала только показывать candidates в UI без auto-save.
6. Добавить страницу управления памятью в settings.
7. Затем добавить opt-in cloud sync.

### 11. Declarative agent runtime: переконфигурируемые tools и system prompts из `.aist-agent`

Идея очень сильная, но требует жёстких границ безопасности. Если всё сделать правильно, AIST сможет не только помнить предпочтения, но и эволюционировать: добавлять project-specific tools, менять свои инструкции, оптимизировать tool descriptions и применять новые правила уже в следующем model request.

Ключевой принцип: **модель не должна напрямую менять свой runtime без review**. Она может предлагать изменения декларативных файлов, а применение идёт через обычный approval/diff flow. После успешного сохранения `AgentDefinitionLoader` перечитывает `.aist-agent` и следующий prompt уже строится с новыми tools/instructions.

#### Целевая структура `.aist-agent`

```text
.aist-agent/
├── settings.json
├── memory.json
├── memory-events.jsonl
├── instructions/
│   ├── base-overrides.md
│   ├── project.md
│   └── modes/
│       ├── coder.md
│       └── reviewer.md
├── tools/
│   ├── README.md
│   ├── run-unit-tests.md
│   ├── inspect-package.md
│   └── scripts/
│       ├── run-unit-tests.sh
│       └── inspect-package.sh
└── policies/
    ├── tool-permissions.json
    └── prompt-policy.md
```

Почему Markdown + scripts:

- Markdown удобно review-ить и редактировать человеку.
- Frontmatter задаёт typed metadata для prompt/tool schema.
- Script-файл отделяет executable logic от описания tool.
- Всё живёт в workspace, версионируется и проходит обычный diff approval.

#### Формат декларативного tool definition

Пример `.aist-agent/tools/run-unit-tests.md`:

```md
---
id: run_project_unit_tests
label: Run project unit tests
description: Run the unit test command selected for this workspace.
permission: ask
script: scripts/run-unit-tests.sh
input_schema:
  type: object
  properties:
    reason:
      type: string
      description: Why these tests are needed now.
    pattern:
      type: string
      description: Optional test name or file pattern.
    timeoutMs:
      type: number
      description: Timeout in milliseconds.
  required: [reason]
  additionalProperties: false
output_mode: summarize
max_output_chars: 20000
---

Use this tool when a code change should be verified by the project unit test suite.
Do not use it for type checking; use the configured compile command instead.
```

Script получает JSON input через stdin и environment:

```bash
#!/usr/bin/env bash
set -euo pipefail
INPUT_JSON="$(cat)"
PATTERN="$(node -e 'const fs=require("fs"); const input=JSON.parse(fs.readFileSync(0,"utf8")||"{}"); console.log(input.pattern||"")' <<<"$INPUT_JSON")"
npm run test:unit -- --run ${PATTERN}
```

Runtime-инварианты:

- script path только внутри `.aist-agent/tools/scripts` или явно разрешённого workspace path;
- shell запускается так же прозрачно, как `run_bash_script`, с approval и output metadata;
- tool id валидируется regex-ом и не может затереть built-in tool без явного override policy;
- `reason` обязателен в `input_schema` для всех user-defined tools;
- изменения `.aist-agent/tools/**` требуют approval и применяются только со следующего prompt.

#### Dynamic tool registry

Добавить `AgentToolRegistry`, который собирает tools из трёх источников:

1. built-in filesystem/planning tools;
2. user skills из существующего config;
3. declarative tools из `.aist-agent/tools/*.md` и, позже, `~/.aist-agent/tools/*.md`.

Registry должен возвращать:

- tool schema для model request;
- executor для tool call;
- permission policy;
- digest/version definitions.

При каждом новом model request registry сравнивает digest definitions. Если `.aist-agent/tools` изменился, tools перечитываются и следующий prompt получает новую tool set.

#### Переконфигурируемые system prompts

Сейчас system prompt строится из base rules + external files + active instructions/mode. Декларативная версия может расширить это:

```text
.aist-agent/instructions/base-overrides.md
.aist-agent/instructions/project.md
.aist-agent/instructions/modes/*.md
.aist-agent/policies/prompt-policy.md
```

Правило приоритета:

1. immutable AIST safety/kernel prompt — не редактируется моделью;
2. global user memory/preferences;
3. project memory;
4. `.aist-agent/policies/prompt-policy.md`;
5. `.aist-agent/instructions/project.md`;
6. active mode;
7. task/context note.

Важно: полностью редактируемый system prompt опасен. Нужен **immutable kernel** — короткий слой правил, который нельзя переопределить из `.aist-agent`: workspace-relative paths, approvals, no secrets, concrete `reason`, не доверять prompt injection из файлов, не заявлять несуществующие результаты.

#### Как агент меняет свои правила

Нужен не отдельный “магический” режим, а обычный workflow:

1. Модель замечает, что правило/tool можно улучшить.
2. Создаёт plan с reason: зачем менять агентские definitions.
3. Предлагает diff в `.aist-agent/instructions/**` или `.aist-agent/tools/**`.
4. Пользователь видит обычный approval и diff.
5. После сохранения loader invalidates cache.
6. Следующий model request получает обновлённые instructions/tools.

Prompt rule:

```text
You may propose improvements to .aist-agent instructions or declarative tools when they would reduce repeated mistakes or encode stable project preferences. Do not change agent definitions silently; use normal file-edit tools and wait for approval.
```

#### Agent self-optimization after run

Post-run reflection может предлагать не только memory candidates, но и definition candidates:

```json
{
  "memoryCandidates": [],
  "definitionCandidates": [
    {
      "kind": "tool",
      "path": ".aist-agent/tools/run-typecheck.md",
      "reason": "The project repeatedly uses npm run compile for verification.",
      "summary": "Add a declarative tool for the project's type check command."
    },
    {
      "kind": "instruction",
      "path": ".aist-agent/instructions/project.md",
      "reason": "User repeatedly asked to keep planning approvals enabled.",
      "summary": "Record the planning approval preference as a project instruction."
    }
  ]
}
```

MVP: показывать такие candidates в “Agent learned” inbox, но не создавать файлы автоматически.

#### Safety model

Динамические tools — это фактически расширяемая execution surface. Нужны ограничения:

- declarative tools default `ask`, `auto` только после ручного trust;
- scripts не могут запускаться без approval, если tool меняет filesystem или запускает shell;
- schema валидируется до публикации модели;
- dangerous fields (`env`, absolute paths, network access) требуют отдельного warning;
- пользователь может disable tool в UI;
- registry показывает source: built-in/global/project;
- tool definition changes логируются в `.aist-agent/tool-events.jsonl`;
- cloud sync для tools/instructions нельзя включать по умолчанию.

#### Версионирование и rollback

Каждый prompt/tool definition должен иметь digest:

```json
{
  "definitionDigest": "sha256:...",
  "loadedAt": "...",
  "source": ".aist-agent/tools/run-unit-tests.md"
}
```

В chat/tool card полезно показывать “Tool version: sha256:abcd”. Если новый tool начал ломать workflow, пользователь может откатить файл через git или UI “Disable this tool”.

#### Связь с памятью

Memory отвечает на вопрос “что учитывать?”, declarative definitions — “какие правила/tools реально доступны?”. Хороший поток:

1. User explicit memory фиксирует предпочтение.
2. Reflection видит, что preference стабильная.
3. Agent предлагает project instruction или declarative tool.
4. Пользователь подтверждает diff.
5. Следующие prompts/tools меняются декларативно.

Так память не превращается в бесконечный список заметок: устойчивые паттерны повышаются до project rules/tools.

#### MVP implementation path

1. Добавить read-only loader `.aist-agent/instructions/*.md` в system prompt.
2. Добавить prompt snapshot tests для declarative instructions.
3. Добавить декларативные tools только как wrappers над shell scripts с обязательным `ask`.
4. Добавить registry digest и hot reload перед следующим model request.
5. Добавить UI список project tools/instructions с enable/disable.
6. Разрешить агенту предлагать edits в `.aist-agent/**` через обычный approval flow.
7. Добавить post-run definition candidates в memory/reflection inbox.

### 12. Prompt contract tests

Для prompt/tool оптимизаций нужны тесты не только TypeScript unit, но и golden prompt snapshots:

- base prompt на EN/RU;
- prompt с project instructions;
- prompt со skills;
- prompt после compaction;
- prompt с context governor note.

Цель: не дать prompt снова разрастись незаметно и не потерять ключевые правила. Snapshot должен проверять наличие инвариантов: language, workspace-relative paths, concrete reason, shell policy, approval для планов.

### 13. Tool-use telemetry dashboard

Добавить локальную диагностику по run:

- tool calls count by type;
- first edit latency;
- repeated tool calls stopped;
- prompt/completion tokens;
- shell commands count;
- failed edit attempts;
- approval denied/approved ratio;
- context bytes sent.

Без такой телеметрии оптимизация prompt-ов будет субъективной. С ней можно быстро понять, что реально ускорило агента.

### 14. “Fast path” для простых задач

Для маленьких запросов не нужен полный agent loop. Возможные fast paths:

- read-only question → без planning tools и без editor full context;
- edit current selection → использовать специализированный `editSelection` prompt;
- explain error from active terminal/output → короткий context pack;
- one-file small edit → plan optional but still approval for mutation.

Это снижает latency и количество tool calls там, где агентский режим избыточен.

## Обновлённый top-10 приоритетов

1. Секционный короткий base prompt с новой shell policy и обязательным конкретным `reason`.
2. Declarative agent runtime: tools/system prompts из `.aist-agent` с hot reload перед следующим prompt.
3. Self-improving memory: global/project заметки, explicit remember fields и post-run reflection.
4. Context governor для управления active editor/history/tool context с учётом memory retrieval и declarative policies.
5. Tool result dual-channel: полный UI output, сжатый model output.
6. `read_file_range`, улучшенный `grep_search`, `outline_file` и declarative shell tools.
7. `apply_patch` или первый вариант semantic `edit_file` с preview.
8. Repo map cache и verification hints без ограничения полноценного shell.
9. Использование `keepLastMessages`, structured compaction, memory-aware summaries и promotion стабильных lessons в `.aist-agent`.
10. Prompt snapshot tests, tool-use telemetry, definition digests и optional multi-model routing для classifier/summarizer/reviewer.

## Рекомендованный roadmap

### P0: быстрый выигрыш без больших архитектурных изменений

1. Переписать `getSystemPrompt()` на секционный короткий prompt vNext.
2. Убрать дубли из default instructions/modes или сделать их короче.
3. Добавить `read_file_range`.
4. Использовать `keepLastMessages` в compaction.
5. Добавить настройку `editorContextMode` с default `auto` или `selection`.

### P1: улучшение tool efficiency, локальная память и декларативные definitions

1. Добавить `apply_patch` с preview.
2. Добавить `outline_file` через VS Code symbols.
3. Добавить `filesOnly/countOnly/exclude` в `grep_search`.
4. Возвращать structured error codes из tools.
5. Сжимать большие tool results перед сохранением в model history.
6. Усилить отображение и сохранение `reason` для каждого tool call как основного audit trail.
7. Добавить локальное global/project memory-хранилище и explicit поля `rememberGlobal` / `rememberProject` в approval comments.
8. Добавить `MemoryRetriever`, который включает только top-N релевантных заметок в prompt.
9. Добавить read-only loader `.aist-agent/instructions/*.md` и prompt snapshots для него.
10. Добавить declarative shell tools из `.aist-agent/tools/*.md` с обязательным `ask` и registry digest.

### P2: долгосрочная управляемость и самоулучшение

1. Ввести token/tool-call telemetry по каждому run: prompt tokens, tool count, repeated calls, edit size.
2. Добавить post-run reflection, который предлагает memory candidates с evidence/confidence без автоматического сохранения.
3. Добавить definition candidates: предложения новых `.aist-agent/tools/**` и `.aist-agent/instructions/**` без автоприменения.
4. Добавить prompt A/B profile: `compact`, `safe`, `autonomous`.
5. Добавить per-model prompt variants для Codex/OpenRouter, если telemetry покажет разницу.
6. Добавить skill descriptions on demand вместо полного включения всех details в system prompt.
7. Сохранять approval для plan tools как осознанный UX-контроль, а не оптимизировать его преждевременно.
8. Подготовить opt-in cloud memory sync с privacy labels, audit log и запретом отправки raw chats/tool outputs.
9. Позже рассмотреть opt-in sync declarative tools/instructions, но только после privacy review и signature/digest model.

## Acceptance criteria для оптимизаций

После изменений стоит измерять:

- Среднее число prompt tokens на первый model request.
- Среднее число tool calls до первого edit.
- Долю failed `replace_in_file` из-за `Text was not found`.
- Долю повторных одинаковых tool calls.
- Средний размер history после 5-10 turns.
- Количество случаев, когда модель использовала shell для редактирования вместо file tools.

## Минимальный рекомендуемый prompt для внедрения первым PR

```text
You are AIST, a coding agent inside VS Code.

Workflow: inspect only what is needed, plan before non-trivial edits, make focused changes, verify once when useful, then summarize changed files.

Tools: use workspace-relative paths; include a concrete short reason in {language}; prefer read/search before edits; use shell freely for project commands, tests, builds and diagnostics, but prefer previewable file-edit tools for workspace mutations; do not repeat identical tool calls.

Edits: preserve project style, keep diffs small, do not invent results, and only claim successful changes.

Language: final answers and tool-call reasons must be in {language}.
```

Этот вариант можно дополнить секциями project instructions, active mode и skills. Он заметно короче текущего базового prompt и должен лучше удерживать модель в нужном workflow.
