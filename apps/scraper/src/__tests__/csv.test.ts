import { describe, expect, it } from 'vitest';

import { CSV_COLUMNS, toCsvRow } from '../lib/csv';
import type { ScrapedBean } from '../lib/types';

function base(): ScrapedBean {
  return {
    name: 'Abundant Little Gem',
    slug: 'abundant-little',
    imageUrl: 'https://x/abundant-little.jpg',
    alt: 'pinto',
    packet: 'Packet Size 30 Seeds $5.00',
    rawDescription: 'Bush/Dry. Robust.',
    origin: 'bean',
    pageId: 'bean-1',
    rules: { species: 'vulgaris', plantType: 'bush', podType: 'dry' },
    llm: null,
  };
}

describe('toCsvRow', () => {
  it('flattens an LLM result into the column keys', () => {
    const row = toCsvRow({
      ...base(),
      llm: { species: 'vulgaris', plantType: 'bush', podType: 'dry', beanColors: ['brown', 'white'], notes: 'ok' },
    });
    expect(row.name).toBe('Abundant Little Gem');
    expect(row.rules_plantType).toBe('bush');
    expect(row.llm_species).toBe('vulgaris');
    expect(row.llm_beanColors).toBe('brown; white');
    expect(row.llm_notes).toBe('ok');
  });

  it('renders a failed LLM extraction as blank columns with an error note', () => {
    const row = toCsvRow({ ...base(), llm: null, llmError: 'rate limited' });
    expect(row.llm_species).toBe('');
    expect(row.llm_beanColors).toBe('');
    expect(row.llm_notes).toBe('extraction failed: rate limited');
  });

  it('every column key in CSV_COLUMNS is present in a row', () => {
    const row = toCsvRow(base());
    for (const col of CSV_COLUMNS) {
      expect(row).toHaveProperty(col);
    }
  });
});
