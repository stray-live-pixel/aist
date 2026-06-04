import { Buffer } from 'node:buffer';

import type { AuxiliaryModelInvoker } from '../../../../core/entities/model/auxiliaryModel';
import type { IsolationGitFinalizeResult, IsolationGitFinalizeStage } from '../git/IsolationGitService';
import { createIsolationGitMetadata } from '../git/createIsolationGitMetadata';
import type { LocalDockerIsolationProvider } from '../LocalDockerIsolationProvider';
import { buildContainerFinalizeScript } from './buildContainerFinalizeScript';
import { parseContainerGitMetadata } from './parseContainerGitMetadata';

/**
 * Что это: финализирует изменения агента внутри container workspace.
 * Зачем нужно: после runtime daemon должен получить commit/head/PR metadata без локального worktree.
 * Какую продуктовую проблему решает: состояние review продолжает отображаться в VS Code, хотя код менялся и пушился из автономного контейнера.
 */
export async function finalizeContainerWorkspace({
  dockerProvider,
  containerName,
  branchName,
  prompt,
  fallbackAnswer,
  sessionId,
  onStage,
  auxiliaryModel
}: {
  dockerProvider: LocalDockerIsolationProvider;
  containerName: string;
  branchName: string;
  prompt: string;
  fallbackAnswer?: string;
  sessionId: string;
  onStage?: (stage: IsolationGitFinalizeStage, message: string) => Promise<void>;
  auxiliaryModel?: AuxiliaryModelInvoker;
}): Promise<IsolationGitFinalizeResult> {
  await onStage?.('committing', 'Creating commit inside autonomous container.');
  const result = await dockerProvider.exec({
    container: containerName,
    cwd: '.',
    timeoutMs: 300000,
    maxOutputChars: 2000000,
    script: buildContainerFinalizeScript({ branchName, prompt, fallbackAnswer, sessionId })
  });
  if (!result.ok) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'Container git finalize failed.');
  }

  const metadata = parseContainerGitMetadata({ stdout: result.stdout });
  if (metadata.changed === 'true' && auxiliaryModel && metadata.diffSummaryBase64) {
    await onStage?.('committing', await createReviewMetadataMessage({ auxiliaryModel, prompt, fallbackAnswer, sessionId, metadata }));
  }
  if (metadata.pushed === 'true') {
    await onStage?.('pushing', `Pushed branch ${branchName} from autonomous container.`);
  }
  if (metadata.prUrl || metadata.prError) {
    await onStage?.('creating_pr', metadata.prUrl ? 'Pull request is ready.' : 'Pull request creation was skipped.');
  }

  return {
    changed: metadata.changed === 'true',
    commitSha: metadata.commitSha || undefined,
    headSha: metadata.headSha || metadata.commitSha || undefined,
    pushed: metadata.pushed === 'true',
    prUrl: metadata.prUrl || undefined,
    prError: metadata.prError || undefined
  };
}

/**
 * Что это: генерирует review metadata по diff summary контейнера.
 * Зачем нужно: даже без host worktree daemon может использовать тот же auxiliary model для человекочитаемого описания изменений.
 * Какую продуктовую проблему решает: PR/лог сессии остаются информативными при автономном запуске в Docker или будущем remote runner.
 */
async function createReviewMetadataMessage({
  auxiliaryModel,
  prompt,
  fallbackAnswer,
  sessionId,
  metadata
}: {
  auxiliaryModel: AuxiliaryModelInvoker;
  prompt: string;
  fallbackAnswer?: string;
  sessionId: string;
  metadata: Record<string, string>;
}): Promise<string> {
  const diffSummary = Buffer.from(metadata.diffSummaryBase64 || '', 'base64').toString('utf8');
  const gitMetadata = await createIsolationGitMetadata({
    auxiliaryModel,
    prompt,
    fallbackAnswer,
    diffSummary,
    statusSummary: 'Container workspace changes were committed inside Docker.',
    sessionId
  });
  return `Prepared review metadata: ${gitMetadata.prTitle}`;
}
