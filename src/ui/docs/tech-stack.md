# Web UI: стек

## Используем

- **React + TypeScript** — общий интерфейс.
- **Vite** — запуск и сборка web UI.
- **Zustand + devtools** — общий UI store для daemon state, events, approvals и состояния интерфейса.
- **SSE** — live events из daemon.
- **Fastify** — web-сервер.
- **CSS Modules** — стили.

## Идея

Один daemon обслуживает все UI:

- VS Code extension;
- web app;
- desktop app.

Общие компоненты лежат в `src/ui/shared/**`.

Разные оболочки лежат в:

```text
src/ui/vscode/**
src/ui/web/**
src/ui/desktop/**
```
