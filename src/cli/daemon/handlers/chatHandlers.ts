import type { DaemonHandlerContext, DaemonHandlerResult } from './types';

/**
 * Что это: маршрутизатор JSON-RPC методов чата.
 * Зачем нужно: все chat.* и связанные reflection/subagent/approval методы находятся в одной группе.
 * Какую проблему решает: разработчику проще менять chat runtime daemon без просмотра config/autonomous handlers.
 */
export function handleChatRpcMethod({
  context,
  method,
  params
}: {
  context: DaemonHandlerContext;
  method: string;
  params: unknown;
}): DaemonHandlerResult {
  const methodMap: Record<string, string> = {
    'chat.create': 'chatCreate',
    'chat.list': 'chatList',
    'chat.get': 'chatGet',
    'chat.ask': 'chatAsk',
    'chat.stop': 'chatStop',
    'chat.delete': 'chatDelete',
    'chat.clear': 'chatClear',
    'chat.setModel': 'chatSetModel',
    'chat.setModelSettings': 'chatSetModelSettings',
    'chat.compact': 'chatCompact',
    'chat.memoryAnalyze': 'chatMemoryAnalyze',
    'chat.reflectionCandidate.save': 'chatReflectionCandidateSave',
    'chat.reflectionCandidate.reject': 'chatReflectionCandidateReject',
    'subagent.get': 'subagentGet',
    'subagent.list': 'subagentList',
    'approval.resolve': 'approvalResolve'
  };
  const handlerName = methodMap[method];

  return handlerName ? { handled: true, result: context.call(handlerName, params) } : { handled: false };
}
