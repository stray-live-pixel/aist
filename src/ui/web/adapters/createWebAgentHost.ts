import type { DaemonChat, DaemonState } from '../../../cli/daemonProtocol';
import type { AgentHost } from '../../shared/api/AgentHost.types';
import type { HostToUiMessage, PersistedUiState, UiToHostMessage } from '../../shared/api/hostMessages';
import type { ModelOption } from '../../shared/types';
import { rpc, subscribeToEvents } from '../client';
import { mapDaemonStateToAgentState } from './mapDaemonStateToAgentState';

const PERSIST_KEY = 'aist.web.persistedState';

function readPersisted(): PersistedUiState | undefined {
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    return raw ? (JSON.parse(raw) as PersistedUiState) : undefined;
  } catch {
    return undefined;
  }
}

function writePersisted(state: PersistedUiState): void {
  try {
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(state));
  } catch {
    // localStorage может быть недоступен (приватный режим) — web UI продолжает работать без персиста.
  }
}

/**
 * Web реализация AgentHost.
 *
 * Действия общего UI транслируются в HTTP RPC daemon, а live-события приходят по SSE: на каждое из
 * них adapter перечитывает состояние и отдаёт общему store свежий snapshot AgentState. Это
 * единственное место web shell, которое знает про fetch/SSE и протокол web server.
 *
 * Паритет: chat-flow (создать/спросить/остановить/approve/модель) реализован полностью. Поля
 * настроек/режимов/permissions пока дефолтны — их сборка на стороне web server это отдельная задача.
 */
export function createWebAgentHost(): AgentHost {
  let activeChatId: string | undefined = readPersisted()?.chatId;
  let listener: ((message: HostToUiMessage) => void) | null = null;

  async function publishState(): Promise<void> {
    if (!listener) {
      return;
    }

    const daemonState = await rpc<DaemonState>('state.get');
    if (!activeChatId) {
      activeChatId = daemonState.chats[0]?.id;
    }

    const [models, activeChat] = await Promise.all([
      rpc<{ models: ModelOption[] }>('models.list', { provider: 'all' })
        .then((result) => result.models)
        .catch(() => [] as ModelOption[]),
      activeChatId
        ? rpc<{ chat: DaemonChat }>('chat.get', { chatId: activeChatId })
            .then((result) => result.chat)
            .catch(() => null)
        : Promise.resolve(null)
    ]);

    listener?.({ type: 'state', ...mapDaemonStateToAgentState({ daemonState, activeChat, models }) });
  }

  async function dispatch(message: UiToHostMessage): Promise<void> {
    switch (message.type) {
      case 'webviewReady':
        // Начальный snapshot загружается в subscribe(); явный ack не нужен.
        return;
      case 'ask': {
        if (!activeChatId) {
          const created = await rpc<{ chat: { id: string } }>('chat.create');
          activeChatId = created.chat.id;
        }
        await rpc('chat.ask', { chatId: activeChatId, prompt: message.prompt });
        break;
      }
      case 'newChat': {
        const created = await rpc<{ chat: { id: string } }>('chat.create');
        activeChatId = created.chat.id;
        break;
      }
      case 'setActiveChat':
        activeChatId = message.chatId;
        break;
      case 'setModel':
        if (activeChatId) {
          await rpc('chat.setModel', { chatId: activeChatId, model: message.model });
        }
        break;
      case 'stop':
        await rpc('chat.stop', { chatId: message.chatId ?? activeChatId });
        break;
      case 'resolveToolCall':
        await rpc('approval.resolve', { messageId: message.messageId, decision: message.decision });
        break;
      default:
        // Остальные действия (настройки/autonomous/isolation) пока не реализованы на web server.
        console.warn('[web] action is not supported in the web host yet:', message.type);
        return;
    }

    await publishState();
  }

  return {
    postMessage(message) {
      void dispatch(message).catch((error) => {
        console.error('[web] failed to dispatch action', message.type, error);
      });
    },
    subscribe(nextListener) {
      listener = nextListener;
      void publishState();
      const stop = subscribeToEvents(
        () => {
          void publishState();
        },
        () => undefined
      );

      return () => {
        listener = null;
        stop();
      };
    },
    getPersistedState() {
      return readPersisted();
    },
    setPersistedState(state) {
      activeChatId = state.chatId ?? activeChatId;
      writePersisted(state);
    }
  };
}
