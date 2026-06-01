import type { AutonomousEvent, AutonomousSessionKind, AutonomousSessionStatus } from '../types';

/**
 * Что это: события backend автономного режима для CLI/daemon подписчиков.
 * Зачем нужно: UI и CLI получают единый stream событий запуска, прогресса, state-change и завершения.
 * Какую продуктовую проблему решает: пользователь видит живой статус автономной сессии в любом клиенте.
 */
export type AutonomousBackendEvent =
  | {
      readonly type: 'autonomous.event';
      readonly workspaceRoot: string;
      readonly sessionId: string;
      readonly event: AutonomousEvent;
    }
  | {
      readonly type: 'autonomous.state.changed';
      readonly workspaceRoot: string;
      readonly reason: string;
      readonly sessionId?: string;
      readonly at: number;
    }
  | {
      readonly type: 'autonomous.session.started';
      readonly workspaceRoot: string;
      readonly sessionId: string;
      readonly kind: AutonomousSessionKind;
      readonly targetId: string;
      readonly at: number;
    }
  | {
      readonly type: 'autonomous.session.finished';
      readonly workspaceRoot: string;
      readonly sessionId: string;
      readonly status: AutonomousSessionStatus;
      readonly at: number;
    };
