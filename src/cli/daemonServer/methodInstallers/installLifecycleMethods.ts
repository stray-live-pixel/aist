import { AistDaemonServer } from '../AistDaemonServer';
import { acceptConnection } from '../methods/acceptConnection';
import { approvalResolve } from '../methods/approvalResolve';
import { autonomousExport } from '../methods/autonomousExport';
import { autonomousFlowCreate } from '../methods/autonomousFlowCreate';
import { autonomousFlowDelete } from '../methods/autonomousFlowDelete';
import { autonomousFlowSave } from '../methods/autonomousFlowSave';
import { autonomousFlowStart } from '../methods/autonomousFlowStart';
import { autonomousImportLegacy } from '../methods/autonomousImportLegacy';
import { autonomousRunStart } from '../methods/autonomousRunStart';
import { autonomousState } from '../methods/autonomousState';
import { autonomousStop } from '../methods/autonomousStop';
import { broadcastEvent } from '../methods/broadcastEvent';
import { broadcastStateChanged } from '../methods/broadcastStateChanged';
import { callRpcHandler } from '../methods/callRpcHandler';
import { chatAsk } from '../methods/chatAsk';
import { chatClear } from '../methods/chatClear';
import { chatCompact } from '../methods/chatCompact';
import { chatCreate } from '../methods/chatCreate';
import { chatDelete } from '../methods/chatDelete';
import { chatGet } from '../methods/chatGet';
import { chatList } from '../methods/chatList';
import { chatMemoryAnalyze } from '../methods/chatMemoryAnalyze';
import { daemonShutdown } from '../methods/daemonShutdown';

/**
 * Что это: устанавливает группу lifecycle-методов daemon на prototype.
 * Зачем нужно: общий installer остаётся маленьким, а JSON-RPC method names сохраняются.
 * Какую продуктовую проблему решает: daemon декомпозирован без изменения внешнего контракта.
 */
export function installLifecycleMethods(): void {
  AistDaemonServer.prototype.acceptConnection = acceptConnection;
  AistDaemonServer.prototype.approvalResolve = approvalResolve;
  AistDaemonServer.prototype.autonomousExport = autonomousExport;
  AistDaemonServer.prototype.autonomousFlowCreate = autonomousFlowCreate;
  AistDaemonServer.prototype.autonomousFlowDelete = autonomousFlowDelete;
  AistDaemonServer.prototype.autonomousFlowSave = autonomousFlowSave;
  AistDaemonServer.prototype.autonomousFlowStart = autonomousFlowStart;
  AistDaemonServer.prototype.autonomousImportLegacy = autonomousImportLegacy;
  AistDaemonServer.prototype.autonomousRunStart = autonomousRunStart;
  AistDaemonServer.prototype.autonomousState = autonomousState;
  AistDaemonServer.prototype.autonomousStop = autonomousStop;
  AistDaemonServer.prototype.broadcastEvent = broadcastEvent;
  AistDaemonServer.prototype.broadcastStateChanged = broadcastStateChanged;
  AistDaemonServer.prototype.callRpcHandler = callRpcHandler;
  AistDaemonServer.prototype.chatAsk = chatAsk;
  AistDaemonServer.prototype.chatClear = chatClear;
  AistDaemonServer.prototype.chatCompact = chatCompact;
  AistDaemonServer.prototype.chatCreate = chatCreate;
  AistDaemonServer.prototype.chatDelete = chatDelete;
  AistDaemonServer.prototype.chatGet = chatGet;
  AistDaemonServer.prototype.chatList = chatList;
  AistDaemonServer.prototype.chatMemoryAnalyze = chatMemoryAnalyze;
  AistDaemonServer.prototype.daemonShutdown = daemonShutdown;
}

declare module '../AistDaemonServer' {
  interface AistDaemonServer {
    acceptConnection: typeof acceptConnection;
    approvalResolve: typeof approvalResolve;
    autonomousExport: typeof autonomousExport;
    autonomousFlowCreate: typeof autonomousFlowCreate;
    autonomousFlowDelete: typeof autonomousFlowDelete;
    autonomousFlowSave: typeof autonomousFlowSave;
    autonomousFlowStart: typeof autonomousFlowStart;
    autonomousImportLegacy: typeof autonomousImportLegacy;
    autonomousRunStart: typeof autonomousRunStart;
    autonomousState: typeof autonomousState;
    autonomousStop: typeof autonomousStop;
    broadcastEvent: typeof broadcastEvent;
    broadcastStateChanged: typeof broadcastStateChanged;
    callRpcHandler: typeof callRpcHandler;
    chatAsk: typeof chatAsk;
    chatClear: typeof chatClear;
    chatCompact: typeof chatCompact;
    chatCreate: typeof chatCreate;
    chatDelete: typeof chatDelete;
    chatGet: typeof chatGet;
    chatList: typeof chatList;
    chatMemoryAnalyze: typeof chatMemoryAnalyze;
    daemonShutdown: typeof daemonShutdown;
  }
}
