import { describe, expect, it } from 'vitest';

import { slugifyName } from '../lib/slug';

describe('slugifyName', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyName('Cherokee Trail of Tears')).toBe('cherokee-trail-of-tears');
  });

  it('drops punctuation and collapses separators', () => {
    expect(slugifyName('Bird Egg #2')).toBe('bird-egg-2');
    expect(slugifyName("Berry's Best")).toBe('berry-s-best');
  });

  it('trims surrounding whitespace and stray hyphens', () => {
    expect(slugifyName('  Fruhe  Goldbohne ')).toBe('fruhe-goldbohne');
  });

  it('strips diacritics', () => {
    expect(slugifyName('Café Crème')).toBe('cafe-creme');
  });
});
