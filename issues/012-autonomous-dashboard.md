# 012 — React autonomous dashboard на shared UI

## Цель

Сделать основную страницу управления native autonomous runner в React webview.

## Где создавать

```text
src/webview/pages/autonomous/
├── AutonomousPage.tsx
├── AutonomousPage.module.scss
├── AutonomousPage.stories.tsx
├── DefinitionsPanel.tsx
├── LaunchOptionsPanel.tsx
├── SessionsPanel.tsx
├── EventLogPanel.tsx
└── utils.ts
```

## Layout

### Header

- `Autonomous Runner`;
- workspace name;
- native/legacy sources count;
- refresh;
- import from `prompt/` action if legacy exists.

### Engine selector

Options from state:

- Claude CLI;
- Codex CLI;
- OpenRouter API;
- Codex API.

Show capabilities:

- resume;
- fork;
- tools;
- requires binary/auth.

### Definitions

Tabs/sections:

- Flows;
- Runs.

Flow card:

- source native/legacy;
- title/description;
- stages pipeline;
- models;
- diagnostics;
- start dry-run/start.

Run card:

- workDir;
- tasks count;
- repeat;
- pending/done;
- diagnostics;
- start dry-run/start.

### Launch options

- engine;
- dry-run;
- extra prompt for flow;
- workDir override only if safe;
- max events tail? optional.

No `--html`, `--port`, `--log-file`: old CLI flags are not first-class native UI concepts. Export/open session replaces old HTML monitor.

### Sessions

Session card:

- status;
- kind/target;
- engine;
- duration;
- current stage/task;
- stop;
- reveal session;
- open events;
- export markdown/json.

### Event log

- search;
- action filter;
- stage/task filter;
- compact/full;
- copy event.

This replaces `prompt/src/shared/ui/app.js` behavior in React.

## UX requirements

- Dry-run prominent for safe validation.
- Legacy prompt definitions marked as legacy with import CTA.
- API engines explain limitations for `continue/continue-from` fallback.
- CLI engines show missing binary diagnostic before start.
- Codex API shows login required if auth missing.

## i18n

Add keys in webview i18n RU/EN for all labels/statuses/actions.

## Styling

- Use shared UI only for controls/cards/pills/code blocks.
- Page SCSS only for grid/layout.
- No inline styles.
- No copied CSS from `prompt/src/shared/ui/styles.css`.

## Stories

- no definitions;
- legacy prompt detected;
- native definitions loaded;
- engine missing binary;
- running flow;
- running batch;
- API engine fallback warning;
- finished session;
- error session.

## Критерии готовности

- Dashboard запускает native dry-run flow.
- Dashboard запускает native dry-run run.
- Dashboard показывает session event log без old HTML monitor.
- Все visual primitives shared или justified page layout.
