import { CodexAuthSessionProvider } from '../../../entities/model/codexAuth';
import { CodexResponsesTransport } from '../../../entities/model/codexTransport';
import type { ModelClient } from '../../../entities/model/modelTransport';
import type { AutonomousBackendContext } from './AutonomousBackendContext';
import { getCodexServiceTier } from './getCodexServiceTier';
import { getDefaultModel } from './getDefaultModel';

/**
 * Что это: создаёт ModelClient на базе CodexResponsesTransport для автономных engines.
 * Зачем нужно: autonomous flow/run могут использовать Codex transport тем же контрактом, что OpenRouter.
 * Какую продуктовую проблему решает: пользователь запускает автономные задачи через ChatGPT Codex auth из extension.
 */
export function createCodexEngineClient({ context }: { context: AutonomousBackendContext }): ModelClient {
  return {
    chat: async (messages, tools, modelOverride, signal, stream, lifecycle) => {
      const authProvider = new CodexAuthSessionProvider(context.secretStore, {
        fetch: context.fetch,
        logger: context.logger
      });
      if (!(await authProvider.isAuthenticated())) {
        throw new Error('ChatGPT Codex auth is not configured. Login through the VS Code extension first.');
      }

      const transport = new CodexResponsesTransport({
        tokenProvider: authProvider,
        fetch: context.fetch,
        logger: context.logger,
        defaultModel: modelOverride || (await getDefaultModel({ context })),
        serviceTier: await getCodexServiceTier({ context })
      });

      return transport.chat(messages, tools, modelOverride, signal, stream, lifecycle);
    }
  };
}
