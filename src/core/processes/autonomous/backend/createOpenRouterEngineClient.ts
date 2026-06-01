import type { ModelClient } from '../../../entities/model/modelTransport';
import { OpenRouterTransport } from '../../../entities/model/openrouterTransport';
import type { AutonomousBackendContext } from './AutonomousBackendContext';
import { OPENROUTER_ENV_KEY } from './OPENROUTER_ENV_KEY';
import { getDefaultModel } from './getDefaultModel';
import { getOpenRouterApiKey } from './getOpenRouterApiKey';
import { getReasoningEffort } from './getReasoningEffort';
import { getStringSetting } from './getStringSetting';

/**
 * Что это: создаёт ModelClient на базе OpenRouterTransport для автономных engines.
 * Зачем нужно: flow/run engines работают через общий ModelClient contract.
 * Какую продуктовую проблему решает: автономный режим использует пользовательский OpenRouter ключ и настройки сайта/effort.
 */
export function createOpenRouterEngineClient({ context }: { context: AutonomousBackendContext }): ModelClient {
  return {
    chat: async (messages, tools, modelOverride, signal, stream, lifecycle) => {
      const apiKey = await getOpenRouterApiKey({ context });
      if (!apiKey) {
        throw new Error(
          `OpenRouter API key is not configured. Set ${OPENROUTER_ENV_KEY} or store a global auth secret.`
        );
      }

      const transport = new OpenRouterTransport({
        apiKey,
        fetch: context.fetch,
        logger: context.logger,
        siteUrl: await getStringSetting({ context, keys: ['openrouterAgent.siteUrl', 'siteUrl'] }),
        siteName: (await getStringSetting({ context, keys: ['openrouterAgent.siteName', 'siteName'] })) || 'aist',
        reasoningEffort: await getReasoningEffort({ context })
      });

      return transport.chat(
        messages,
        tools,
        modelOverride || (await getDefaultModel({ context })),
        signal,
        stream,
        lifecycle
      );
    }
  };
}
