import { describe, expect, it } from 'vitest';

import { computeSoftDeletes, dedupeByPreferBean } from '../lib/import-plan';
import type { CsvBean } from '../lib/scrape-csv';

function bean(name: string, origin: 'bean' | 'network'): CsvBean {
  return {
    name,
    origin,
    pageId: origin === 'bean' ? 'bean-1' : 'network-1',
    slug: name.toLowerCase(),
    imageUrl: '',
    localImagePath: '',
    alt: '',
    packet: '',
    rawDescription: '',
    rules: { species: 'vulgaris', plantType: '', podType: '' },
  };
}

describe('dedupeByPreferBean', () => {
  it('keeps the bean-page row when a name appears in both collections', () => {
    const out = dedupeByPreferBean([bean('Rattlesnake', 'network'), bean('Rattlesnake', 'bean'), bean('Hidatsa', 'network')]);
    expect(out).toHaveLength(2);
    const rattlesnake = out.find((b) => b.name === 'Rattlesnake');
    expect(rattlesnake?.origin).toBe('bean');
  });
});

describe('computeSoftDeletes', () => {
  it('returns existing ids that are absent from the scrape set', () => {
    expect(computeSoftDeletes(['a', 'b', 'c'], ['a', 'c'])).toEqual(['b']);
    expect(computeSoftDeletes(['a'], ['a'])).toEqual([]);
  });
});
