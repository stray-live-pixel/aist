import type { DaemonHandlerContext, DaemonHandlerResult } from './types';

/**
 * Что это: маршрутизатор JSON-RPC методов автономных запусков.
 * Зачем нужно: autonomous lifecycle отделён от chat/config handlers.
 * Какую проблему решает: batch/flow функциональность можно развивать без изменения daemon dispatch-монолита.
 */
export function handleAutonomousRpcMethod({
  context,
  method,
  params
}: {
  context: DaemonHandlerContext;
  method: string;
  params: unknown;
}): DaemonHandlerResult {
  switch (method) {
    case 'autonomous.state':
      return { handled: true, result: context.call('autonomousState') };
    case 'autonomous.importLegacy':
      return { handled: true, result: context.call('autonomousImportLegacy') };
    case 'autonomous.flow.create':
      return { handled: true, result: context.call('autonomousFlowCreate', params) };
    case 'autonomous.flow.save':
      return { handled: true, result: context.call('autonomousFlowSave', params) };
    case 'autonomous.flow.delete':
      return { handled: true, result: context.call('autonomousFlowDelete', params) };
    case 'autonomous.flow.start':
      return { handled: true, result: context.call('autonomousFlowStart', params) };
    case 'autonomous.run.start':
      return { handled: true, result: context.call('autonomousRunStart', params) };
    case 'autonomous.stop':
      return { handled: true, result: context.call('autonomousStop', params) };
    case 'autonomous.export':
      return { handled: true, result: context.call('autonomousExport', params) };
    default:
      return { handled: false };
  }
}
