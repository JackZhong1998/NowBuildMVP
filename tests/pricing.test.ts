import { describe, expect, it } from 'vitest';
import { normalizeUsage, usageToCredits } from '@/lib/nowbuild/pricing';

describe('credit pricing', () => {
  it('charges a minimum credit for non-zero model cost', () => {
    expect(usageToCredits(normalizeUsage({ costUsd: 0.001 }), 2)).toBe(1);
  });

  it('applies the configured margin and rounds up', () => {
    expect(usageToCredits(normalizeUsage({ costUsd: 0.12 }), 2)).toBe(24);
  });

  it('keeps cache usage visible while sanitizing invalid token counts', () => {
    expect(normalizeUsage({ input: -2, output: 4.9, cacheRead: 100.7, costUsd: 0 })).toEqual({
      input: 0, output: 4, cacheRead: 100, cacheWrite: 0, costUsd: 0,
    });
  });
});
