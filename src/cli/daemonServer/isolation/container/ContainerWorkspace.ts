import type { LocalDockerIsolationProvider } from '../LocalDockerIsolationProvider';

/**
 * Что это: описание репозитория, который живёт внутри автономного контейнера.
 * Зачем нужно: daemon хранит только метаданные для UI, а не монтирует локальные файлы в Docker.
 * Какую продуктовую проблему решает: isolated agent можно будет запускать на любой машине или удалённом runner без привязки к laptop пользователя.
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
 * Что это: параметры подготовки репозитория внутри контейнера.
 * Зачем нужно: clone/branch/bootstrap должны быть одной атомарной стадией lifecycle.
 * Какую продуктовую проблему решает: агент начинает работу в чистой копии GitHub-репозитория, а не в host worktree.
 */
export type PrepareContainerWorkspaceInput = {
  readonly dockerProvider: LocalDockerIsolationProvider;
  readonly containerName: string;
  readonly remoteUrl: string;
  readonly branchName: string;
  readonly baseRef?: string;
  readonly continueExisting: boolean;
};
