import { isValidBeanColor } from '@fazole/common';
import type { BeanColor, BeanSpecies, PlantType, PodType } from '@fazole/common';

import type { LlmFields, RuleFields } from './types';

const SPECIES: BeanSpecies[] = ['vulgaris', 'lima', 'scarlet'];
const PLANT_TYPES: PlantType[] = ['bush', 'semi', 'runner'];
const POD_TYPES: PodType[] = ['snap', 'dry'];

export function coerceExtraction(raw: unknown, rules: RuleFields): LlmFields {
  const o = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

  const species = SPECIES.includes(o['species'] as BeanSpecies)
    ? (o['species'] as BeanSpecies)
    : rules.species || 'vulgaris';
  const plantType = PLANT_TYPES.includes(o['plantType'] as PlantType)
    ? (o['plantType'] as PlantType)
    : rules.plantType || 'bush';
  const podType = POD_TYPES.includes(o['podType'] as PodType) ? (o['podType'] as PodType) : rules.podType || 'dry';

  const beanColors = Array.isArray(o['beanColors'])
    ? o['beanColors'].filter((c): c is BeanColor => typeof c === 'string' && isValidBeanColor(c))
    : [];

  return { species, plantType, podType, beanColors, notes: typeof o['notes'] === 'string' ? o['notes'] : '' };
}
