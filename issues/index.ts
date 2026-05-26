/**
 * Индекс плановых задач по превращению prompt/agent-auto в нативную часть AIST.
 *
 * Это не план «обернуть shell/python runner». Цель — перенести flow/run
 * оркестрацию, мониторинг и execution model в TypeScript/Node внутри extension,
 * чтобы папка prompt/ стала миграционным источником и затем была удалена.
 */
export const autonomousRunnerIssues = [
  { id: '001', title: 'Целевая архитектура нативного autonomous runner', file: './001-autonomous-architecture.md' },
  {
    id: '002',
    title: 'Миграционная инвентаризация prompt и parity matrix',
    file: './002-prompt-migration-inventory.md'
  },
  { id: '003', title: 'Модели данных flow/run/session и формат хранения', file: './003-models-storage.md' },
  { id: '004', title: 'TypeScript frontmatter parser и discovery flows/runs', file: './004-discovery-service.md' },
  { id: '005', title: 'Engine abstraction: CLI и встроенные API-провайдеры', file: './005-engine-abstraction.md' },
  { id: '006', title: 'Node orchestration engine для multi-stage flow', file: './006-flow-orchestrator.md' },
  { id: '007', title: 'Node batch runner для run-пакетов задач', file: './007-batch-runner.md' },
  { id: '008', title: 'Session store, logs, snapshots и event stream', file: './008-session-store-monitoring.md' },
  { id: '009', title: 'IPC, presenter и webview state без регрессий chat UI', file: './009-ipc-state.md' },
  { id: '010', title: 'VS Code entrypoints и автономная страница', file: './010-vscode-entrypoints.md' },
  { id: '011', title: 'Shared UI компоненты для autonomous dashboard', file: './011-shared-ui.md' },
  { id: '012', title: 'React autonomous dashboard на shared UI', file: './012-autonomous-dashboard.md' },
  {
    id: '013',
    title: 'Удаление shell/python зависимости и deprecation prompt/',
    file: './013-remove-prompt-runtime.md'
  },
  { id: '014', title: 'Регрессионная защита, тесты, документация и release', file: './014-tests-docs-release.md' }
] as const;
