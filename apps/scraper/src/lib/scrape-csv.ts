import type { BeanSpecies, PlantType, PodType } from '@fazole/common';
import { parse } from 'csv-parse/sync';

import type { Origin, RuleFields } from './types';

export interface CsvBean {
  name: string;
  origin: Origin;
  pageId: string;
  slug: string;
  imageUrl: string;
  localImagePath: string;
  alt: string;
  packet: string;
  rawDescription: string;
  rules: RuleFields;
}

export const SCRAPE_COLUMNS = [
  'name',
  'origin',
  'pageId',
  'slug',
  'imageUrl',
  'localImagePath',
  'alt',
  'packet',
  'rawDescription',
  'rules_species',
  'rules_plantType',
  'rules_podType',
] as const;

export function toScrapeRow(b: CsvBean): Record<string, string> {
  return {
    name: b.name,
    origin: b.origin,
    pageId: b.pageId,
    slug: b.slug,
    imageUrl: b.imageUrl,
    localImagePath: b.localImagePath,
    alt: b.alt,
    packet: b.packet,
    rawDescription: b.rawDescription,
    rules_species: b.rules.species,
    rules_plantType: b.rules.plantType,
    rules_podType: b.rules.podType,
  };
}

export function parseScrapeCsv(csv: string): CsvBean[] {
  const records = parse(csv, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  return records.map((r) => ({
    name: r['name'] ?? '',
    origin: (r['origin'] as Origin) ?? 'bean',
    pageId: r['pageId'] ?? '',
    slug: r['slug'] ?? '',
    imageUrl: r['imageUrl'] ?? '',
    localImagePath: r['localImagePath'] ?? '',
    alt: r['alt'] ?? '',
    packet: r['packet'] ?? '',
    rawDescription: r['rawDescription'] ?? '',
    rules: {
      species: (r['rules_species'] as BeanSpecies) ?? 'vulgaris',
      plantType: (r['rules_plantType'] as PlantType | '') ?? '',
      podType: (r['rules_podType'] as PodType | '') ?? '',
    },
  }));
}
