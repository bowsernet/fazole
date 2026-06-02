import { describe, expect, it } from 'vitest';

import { extractRules } from '../lib/extract-rules';
import type { ParsedBean } from '../lib/types';

function bean(rawDescription: string, extra: Partial<ParsedBean> = {}): ParsedBean {
  return { name: 'X', slug: 'x', imageUrl: '', alt: '', packet: '', rawDescription, ...extra };
}

describe('extractRules', () => {
  it('reads "Bush/Dry." as bush + dry, default species vulgaris', () => {
    const r = extractRules(bean('Bush/Dry. A robust variety without runners.'));
    expect(r).toEqual({ species: 'vulgaris', plantType: 'bush', podType: 'dry' });
  });

  it('treats "Pole lima." as lima species + runner, blank podType', () => {
    const r = extractRules(bean('Pole lima. Very productive climbing plant.'));
    expect(r).toEqual({ species: 'lima', plantType: 'runner', podType: '' });
  });

  it('detects scarlet only on explicit coccineus, with runner + snap', () => {
    const r = extractRules(bean('Runner/Snap. A vigorous Phaseolus coccineus with red flowers.'));
    expect(r).toEqual({ species: 'scarlet', plantType: 'runner', podType: 'snap' });
  });

  it('does not infer scarlet from the word "runner" alone', () => {
    expect(extractRules(bean('Runner/Dry. A tall climbing bean.')).species).toBe('vulgaris');
  });

  it('ignores "runner" appearing only in the description body', () => {
    // leading token is "Bush/Dry"; "runners" later must not flip plantType
    expect(extractRules(bean('Bush/Dry. Thrives without the need for runners.')).plantType).toBe('bush');
  });

  it('leaves fields blank when the leading token is unrecognized', () => {
    const r = extractRules(bean('A lovely heirloom with no type prefix.'));
    expect(r).toEqual({ species: 'vulgaris', plantType: '', podType: '' });
  });
});
