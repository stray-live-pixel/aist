import { type ModelStreamCallbacks, type OpenRouterMessage } from '../../../shared/types/types';
import { type ModelTransportLogger } from '../modelTransport';
import { CodexOutputItem } from './CodexOutputItem';
import { CodexResponse } from './CodexResponse';
import { handleCodexStreamEvent } from './handleCodexStreamEvent';
import { logCodexUsageDiagnostics } from './logCodexUsageDiagnostics';
import { parseCodexResponse } from './parseCodexResponse';

export async function parseCodexStream(
  body: ReadableStream<Uint8Array>,
  callbacks: ModelStreamCallbacks | undefined,
  model: string,
  endpoint: string,
  logger: ModelTransportLogger | undefined
): Promise<OpenRouterMessage> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const outputItems: CodexOutputItem[] = [];
  const seenEventTypes = new Set<string>();
  let outputText = '';
  let completedResponse: CodexResponse | undefined;
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() || '';

    for (const part of parts) {
      const result = handleCodexStreamEvent(part, {
        callbacks,
        endpoint,
        model,
        hasOutputText: outputText.length > 0,
        outputItems,
        seenEventTypes
      });
      outputText += result.outputTextDelta;
      completedResponse = result.completedResponse || completedResponse;
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    const result = handleCodexStreamEvent(buffer, {
      callbacks,
      endpoint,
      model,
      hasOutputText: outputText.length > 0,
      outputItems,
      seenEventTypes
    });
    outputText += result.outputTextDelta;
    completedResponse = result.completedResponse || completedResponse;
  }

  callbacks?.onComplete?.();

  if (completedResponse) {
    const enrichedResponse: CodexResponse = {
      ...completedResponse,
      output_text: completedResponse.output_text || outputText,
      output: completedResponse.output?.length ? completedResponse.output : outputItems
    };
    logCodexUsageDiagnostics(logger, 'ChatGPT Codex stream completed', model, enrichedResponse.usage, true);

    try {
      return parseCodexResponse(enrichedResponse);
    } catch {
      if (outputText || outputItems.length) {
        return parseCodexResponse({
          output_text: outputText,
          output: outputItems
        });
      }
      throw new Error(
        `ChatGPT Codex returned an empty response. Stream events: ${[...seenEventTypes].join(', ') || 'none'}`
      );
    }
  }

  logCodexUsageDiagnostics(logger, 'ChatGPT Codex stream completed', model, undefined, true);
  return parseCodexResponse({
    output_text: outputText,
    output: outputItems
  });
}
