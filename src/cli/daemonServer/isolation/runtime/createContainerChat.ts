import type { ChatModelSettings } from '../../../../core/shared/types/types';
import type { LocalDockerIsolationProvider } from '../LocalDockerIsolationProvider';

/**
 * Что это: создаёт chat storage внутри автономного контейнера и возвращает его id.
 * Зачем нужно: headless AIST CLI требует обычный chatId, но этот chat живёт только в container filesystem.
 * Какую продуктовую проблему решает: локальный daemon получает события по JSONL, не монтируя своё chat-хранилище в контейнер.
 */
export async function createContainerChat({
  dockerProvider,
  containerName,
  modelSettings
}: {
  dockerProvider: LocalDockerIsolationProvider;
  containerName: string;
  modelSettings: ChatModelSettings;
}): Promise<string> {
  const result = await dockerProvider.exec({
    container: containerName,
    script: `aist chat new --workspace /workspace --model ${shellQuote(modelSettings.model)} --json`,
    cwd: '/workspace',
    timeoutMs: 120000,
    maxOutputChars: 20000
  });
  if (!result.ok) {
    throw new Error(`Container chat creation failed: ${result.stderr || result.stdout || 'unknown error'}`);
  }

  const parsed = JSON.parse(result.stdout) as { chat?: { id?: unknown } };
  const chatId = parsed.chat?.id;
  if (typeof chatId !== 'string' || !chatId.trim()) {
    throw new Error('Container chat creation did not return chat.id.');
  }
  return chatId;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}
