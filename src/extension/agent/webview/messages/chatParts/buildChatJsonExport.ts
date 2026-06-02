import { getPromptConfig } from '../../../config/agentConfigStore';
import { getAgentLanguage } from '../../../config/settings';
import { buildAgentSystemPrompt, getAgentInstructionSources } from '../../../config/systemPrompt';
import { governModelContext } from '../../../context/contextGovernor';
import { type WebviewSurface } from '../../../types';
import { type AgentWebviewMessageDeps } from '../types';

export function buildChatJsonExport(
  chat: NonNullable<ReturnType<AgentWebviewMessageDeps['chats']['getChat']>>,
  surface: WebviewSurface
) {
  const systemPrompt = buildAgentSystemPrompt();
  const governedContext = governModelContext({
    prompt: '<next user prompt will be inserted here>',
    history: chat.history
  });
  const promptConfig = getPromptConfig();
  const nextUserPromptPlaceholder = '<next user prompt will be inserted here>';
  const messagesSentToModel = [{ role: 'system' as const, content: systemPrompt }, ...governedContext.messages];

  return {
    exportedAt: new Date().toISOString(),
    exportKind: 'aist.chat-json.v1',
    note: 'nextPromptContext mirrors the next model request shape. The final user prompt is represented by a placeholder because it is not known until you press Send.',
    surface: {
      id: surface.id,
      kind: surface.kind,
      chatId: surface.getChatId()
    },
    chat,
    nextPromptContext: {
      model: chat.model,
      language: getAgentLanguage(),
      reasoningEffort: chat.modelSettings.reasoningEffort,
      codexServiceTier: chat.modelSettings.codexServiceTier,
      maxToolIterations: chat.modelSettings.maxToolIterations,
      systemPrompt,
      instructionSources: getAgentInstructionSources(),
      promptConfig: {
        activeInstructionRefs: promptConfig.activeInstructionRefs,
        activeModeRef: promptConfig.activeModeRef,
        activePresetId: promptConfig.activePresetId
      },
      contextGovernor: {
        mode: 'memory-only',
        historyPreserved: true,
        memoryInjectedAsToolResult: governedContext.messages.length > chat.history.length + 1
      },
      activeEditorContext: null,
      persistedHistorySentToModel: chat.history,
      nextUserPromptPlaceholder,
      messagesSentToModel
    }
  };
}
