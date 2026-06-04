import type { IsolationExecutionProvider } from '../IsolationExecutionProvider';

/**
 * Что это: описание репозитория, который живёт внутри автономного runner.
 * Зачем нужно: daemon хранит только метаданные для UI, а не монтирует локальные файлы в Docker.
 * Какую продуктовую проблему решает: isolated agent можно запускать на локальном Docker или удалённом SSH-сервере без привязки к laptop пользователя.
 */
export type ContainerWorkspace = {
  readonly containerName: string;
  readonly workspacePath: string;
  readonly branchName: string;
  readonly baseRef: string;
  readonly baseSha: string;
  readonly remoteName?: string;
  readonly remoteUrl: string;
};

/**
 * Что это: параметры подготовки репозитория внутри выбранного runner.
 * Зачем нужно: clone/branch/bootstrap должны быть одной атомарной стадией lifecycle для Docker и SSH.
 * Какую продуктовую проблему решает: агент начинает работу в чистой копии GitHub-репозитория на выбранной машине.
 */
export type PrepareContainerWorkspaceInput = {
  readonly dockerProvider: IsolationExecutionProvider;
  readonly containerName: string;
  readonly workspacePath?: string;
  readonly remoteUrl: string;
  readonly branchName: string;
  readonly baseRef?: string;
  readonly continueExisting: boolean;
};
