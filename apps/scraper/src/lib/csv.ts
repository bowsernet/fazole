import type { ScrapedBean } from './types';

export const CSV_COLUMNS = [
  'name',
  'origin',
  'pageId',
  'slug',
  'imageUrl',
  'packet',
  'rawDescription',
  'rules_species',
  'rules_plantType',
  'rules_podType',
  'llm_species',
  'llm_plantType',
  'llm_podType',
  'llm_beanColors',
  'llm_notes',
] as const;

export function toCsvRow(bean: ScrapedBean): Record<string, string> {
  const { llm } = bean;
  return {
    name: bean.name,
    origin: bean.origin,
    pageId: bean.pageId,
    slug: bean.slug,
    imageUrl: bean.imageUrl,
    packet: bean.packet,
    rawDescription: bean.rawDescription,
    rules_species: bean.rules.species,
    rules_plantType: bean.rules.plantType,
    rules_podType: bean.rules.podType,
    llm_species: llm?.species ?? '',
    llm_plantType: llm?.plantType ?? '',
    llm_podType: llm?.podType ?? '',
    llm_beanColors: llm ? llm.beanColors.join('; ') : '',
    llm_notes: llm ? llm.notes : bean.llmError ? `extraction failed: ${bean.llmError}` : '',
  };
}
