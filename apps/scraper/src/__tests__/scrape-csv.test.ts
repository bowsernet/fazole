import { describe, expect, it } from 'vitest';

import { stringify } from 'csv-stringify/sync';

import { SCRAPE_COLUMNS, parseScrapeCsv, toScrapeRow } from '../lib/scrape-csv';
import type { CsvBean } from '../lib/scrape-csv';

const bean: CsvBean = {
  name: 'Abundant Little Gem',
  origin: 'bean',
  pageId: 'bean-1',
  slug: 'abundant-little',
  imageUrl: 'https://x/abundant-little.jpg',
  localImagePath: '.scraper-cache/images/abundant-little.jpg',
  alt: 'pinto',
  packet: 'Packet Size 30 Seeds $5.00',
  rawDescription: 'Bush/Dry. Robust, with commas, and\nnewlines.',
  rules: { species: 'vulgaris', plantType: 'bush', podType: 'dry' },
};

describe('scrape-csv', () => {
  it('round-trips a bean through stringify + parse', () => {
    const csv = stringify([toScrapeRow(bean)], { header: true, columns: [...SCRAPE_COLUMNS] });
    const [parsed] = parseScrapeCsv(csv);
    expect(parsed).toEqual(bean);
  });

  it('parses blank rule fields back to empty strings', () => {
    const blanked: CsvBean = { ...bean, rules: { species: 'lima', plantType: '', podType: '' } };
    const csv = stringify([toScrapeRow(blanked)], { header: true, columns: [...SCRAPE_COLUMNS] });
    expect(parseScrapeCsv(csv)[0]?.rules).toEqual({ species: 'lima', plantType: '', podType: '' });
  });
});
