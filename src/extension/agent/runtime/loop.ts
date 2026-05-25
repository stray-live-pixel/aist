import type { ChatStore } from '../../chats/chatStore';
import type { Chat, ChatUsageEstimate } from '../../chats/types';
import type { OpenRouterMessage, OpenRouterModelOption, OpenRouterTool } from '../../openrouter/types';
import type { AistLogger } from '../../shared/logger';
import { getAgentSkills } from '../../skills/skills';
import { getAgentSettingsSnapshot } from '../config/settingsSnapshot';
import type { AgentLoopResult, AgentRun } from '../types';
import { getPersistableHistory } from './runtime';
import { findRepeatedToolCall, getRepeatedToolCallAnswer, redactLargeArgs } from './toolCalls';
import { getAgentTools } from './tools';
import {
  createEmptyUsage,
  estimateMessageTokens,
  estimateMessagesTokens,
  getCallUsageEstimate,
  mergeUsage
} from './usage';

export type RunAgentLoopDeps = {
  chats: ChatStore;
  logger: AistLogger;
  getSystemPrompt(): string;
  getModelOption(modelId: string): OpenRouterModelOption | undefined;
  chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal
  ): Promise<OpenRouterMessage>;
  handleToolCall(
    chat: Chat,
    workingMessages: OpenRouterMessage[],
    toolCall: NonNullable<OpenRouterMessage['tool_calls']>[number],
    run: AgentRun
  ): Promise<void>;
  sendState(): void;
  throwIfStopped(run: AgentRun): void;
};

/**
 * Выполняет основной цикл агента: модель → tool calls → модель.
 *
 * Модуль отделен от контроллера, потому что это доменный сценарий агента, а не
 * lifecycle VS Code webview. Контроллер передает callbacks для транспорта,
 * UI-состояния и выполнения tool call, сохраняя направление зависимостей простым.
 */
export async function runAgentLoop(
  chat: Chat,
  initialHistory: OpenRouterMessage[],
  run: AgentRun,
  deps: RunAgentLoopDeps
): Promise<AgentLoopResult> {
  const { maxToolIterations } = getAgentSettingsSnapshot();
  const workingMessages = createWorkingMessages(deps.getSystemPrompt(), initialHistory);
  const model = deps.getModelOption(chat.model);
  const usage: ChatUsageEstimate = createEmptyUsage();
  const toolCallCounts = new Map<string, number>();
  const tools = getAgentTools(getAgentSkills());

  for (let iteration = 0; maxToolIterations === 0 || iteration < maxToolIterations; iteration += 1) {
    deps.throwIfStopped(run);
    deps.chats.setActivity(
      chat.id,
      'thinking',
      `Requesting model response${iteration > 0 ? ` after tool round ${iteration}` : ''}. Waiting for reasoning, text, or tool calls.`
    );
    deps.sendState();

    const responseMessage = await requestModel(chat, workingMessages, tools, run, deps, usage, model);
    const toolCalls = Array.isArray(responseMessage.tool_calls) ? responseMessage.tool_calls : [];

    if (!toolCalls.length) {
      deps.chats.setActivity(
        chat.id,
        'answering',
        getResponseDetail(responseMessage, 'Model returned a final answer. Preparing the chat message.')
      );
      deps.sendState();
      return finishWithAnswer(workingMessages, responseMessage.content || '', responseMessage.reasoning, usage);
    }

    const repeatedToolCall = findRepeatedToolCall(toolCalls, toolCallCounts);
    if (repeatedToolCall) {
      const answer = getRepeatedToolCallAnswer(repeatedToolCall);
      deps.logger.info('Stopping repeated tool-call loop', {
        chatId: chat.id,
        toolName: repeatedToolCall.toolName,
        count: repeatedToolCall.count,
        args: redactLargeArgs(repeatedToolCall.args)
      });
      return finishWithAnswer(workingMessages, answer, undefined, usage);
    }

    deps.chats.setActivity(
      chat.id,
      'thinking',
      getResponseDetail(responseMessage, `Model requested ${toolCalls.length} tool call(s). Preparing tool execution.`)
    );
    deps.sendState();

    workingMessages.push({
      role: 'assistant',
      content: responseMessage.content || '',
      reasoning: responseMessage.reasoning,
      tool_calls: toolCalls
    });

    for (const toolCall of toolCalls) {
      deps.throwIfStopped(run);
      await deps.handleToolCall(chat, workingMessages, toolCall, run);
    }

    deps.chats.setHistory(chat.id, getPersistableHistory(workingMessages));
  }

  return finishWithAnswer(
    workingMessages,
    'Stopped because the agent reached the tool iteration limit.',
    undefined,
    usage
  );
}

function createWorkingMessages(systemPrompt: string, initialHistory: OpenRouterMessage[]): OpenRouterMessage[] {
  return [{ role: 'system', content: systemPrompt }, ...initialHistory.filter((message) => message.role !== 'system')];
}

async function requestModel(
  chat: Chat,
  workingMessages: OpenRouterMessage[],
  tools: OpenRouterTool[],
  run: AgentRun,
  deps: RunAgentLoopDeps,
  usage: ChatUsageEstimate,
  model: OpenRouterModelOption | undefined
): Promise<OpenRouterMessage> {
  const promptTokens = estimateMessagesTokens(workingMessages);
  const responseMessage = await deps.chat(workingMessages, tools, chat.model, run.abortController.signal);
  const completionTokens = estimateMessageTokens(responseMessage);
  const callUsage = getCallUsageEstimate(promptTokens, completionTokens, model?.pricing);
  mergeUsage(usage, callUsage);
  deps.chats.addUsage(chat.id, callUsage);

  return responseMessage;
}

function getResponseDetail(message: OpenRouterMessage, fallback: string): string {
  const reasoning = normalizeText(message.reasoning);
  if (reasoning) {
    return `Reasoning: ${truncateDetail(reasoning)}`;
  }

  const content = normalizeText(message.content);
  if (content) {
    return `Answer draft: ${truncateDetail(content)}`;
  }

  return fallback;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function truncateDetail(value: string): string {
  return value.length > 220 ? `${value.slice(0, 217).trimEnd()}...` : value;
}

function finishWithAnswer(
  workingMessages: OpenRouterMessage[],
  answer: string,
  reasoning: OpenRouterMessage['reasoning'],
  usage: ChatUsageEstimate
): AgentLoopResult {
  workingMessages.push({ role: 'assistant', content: answer, reasoning });

  return {
    answer,
    history: getPersistableHistory(workingMessages),
    usage
  };
}
