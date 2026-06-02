import { describe, expect, it } from 'vitest';

import { computeOverlap, formatOverlapReport } from '../lib/overlap';

describe('computeOverlap', () => {
  const report = computeOverlap([
    { name: 'Cherokee Trail', origin: 'bean' },
    { name: 'cherokee  trail', origin: 'network' }, // same after normalization
    { name: 'Hidatsa', origin: 'bean' },
    { name: 'King of the Garden', origin: 'network' },
  ]);

  it('counts distinct names per origin', () => {
    expect(report.beanCount).toBe(2);
    expect(report.networkCount).toBe(2);
  });

  it('finds names present in both, normalized', () => {
    expect(report.overlapCount).toBe(1);
    expect(report.overlapNames).toEqual(['cherokee trail']);
  });

  it('computes overlap as a percentage of network names', () => {
    expect(report.overlapPctOfNetwork).toBe(50);
  });

  it('handles zero network names without dividing by zero', () => {
    const r = computeOverlap([{ name: 'Solo', origin: 'bean' }]);
    expect(r.overlapPctOfNetwork).toBe(0);
  });
});

describe('formatOverlapReport', () => {
  it('renders markdown with the headline numbers', () => {
    const md = formatOverlapReport({
      beanCount: 2,
      networkCount: 2,
      overlapCount: 1,
      overlapNames: ['cherokee trail'],
      overlapPctOfNetwork: 50,
    });
    expect(md).toContain('# ABCW Bean/Network Overlap');
    expect(md).toContain('Overlap: 1');
    expect(md).toContain('cherokee trail');
  });
});
