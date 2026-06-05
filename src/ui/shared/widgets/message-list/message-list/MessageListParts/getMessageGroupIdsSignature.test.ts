import { describe, expect, it } from 'vitest';

import { getMessageGroupIdsSignature } from './getMessageGroupIdsSignature';

describe('getMessageGroupIdsSignature', () => {
  it('keeps an empty chat dependency stable between renders', () => {
    const firstRender = getMessageGroupIdsSignature({ groupIds: [] });
    const nextRender = getMessageGroupIdsSignature({ groupIds: [] });

    expect(nextRender).toBe(firstRender);
  });

  it('changes only when message group ids change', () => {
    const firstRender = getMessageGroupIdsSignature({ groupIds: ['user:a', 'assistant:b'] });
    const nextRender = getMessageGroupIdsSignature({ groupIds: ['user:a', 'assistant:b', 'status:c'] });

    expect(nextRender).not.toBe(firstRender);
  });
});
