import { describe, expect, it } from 'vitest';

import { parseMarkdownFrontmatter } from '../../../shared/lib/frontmatter';

describe('parseMarkdownFrontmatter', () => {
  it('parses scalars, multiline strings and object lists', () => {
    const parsed = parseMarkdownFrontmatter(`---
title: Example
repeat: 2
enabled: true
description: |
  line one
  line two
stages:
  - 1-plan.md
  - 2-build.md
contexts:
  - mode: summary-from
    from: 1
    summary_rules: |
      only facts
      no intro
---

# Body`);

    expect(parsed.attributes.title).toBe('Example');
    expect(parsed.attributes.repeat).toBe(2);
    expect(parsed.attributes.enabled).toBe(true);
    expect(parsed.attributes.description).toBe('line one\nline two');
    expect(parsed.attributes.stages).toEqual(['1-plan.md', '2-build.md']);
    expect(parsed.attributes.contexts).toEqual([
      { mode: 'summary-from', from: 1, summary_rules: 'only facts\nno intro' }
    ]);
    expect(parsed.body.trim()).toBe('# Body');
  });
});
