import { AistDaemonServer } from '../AistDaemonServer';
import { isolationContinue } from '../methods/isolationContinue';
import { isolationDestroy } from '../methods/isolationDestroy';
import { isolationGetEvents } from '../methods/isolationGetEvents';
import { isolationList } from '../methods/isolationList';
import { isolationRemoteServerDelete } from '../methods/isolationRemoteServerDelete';
import { isolationRemoteServerList } from '../methods/isolationRemoteServerList';
import { isolationRemoteServerUpsert } from '../methods/isolationRemoteServerUpsert';
import { isolationRunners } from '../methods/isolationRunners';
import { isolationStart } from '../methods/isolationStart';
import { isolationStatus } from '../methods/isolationStatus';
import { isolationStop } from '../methods/isolationStop';
import { handleIsolationRuntimeEvent, runIsolationAgent } from '../methods/runIsolationAgent';

export function installIsolationMethods(): void {
  AistDaemonServer.prototype.isolationContinue = isolationContinue;
  AistDaemonServer.prototype.isolationDestroy = isolationDestroy;
  AistDaemonServer.prototype.isolationGetEvents = isolationGetEvents;
  AistDaemonServer.prototype.isolationList = isolationList;
  AistDaemonServer.prototype.isolationRemoteServerDelete = isolationRemoteServerDelete;
  AistDaemonServer.prototype.isolationRemoteServerList = isolationRemoteServerList;
  AistDaemonServer.prototype.isolationRemoteServerUpsert = isolationRemoteServerUpsert;
  AistDaemonServer.prototype.isolationRunners = isolationRunners;
  AistDaemonServer.prototype.isolationStart = isolationStart;
  AistDaemonServer.prototype.isolationStatus = isolationStatus;
  AistDaemonServer.prototype.isolationStop = isolationStop;
  AistDaemonServer.prototype.runIsolationAgent = runIsolationAgent;
  AistDaemonServer.prototype.handleIsolationRuntimeEvent = handleIsolationRuntimeEvent;
}

declare module '../AistDaemonServer' {
  interface AistDaemonServer {
    isolationContinue: typeof isolationContinue;
    isolationDestroy: typeof isolationDestroy;
    isolationGetEvents: typeof isolationGetEvents;
    isolationList: typeof isolationList;
    isolationRemoteServerDelete: typeof isolationRemoteServerDelete;
    isolationRemoteServerList: typeof isolationRemoteServerList;
    isolationRemoteServerUpsert: typeof isolationRemoteServerUpsert;
    isolationRunners: typeof isolationRunners;
    isolationStart: typeof isolationStart;
    isolationStatus: typeof isolationStatus;
    isolationStop: typeof isolationStop;
    runIsolationAgent: typeof runIsolationAgent;
    handleIsolationRuntimeEvent: typeof handleIsolationRuntimeEvent;
  }
}
