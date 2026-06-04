import type { ContainerWorkspace, PrepareContainerWorkspaceInput } from './ContainerWorkspace';
import { buildContainerBootstrapScript } from './buildContainerBootstrapScript';
import { parseContainerGitMetadata } from './parseContainerGitMetadata';

/**
 * Что это: готовит автономный workspace внутри уже запущенного Docker container.
 * Зачем нужно: репозиторий клонируется из GitHub внутрь container filesystem, там же ставится AIST CLI и создаётся ветка.
 * Какую продуктовую проблему решает: host-компьютер больше не хранит рабочую копию агента и нужен только для запуска/наблюдения.
 */
export async function prepareContainerWorkspace(input: PrepareContainerWorkspaceInput): Promise<ContainerWorkspace> {
  const result = await input.dockerProvider.exec({
    container: input.containerName,
    cwd: '/',
    timeoutMs: 600000,
    maxOutputChars: 2000000,
    script: buildContainerBootstrapScript({ input })
  });
  if (!result.ok) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'Container workspace bootstrap failed.');
  }

  const metadata = parseContainerGitMetadata({ stdout: result.stdout });
  return {
    containerName: input.containerName,
    workspacePath: '/workspace',
    branchName: metadata.branch || input.branchName,
    baseRef: input.baseRef || 'HEAD',
    baseSha: metadata.baseSha || '',
    remoteName: 'origin',
    remoteUrl: metadata.remote || input.remoteUrl
  };
}
