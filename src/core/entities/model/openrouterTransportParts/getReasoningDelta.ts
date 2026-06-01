import { OpenRouterStreamDelta } from './OpenRouterStreamDelta';

export function getReasoningDelta(delta: OpenRouterStreamDelta): string {
  return (
    delta.reasoning || delta.reasoning_content || delta.reasoning_details?.map((item) => item.text || '').join('') || ''
  );
}
