import { AistDaemonServer } from '../AistDaemonServer';
import { modelsList } from '../methods/modelsList';
import { prepareClientPreview } from '../methods/prepareClientPreview';
import { readState } from '../methods/readState';
import { registerActiveRun } from '../methods/registerActiveRun';
import { rejectPendingClientRequests } from '../methods/rejectPendingClientRequests';
import { requireChat } from '../methods/requireChat';
import { resetStaleRuntimeState } from '../methods/resetStaleRuntimeState';
import { resolveChatModel } from '../methods/resolveChatModel';
import { sendClientRequest } from '../methods/sendClientRequest';
import { sendError } from '../methods/sendError';
import { sendResult } from '../methods/sendResult';
import { start } from '../methods/start';
import { stateGet } from '../methods/stateGet';
import { subagentGet } from '../methods/subagentGet';
import { subagentList } from '../methods/subagentList';
import { unregisterActiveRun } from '../methods/unregisterActiveRun';

/**
 * Что это: устанавливает группу config-методов daemon на prototype.
 * Зачем нужно: общий installer остаётся маленьким, а JSON-RPC method names сохраняются.
 * Какую продуктовую проблему решает: daemon декомпозирован без изменения внешнего контракта.
 */
export function installConfigMethods(): void {
  AistDaemonServer.prototype.modelsList = modelsList;
  AistDaemonServer.prototype.prepareClientPreview = prepareClientPreview;
  AistDaemonServer.prototype.readState = readState;
  AistDaemonServer.prototype.registerActiveRun = registerActiveRun;
  AistDaemonServer.prototype.rejectPendingClientRequests = rejectPendingClientRequests;
  AistDaemonServer.prototype.requireChat = requireChat;
  AistDaemonServer.prototype.resetStaleRuntimeState = resetStaleRuntimeState;
  AistDaemonServer.prototype.resolveChatModel = resolveChatModel;
  AistDaemonServer.prototype.sendClientRequest = sendClientRequest;
  AistDaemonServer.prototype.sendError = sendError;
  AistDaemonServer.prototype.sendResult = sendResult;
  AistDaemonServer.prototype.start = start;
  AistDaemonServer.prototype.stateGet = stateGet;
  AistDaemonServer.prototype.subagentGet = subagentGet;
  AistDaemonServer.prototype.subagentList = subagentList;
  AistDaemonServer.prototype.unregisterActiveRun = unregisterActiveRun;
}

declare module '../AistDaemonServer' {
  interface AistDaemonServer {
    modelsList: typeof modelsList;
    prepareClientPreview: typeof prepareClientPreview;
    readState: typeof readState;
    registerActiveRun: typeof registerActiveRun;
    rejectPendingClientRequests: typeof rejectPendingClientRequests;
    requireChat: typeof requireChat;
    resetStaleRuntimeState: typeof resetStaleRuntimeState;
    resolveChatModel: typeof resolveChatModel;
    sendClientRequest: typeof sendClientRequest;
    sendError: typeof sendError;
    sendResult: typeof sendResult;
    start: typeof start;
    stateGet: typeof stateGet;
    subagentGet: typeof subagentGet;
    subagentList: typeof subagentList;
    unregisterActiveRun: typeof unregisterActiveRun;
  }
}
