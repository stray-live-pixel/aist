import { describe, expect, it } from 'vitest';

import { getPerformancePeriodKey } from './getPerformancePeriodKey';

describe('getPerformancePeriodKey', () => {
  it('returns stable UTC day and month keys', () => {
    const timestamp = Date.UTC(2025, 0, 3, 23, 30, 0);

    expect(getPerformancePeriodKey({ timestamp, period: 'day' })).toBe('2025-01-03');
    expect(getPerformancePeriodKey({ timestamp, period: 'month' })).toBe('2025-01');
  });

  it('uses ISO-like week keys across year boundary', () => {
    expect(getPerformancePeriodKey({ timestamp: Date.UTC(2024, 11, 30), period: 'week' })).toBe('2025-W01');
    expect(getPerformancePeriodKey({ timestamp: Date.UTC(2025, 0, 5), period: 'week' })).toBe('2025-W01');
    expect(getPerformancePeriodKey({ timestamp: Date.UTC(2025, 0, 6), period: 'week' })).toBe('2025-W02');
  });
});
