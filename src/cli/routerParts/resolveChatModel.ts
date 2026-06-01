import { FileBackedConfigStore } from '../../core/app/config/config';
import { DEFAULT_MODEL } from '../../core/entities/model/modelDefaults';
import { type JsonValue } from '../../core/shared/types/types';
import { RunCliOptions } from './RunCliOptions';
import { silentLogger } from './silentLogger';

export async function resolveChatModel(workspaceRoot: string, options: RunCliOptions): Promise<string> {
  const store = new FileBackedConfigStore({ workspaceRoot, homeDir: options.homeDir, logger: silentLogger });
  const configuredModel = await store.get<JsonValue>('model', DEFAULT_MODEL);
  return typeof configuredModel === 'string' && configuredModel.trim() ? configuredModel : DEFAULT_MODEL;
}
