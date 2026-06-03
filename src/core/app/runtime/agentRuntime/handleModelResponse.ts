import { contentToText } from '../../../entities/model/contentToText';
import { createEmptyUsage } from '../../../features/context/usage';
import {
  findRepeatedToolCall,
  getRepeatedToolCallAnswer,
  redactLargeArgs
} from '../../../features/tool-execution/toolCalls';
import type { AgentLoopResult, AgentRun, Chat, OpenRouterMessage } from '../../../shared/types/types';
import { getPersistableHistory } from '../stages/preparePrompt';
import { finishWithAnswer } from '../stages/runModelLoop';
import { createToolRunnerContext, emit, setActivity, throwIfStopped } from './actions';
import type { AgentRuntimeContext } from './context';
import { getResponseDetail } from './textDetails';

/**
 * Что это: обрабатывает один ответ модели внутри tool loop.
 * Зачем нужно: ответ может быть финальным, повторяющим tool-call или новым набором tool-calls.
 * Какую продуктовую проблему решает: loop агента завершает задачи предсказуемо и не застревает на повторяющихся tools.
 */
export async function handleModelResponse({
  context,
  chat,
  workingMessages,
  responseMessage,
  run,
  runId,
  usage,
  toolCallCounts
}: {
  context: AgentRuntimeContext;
  chat: Chat;
  workingMessages: OpenRouterMessage[];
  responseMessage: OpenRouterMessage;
  run: AgentRun<unknown>;
  runId: string;
  usage: ReturnType<typeof createEmptyUsage>;
  toolCallCounts: Map<string, number>;
}): Promise<AgentLoopResult | undefined> {
  const toolCalls = Array.isArray(responseMessage.tool_calls) ? responseMessage.tool_calls : [];
  context.deps.telemetry?.recordToolCalls?.(
    run.telemetry,
    toolCalls.map((toolCall) => toolCall.function.name)
  );
  if (!toolCalls.length) {
    if (!run.activityStream?.hasContent()) {
      await setActivity({
        context,
        runId,
        chatId: chat.id,
        activity: 'answering',
        detail: getResponseDetail({ message: responseMessage, text: context.text })
      });
    }
    return finishWithAnswer({
      workingMessages,
      answer: contentToText({ content: responseMessage.content }),
      reasoning: responseMessage.reasoning,
      usage
    });
  }

  const repeatedToolCall = findRepeatedToolCall(toolCalls, toolCallCounts);
  if (repeatedToolCall) {
    context.deps.telemetry?.recordRepeatedToolCall?.(run.telemetry);
    const answer = getRepeatedToolCallAnswer(repeatedToolCall);
    context.deps.logger.info('Stopping repeated tool-call loop', {
      chatId: chat.id,
      runId,
      toolName: repeatedToolCall.toolName,
      count: repeatedToolCall.count,
      args: redactLargeArgs(repeatedToolCall.args)
    });
    return finishWithAnswer({ workingMessages, answer, reasoning: undefined, usage });
  }

  await runToolCalls({ context, chat, workingMessages, responseMessage, run, runId, toolCalls });
  await context.deps.chatRepository.setHistory(chat.id, getPersistableHistory({ messages: workingMessages }));
  return undefined;
}

async function runToolCalls({
  context,
  chat,
  workingMessages,
  responseMessage,
  run,
  runId,
  toolCalls
}: {
  context: AgentRuntimeContext;
  chat: Chat;
  workingMessages: OpenRouterMessage[];
  responseMessage: OpenRouterMessage;
  run: AgentRun<unknown>;
  runId: string;
  toolCalls: NonNullable<OpenRouterMessage['tool_calls']>;
}): Promise<void> {
  await setActivity({
    context,
    runId,
    chatId: chat.id,
    activity: 'thinking',
    detail: getResponseDetail({
      message: responseMessage,
      text: context.text,
      fallback: context.text.modelRequestedTools(toolCalls.length)
    })
  });
  workingMessages.push({
    role: 'assistant',
    content: contentToText({ content: responseMessage.content }),
    reasoning: responseMessage.reasoning,
    tool_calls: toolCalls
  });
  for (const toolCall of toolCalls) {
    throwIfStopped({ run });
    await context.deps.handleToolCall({
      chat,
      workingMessages,
      toolCall,
      run,
      runId,
      context: createToolRunnerContext({ context, runId }),
      events: { emit: (event) => emit({ context, runId, event }) },
      runRepository: context.deps.runRepository
    });
  }
}
