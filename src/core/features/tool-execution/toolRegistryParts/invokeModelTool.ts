import { type OpenRouterTool } from '../../../shared/types/types';

export const invokeModelTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'invoke_model',
    description:
      'Call the configured auxiliary lightweight AI model for a focused subtask. Use when a short independent answer, classification, extraction, rewrite, or summary is enough.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The focused prompt for the auxiliary model.'
        },
        system: {
          type: 'string',
          description: 'Optional system instruction for the auxiliary model.'
        },
        model: {
          type: 'string',
          description: 'Optional model override. Empty uses the configured auxiliary tool model.'
        },
        reasoningEffort: {
          type: 'string',
          enum: ['auto', 'low', 'medium', 'high'],
          description: 'Optional reasoning effort override for this auxiliary request.'
        },
        reason: {
          type: 'string',
          description: 'Short reason why the auxiliary model is needed now.'
        }
      },
      required: ['prompt']
    }
  }
};
