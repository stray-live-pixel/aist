import { type ModelStreamCallbacks } from '../../../shared/types/types';
import { ModelRequestError } from '../modelErrors';
import { CodexOutputItem } from './CodexOutputItem';
import { CodexResponse } from './CodexResponse';
import { parseSseEvent } from './parseSseEvent';

export function handleCodexStreamEvent(
  chunk: string,
  context: {
    callbacks: ModelStreamCallbacks | undefined;
    endpoint: string;
    hasOutputText: boolean;
    model: string;
    outputItems: CodexOutputItem[];
    seenEventTypes: Set<string>;
  }
): { outputTextDelta: string; completedResponse?: CodexResponse } {
  const event = parseSseEvent(chunk);
  if (!event) {
    return { outputTextDelta: '' };
  }
  if (event.type) {
    context.seenEventTypes.add(event.type);
  }

  if (event.type === 'response.failed') {
    throw new ModelRequestError({
      provider: 'codex',
      model: context.model,
      endpoint: context.endpoint,
      method: 'POST',
      message: event.error?.message || 'ChatGPT Codex stream failed.'
    });
  }

  if (event.type === 'response.completed' && event.response) {
    return { outputTextDelta: '', completedResponse: event.response };
  }

  if (event.type === 'response.output_text.delta' && event.delta) {
    context.callbacks?.onContentDelta?.(event.delta);
    return { outputTextDelta: event.delta };
  }

  if (event.type === 'response.output_text.done' && event.text) {
    if (context.hasOutputText) {
      return { outputTextDelta: '' };
    }
    context.callbacks?.onContentDelta?.(event.text);
    return { outputTextDelta: event.text };
  }

  if (event.type === 'response.content_part.done' && event.part?.text) {
    context.callbacks?.onContentDelta?.(event.part.text);
    return { outputTextDelta: event.part.text };
  }

  if (event.type === 'response.output_item.done' && event.item) {
    context.outputItems.push(event.item);
  }

  return { outputTextDelta: '' };
}
