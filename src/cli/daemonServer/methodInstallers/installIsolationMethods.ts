import { AistDaemonServer } from '../AistDaemonServer';
import { isolationContinue } from '../methods/isolationContinue';
import { isolationDestroy } from '../methods/isolationDestroy';
import { isolationGetEvents } from '../methods/isolationGetEvents';
import { isolationList } from '../methods/isolationList';
import { isolationStart } from '../methods/isolationStart';
import { isolationStatus } from '../methods/isolationStatus';
import { isolationStop } from '../methods/isolationStop';
import { handleIsolationRuntimeEvent, runIsolationAgent } from '../methods/runIsolationAgent';

export function installIsolationMethods(): void {
  AistDaemonServer.prototype.isolationContinue = isolationContinue;
  AistDaemonServer.prototype.isolationDestroy = isolationDestroy;
  AistDaemonServer.prototype.isolationGetEvents = isolationGetEvents;
  AistDaemonServer.prototype.isolationList = isolationList;
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
    isolationStart: typeof isolationStart;
    isolationStatus: typeof isolationStatus;
    isolationStop: typeof isolationStop;
    runIsolationAgent: typeof runIsolationAgent;
    handleIsolationRuntimeEvent: typeof handleIsolationRuntimeEvent;
  }
}
