import { describe, expect, it } from 'vitest';

import { coerceExtraction } from '../lib/coerce-extraction';
import type { RuleFields } from '../lib/types';

const rules: RuleFields = { species: 'vulgaris', plantType: 'bush', podType: 'dry' };

describe('coerceExtraction', () => {
  it('keeps valid fields and valid colors (including blue)', () => {
    const r = coerceExtraction(
      { species: 'lima', plantType: 'runner', podType: 'snap', beanColors: ['white', 'blue'], notes: 'ok' },
      rules,
    );
    expect(r).toEqual({ species: 'lima', plantType: 'runner', podType: 'snap', beanColors: ['white', 'blue'], notes: 'ok' });
  });

  it('drops unknown colors instead of failing', () => {
    const r = coerceExtraction({ species: 'vulgaris', plantType: 'bush', podType: 'dry', beanColors: ['white', 'teal', 5], notes: '' }, rules);
    expect(r.beanColors).toEqual(['white']);
  });

  it('falls back to rules for invalid/missing fields', () => {
    const r = coerceExtraction({ species: 'bogus', beanColors: [] }, rules);
    expect(r.species).toBe('vulgaris');
    expect(r.plantType).toBe('bush');
    expect(r.podType).toBe('dry');
  });

  it('defaults blank rule fields (bush/dry) when both LLM and rules are empty', () => {
    const r = coerceExtraction({}, { species: 'lima', plantType: '', podType: '' });
    expect(r.plantType).toBe('bush');
    expect(r.podType).toBe('dry');
    expect(r.species).toBe('lima');
  });
});
