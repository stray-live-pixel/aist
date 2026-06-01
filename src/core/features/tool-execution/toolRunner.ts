import { ToolCallDeniedError } from './toolRunner/ToolCallDeniedError';
import type { ToolRunnerRuntime } from './toolRunner/ToolRunnerRuntime';
import { defaultActivityFormatter } from './toolRunner/defaultActivityFormatter';
import { handleToolCall } from './toolRunner/handleToolCall';
import type { ToolRunnerDeps, ToolRunnerHandleParams } from './toolRunner/types';

export { ToolCallDeniedError };
export type {
  ToolExecutionPreview,
  ToolRunnerActivityFormatter,
  ToolRunnerApprovalRequest,
  ToolRunnerApprovalService,
  ToolRunnerAuxiliaryModelSettings,
  ToolRunnerDeps,
  ToolRunnerEventEmitter,
  ToolRunnerExecutionAdapter,
  ToolRunnerHandleParams,
  ToolRunnerMemoryService,
  ToolRunnerMutableContext,
  ToolRunnerPreviewAdapter,
  ToolRunnerRunRepository,
  ToolRunnerTelemetryRecorder
} from './toolRunner/types';

/**
 * Что это: публичный orchestrator выполнения model tool-calls.
 * Зачем нужно: фасад сохраняет старый API, а approval/run/events/persistence разложены по маленьким сценариям.
 * Какую продуктовую проблему решает: агент безопасно выполняет tools, пишет UI-сообщения и сохраняет run timeline без монолита.
 */
export class ToolRunner {
  private readonly runtime: ToolRunnerRuntime;

  /** Создаёт runner с зависимостями execution, approval, storage, telemetry и events. */
  constructor(deps: ToolRunnerDeps) {
    this.runtime = {
      deps,
      now: deps.now || Date.now,
      activityFormatter: deps.activityFormatter || defaultActivityFormatter
    };
  }

  /** Обрабатывает один tool-call модели от waiting до final model result. */
  handleToolCall(params: ToolRunnerHandleParams): Promise<void> {
    return handleToolCall({ runtime: this.runtime, params });
  }
}
