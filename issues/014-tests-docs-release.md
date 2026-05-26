# 014 — Регрессионная защита, тесты, документация и release

## Цель

Гарантировать, что native autonomous runner работает, старый chat agent не сломан, а проект готов к удалению `prompt/` и будущему desktop/standalone развитию.

## Regression checklist chat agent

Обязательно проверить:

1. Sidebar `openrouterAgent.chats` открывается.
2. New chat command работает.
3. Отправка chat prompt работает.
4. Stop chat останавливает только chat run.
5. Settings page открывается.
6. Tool permissions сохраняются.
7. Tool approval prompt работает.
8. Open chat in editor работает.
9. Open chat JSON работает.
10. Codex login/logout команды доступны.
11. Autonomous panel открывается/закрывается без влияния на active chat.
12. Autonomous session и chat run не останавливают друг друга.

## Native autonomous tests

### Unit

- frontmatter parser;
- discovery legacy/native;
- import legacy prompt definitions;
- engine registry;
- CLI command builders;
- CLI stream parsers;
- API engine adapters with mocked clients;
- flow context resolver;
- flow prompt builder;
- flow orchestrator status transitions;
- batch repeat/move semantics;
- session storage atomic writes;
- event log read/write/export.

### Integration

- run `example` flow dry-run native;
- run `create-edit-section` validation dry-run native;
- run `benefits-list-analysis` batch dry-run native;
- API engine dry-run/mock OpenRouter;
- stop running flow.

### Webview/stories

- shared UI stories;
- AutonomousPage states;
- event log filters;
- session actions disabled/enabled.

## Commands

Перед merge:

```sh
npm run typecheck
npm run test
npm run build:extension
npm run build:webview
npm run build
```

Если webview/shared UI менялись:

```sh
npm run build:storybook
```

Если e2e доступен:

```sh
npm run test:e2e
```

## Documentation

Создать/обновить:

```text
docs/autonomous-runner.md
docs/autonomous-migration-from-prompt.md
```

Содержание:

- native runner overview;
- engines CLI/API;
- requirements for CLI engines;
- API credentials reuse;
- flow/run file format;
- migration from prompt;
- session storage `.aist-agent/autonomous/sessions`;
- safety notes for autonomous execution;
- limitations and troubleshooting.

## Desktop/standalone readiness checklist

- Core orchestrator does not import VS Code APIs directly.
- VS Code-specific logic isolated in controller/host.
- Storage uses Node fs abstractions or injectable fs service.
- Engine adapters separate API clients from UI.
- Webview UI uses React/shared components, not VS Code-only assumptions where avoidable.

## Release criteria

- All required checks pass.
- prompt parity matrix completed.
- Migration command tested.
- User can run native autonomous flow/run without `python3`.
- User can use existing chat agent unchanged.
