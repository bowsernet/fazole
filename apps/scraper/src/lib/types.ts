import type { BeanColor, BeanSpecies, PlantType, PodType } from '@fazole/common';

export type Origin = 'bean' | 'network';

export interface PageRef {
  url: string;
  origin: Origin;
  pageId: string; // e.g. "bean-1", "network-7"
}

export interface ParsedBean {
  name: string;
  slug: string; // image filename without extension
  imageUrl: string; // absolute
  alt: string;
  packet: string; // raw "Packet Size 25 Seeds $5.00"
  rawDescription: string;
}

// Rule fields may be blank when the parser can't decide.
export interface RuleFields {
  species: BeanSpecies;
  plantType: PlantType | '';
  podType: PodType | '';
}

export interface LlmFields {
  species: BeanSpecies;
  plantType: PlantType;
  podType: PodType;
  beanColors: BeanColor[];
  notes: string;
}

export interface ScrapedBean extends ParsedBean {
  origin: Origin;
  pageId: string;
  rules: RuleFields;
  llm: LlmFields | null;
  llmError?: string;
}
