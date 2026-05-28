import type { OpenRouterMessage, OpenRouterTool, ReasoningEffort } from '../../shared/types/types';
import type { ModelClient } from './modelTransport';

export type AuxiliaryModelRequest = {
  messages: OpenRouterMessage[];
  tools?: OpenRouterTool[];
  model?: string;
  reasoningEffort?: ReasoningEffort;
  signal?: AbortSignal;
};

export type AuxiliaryModelInvoker = {
  invoke(request: AuxiliaryModelRequest): Promise<OpenRouterMessage>;
};

export function createAuxiliaryModelInvoker(params: {
  defaultModel: string;
  defaultReasoningEffort?: ReasoningEffort;
  createClient(model: string, reasoningEffort?: ReasoningEffort): Promise<ModelClient>;
}): AuxiliaryModelInvoker {
  return {
    invoke: async (request) => {
      const model = request.model?.trim() || params.defaultModel;
      const reasoningEffort = request.reasoningEffort || params.defaultReasoningEffort;
      const client = await params.createClient(model, reasoningEffort);
      return client.chat(request.messages, request.tools, model, request.signal);
    }
  };
}
