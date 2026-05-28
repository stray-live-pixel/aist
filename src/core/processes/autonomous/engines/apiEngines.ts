import type { ModelClient } from '../../../entities/model/modelTransport';
import type { ModelStreamCallbacks, OpenRouterMessage } from '../../../shared/types/types';
import { createAutonomousEvent } from '../storage/sessionStore';
import type { AutonomousEngine } from './types';

export type ApiEngineDeps = {
  openRouterClient: ModelClient;
  codexClient: ModelClient;
};

export function createOpenRouterApiEngine(client: ModelClient): AutonomousEngine {
  return createApiEngine({
    id: 'openrouter-api',
    label: 'OpenRouter API',
    client: (messages, model, signal, stream) => client.chat(messages, undefined, model, signal, stream)
  });
}

export function createCodexApiEngine(client: ModelClient): AutonomousEngine {
  return createApiEngine({
    id: 'codex-api',
    label: 'ChatGPT Codex API',
    requiresAuth: true,
    client: (messages, model, signal, stream) => client.chat(messages, undefined, model, signal, stream)
  });
}

function createApiEngine(options: {
  id: 'openrouter-api' | 'codex-api';
  label: string;
  requiresAuth?: boolean;
  client(
    messages: OpenRouterMessage[],
    model: string | undefined,
    signal: AbortSignal,
    stream: ModelStreamCallbacks
  ): Promise<OpenRouterMessage>;
}): AutonomousEngine {
  return {
    id: options.id,
    label: options.label,
    capabilities: { resume: false, fork: false, tools: false, requiresAuth: options.requiresAuth },
    async run(request) {
      const content: string[] = [];
      const reasoning: string[] = [];
      const stream: ModelStreamCallbacks = {
        onContentDelta(delta) {
          content.push(delta);
          void request.onEvent(createAutonomousEvent('ASSISTANT', delta, { stageIndex: request.stageIndex }));
        },
        onReasoningDelta(delta) {
          reasoning.push(delta);
          void request.onEvent(createAutonomousEvent('THINKING', delta, { stageIndex: request.stageIndex }));
        },
        onComplete() {
          void request.onEvent(
            createAutonomousEvent('DONE', `${options.label} stream completed.`, { stageIndex: request.stageIndex })
          );
        }
      };
      const response = await options.client(
        [{ role: 'user', content: request.prompt }],
        request.model,
        request.signal,
        stream
      );
      const result = response.content || content.join('') || reasoning.join('\n');
      return { result };
    }
  };
}
