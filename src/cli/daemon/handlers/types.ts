/**
 * Что это: контекст JSON-RPC handler-группы daemon.
 * Зачем нужно: dispatcher живёт в маленьких файлах, а детали состояния остаются внутри AistDaemonServer.
 * Какую проблему решает: разбиение по handler-группам не раскрывает приватные поля daemon и сохраняет инкапсуляцию.
 */
export type DaemonHandlerContext = {
  call(methodName: string, ...args: unknown[]): Promise<unknown>;
};

/**
 * Что это: результат попытки обработать JSON-RPC метод.
 * Зачем нужно: группы handlers можно вызывать цепочкой, пока одна не распознает метод.
 * Какую проблему решает: добавление новой группы не требует раздувать центральный switch.
 */
export type DaemonHandlerResult =
  | { readonly handled: true; readonly result: Promise<unknown> }
  | { readonly handled: false };
