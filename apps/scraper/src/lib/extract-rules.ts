import type { BeanSpecies, PlantType, PodType } from '@fazole/common';

import type { ParsedBean, RuleFields } from './types';

export function extractRules(bean: ParsedBean): RuleFields {
  const lead = bean.rawDescription.split('.')[0] ?? '';
  return {
    species: detectSpecies(bean.rawDescription),
    plantType: detectPlantType(lead),
    podType: detectPodType(lead),
  };
}

function detectSpecies(text: string): BeanSpecies {
  if (/coccineus|scarlet\s+runner/i.test(text)) return 'scarlet';
  if (/\blima\b/i.test(text)) return 'lima';
  return 'vulgaris';
}

function detectPlantType(lead: string): PlantType | '' {
  if (/semi/i.test(lead)) return 'semi';
  if (/pole|runner|climb/i.test(lead)) return 'runner';
  if (/bush/i.test(lead)) return 'bush';
  return '';
}

function detectPodType(lead: string): PodType | '' {
  if (/snap/i.test(lead)) return 'snap';
  if (/dry/i.test(lead)) return 'dry';
  return '';
}
