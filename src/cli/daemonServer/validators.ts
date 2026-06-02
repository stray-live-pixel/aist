import type { AgentSkill } from '../../core/features/skills/skills';
import type { AutonomousExportFormat, AutonomousLaunchOptions } from '../../core/processes/autonomous';
import type { EditorContextInput, ModelProvider } from '../../core/shared/types/types';
import { DaemonRpcError } from './DaemonRpcError';
import { asOptionalRecord, optionalString } from './params';

/**
 * Что это: проверяет payload active editor context от клиента.
 * Зачем нужно: daemon доверяет только полному context object с валидным mode.
 * Какую продуктовую проблему решает: модель не получает повреждённый editor context.
 */
export function isEditorContextInput(value: unknown): value is EditorContextInput {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const input = value as Partial<EditorContextInput>;
  return (
    typeof input.fileName === 'string' &&
    typeof input.languageId === 'string' &&
    typeof input.selectionText === 'string' &&
    typeof input.fullText === 'string' &&
    (input.mode === 'auto' || input.mode === 'selection' || input.mode === 'file' || input.mode === 'off')
  );
}

/**
 * Что это: нормализует skill из config в AgentSkill.
 * Зачем нужно: только skill с id/label/command может попасть в prompt и tool registry.
 * Какую продуктовую проблему решает: неправильная настройка skills не ломает весь daemon.
 */
export function normalizeDaemonSkill({ value }: { value: unknown }): AgentSkill | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const label = typeof record.label === 'string' ? record.label.trim() : '';
  const command = typeof record.command === 'string' ? record.command.trim() : '';
  if (!id || !label || !command) {
    return undefined;
  }
  return {
    id,
    label,
    command,
    permission: record.permission === 'auto' ? 'auto' : 'ask',
    description: typeof record.description === 'string' ? record.description.trim() : '',
    scope: typeof record.scope === 'string' ? record.scope : undefined
  };
}

/**
 * Что это: проверяет наличие решения approval в params.
 * Зачем нужно: approve/deny поддерживает несколько legacy форматов.
 * Какую продуктовую проблему решает: старые клиенты могут продолжать отвечать на tool approvals.
 */
export function hasApprovalDecision({ input }: { input: Record<string, unknown> }): boolean {
  return (
    input.decision === 'approve' ||
    input.decision === 'deny-stop' ||
    input.decision === 'deny-continue' ||
    input.action === 'approve' ||
    input.action === 'deny-stop' ||
    input.action === 'deny-continue' ||
    typeof input.approved === 'boolean'
  );
}

/**
 * Что это: нормализует provider filter для models.list.
 * Зачем нужно: клиент может запросить openrouter, codex или all.
 * Какую продуктовую проблему решает: UI каталога моделей не делает невалидные provider-запросы.
 */
export function normalizeModelProvider({ value }: { value: string }): ModelProvider | 'all' {
  if (value === 'openrouter' || value === 'codex' || value === 'all') {
    return value;
  }
  throw new DaemonRpcError(-32602, 'params.invalid', 'Model provider must be openrouter, codex, or all.', {
    provider: value
  });
}

/**
 * Что это: парсит options запуска autonomous session.
 * Зачем нужно: daemon должен принимать только известные engine id и безопасные defaults.
 * Какую продуктовую проблему решает: batch/flow запуск не стартует с ошибочной конфигурацией движка.
 */
export function parseAutonomousLaunch({ value }: { value: unknown }): AutonomousLaunchOptions {
  const input = asOptionalRecord({ value });
  const engineIdInput = optionalString({ input, key: 'engineId' }) || 'dry-run';
  if (!['claude-cli', 'codex-cli', 'openrouter-api', 'codex-api', 'dry-run'].includes(engineIdInput)) {
    throw new DaemonRpcError(-32602, 'params.invalid', 'Autonomous engine id is invalid.', { engineId: engineIdInput });
  }
  const engineId = engineIdInput as AutonomousLaunchOptions['engineId'];
  return {
    engineId,
    dryRun: typeof input.dryRun === 'boolean' ? input.dryRun : true,
    workDir: optionalString({ input, key: 'workDir' }),
    extraPrompt: optionalString({ input, key: 'extraPrompt' })
  };
}

/**
 * Что это: нормализует формат экспорта autonomous session.
 * Зачем нужно: daemon поддерживает только markdown и json.
 * Какую продуктовую проблему решает: client не получает неожиданный binary/unknown формат.
 */
export function normalizeAutonomousExportFormat({ value }: { value: string }): AutonomousExportFormat {
  if (value === 'markdown' || value === 'json') {
    return value;
  }
  throw new DaemonRpcError(-32602, 'params.invalid', 'Autonomous export format must be markdown or json.', {
    format: value
  });
}
