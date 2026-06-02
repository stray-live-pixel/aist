import { AistDaemonServer } from '../AistDaemonServer';
import { chatReflectionCandidateReject } from '../methods/chatReflectionCandidateReject';
import { chatReflectionCandidateSave } from '../methods/chatReflectionCandidateSave';
import { chatSetModel } from '../methods/chatSetModel';
import { chatSetModelSettings } from '../methods/chatSetModelSettings';
import { chatStop } from '../methods/chatStop';
import { clearApprovalsForRun } from '../methods/clearApprovalsForRun';
import { clientCapabilities } from '../methods/clientCapabilities';
import { close } from '../methods/close';
import { configGet } from '../methods/configGet';
import { configUpdate } from '../methods/configUpdate';
import { createAuxiliaryModelInvoker } from '../methods/createAuxiliaryModelInvoker';
import { createBusyError } from '../methods/createBusyError';
import { createCompactionSummary } from '../methods/createCompactionSummary';
import { createModelClientForModel } from '../methods/createModelClientForModel';
import { createRoutingModelClient } from '../methods/createRoutingModelClient';
import { createRuntime } from '../methods/createRuntime';
import { createToolCallHandler } from '../methods/createToolCallHandler';
import { dispatch } from '../methods/dispatch';

/**
 * Что это: устанавливает группу chat-методов daemon на prototype.
 * Зачем нужно: общий installer остаётся маленьким, а JSON-RPC method names сохраняются.
 * Какую продуктовую проблему решает: daemon декомпозирован без изменения внешнего контракта.
 */
export function installChatMethods(): void {
  AistDaemonServer.prototype.chatReflectionCandidateReject = chatReflectionCandidateReject;
  AistDaemonServer.prototype.chatReflectionCandidateSave = chatReflectionCandidateSave;
  AistDaemonServer.prototype.chatSetModel = chatSetModel;
  AistDaemonServer.prototype.chatSetModelSettings = chatSetModelSettings;
  AistDaemonServer.prototype.chatStop = chatStop;
  AistDaemonServer.prototype.clearApprovalsForRun = clearApprovalsForRun;
  AistDaemonServer.prototype.clientCapabilities = clientCapabilities;
  AistDaemonServer.prototype.close = close;
  AistDaemonServer.prototype.configGet = configGet;
  AistDaemonServer.prototype.configUpdate = configUpdate;
  AistDaemonServer.prototype.createAuxiliaryModelInvoker = createAuxiliaryModelInvoker;
  AistDaemonServer.prototype.createBusyError = createBusyError;
  AistDaemonServer.prototype.createCompactionSummary = createCompactionSummary;
  AistDaemonServer.prototype.createModelClientForModel = createModelClientForModel;
  AistDaemonServer.prototype.createRoutingModelClient = createRoutingModelClient;
  AistDaemonServer.prototype.createRuntime = createRuntime;
  AistDaemonServer.prototype.createToolCallHandler = createToolCallHandler;
  AistDaemonServer.prototype.dispatch = dispatch;
}

declare module '../AistDaemonServer' {
  interface AistDaemonServer {
    chatReflectionCandidateReject: typeof chatReflectionCandidateReject;
    chatReflectionCandidateSave: typeof chatReflectionCandidateSave;
    chatSetModel: typeof chatSetModel;
    chatSetModelSettings: typeof chatSetModelSettings;
    chatStop: typeof chatStop;
    clearApprovalsForRun: typeof clearApprovalsForRun;
    clientCapabilities: typeof clientCapabilities;
    close: typeof close;
    configGet: typeof configGet;
    configUpdate: typeof configUpdate;
    createAuxiliaryModelInvoker: typeof createAuxiliaryModelInvoker;
    createBusyError: typeof createBusyError;
    createCompactionSummary: typeof createCompactionSummary;
    createModelClientForModel: typeof createModelClientForModel;
    createRoutingModelClient: typeof createRoutingModelClient;
    createRuntime: typeof createRuntime;
    createToolCallHandler: typeof createToolCallHandler;
    dispatch: typeof dispatch;
  }
}
