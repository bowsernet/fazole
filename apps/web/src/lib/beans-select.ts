import type { Bean, BeanColor, BeanSpecies, PlantType, PodType } from '@fazole/common';
import { PAGINATION_PAGE_SIZE } from '@fazole/config';

export interface BeanFilters {
  species?: BeanSpecies;
  podType?: PodType;
  plantType?: PlantType;
  yearGrown?: number;
  beanColor?: BeanColor;
  sourceId?: string;
}

export interface SelectBeansOptions {
  filters?: BeanFilters;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  loaded?: number;
  pageSize?: number;
}

export function selectBeans(
  beans: Bean[],
  options: SelectBeansOptions = {}
): { beans: Bean[]; total: number; hasMore: boolean } {
  const { filters = {}, sortField = 'name', sortDir = 'asc', loaded = 1, pageSize = PAGINATION_PAGE_SIZE } = options;

  const sorted = sortBeans(filterBeans(beans, filters), sortField, sortDir);
  const shown = sorted.slice(0, loaded * pageSize);

  return { beans: shown, total: sorted.length, hasMore: shown.length < sorted.length };
}

export function filterBeans(beans: Bean[], filters: BeanFilters): Bean[] {
  return beans.filter(
    (bean) =>
      matches(filters.species, bean.species) &&
      matches(filters.podType, bean.podType) &&
      matches(filters.plantType, bean.plantType) &&
      matches(filters.beanColor, bean.beanColor1) &&
      matches(filters.sourceId, bean.sourceId) &&
      (filters.yearGrown === undefined || bean.yearsGrown.includes(filters.yearGrown))
  );
}

export function sortBeans(beans: Bean[], field: string, dir: 'asc' | 'desc'): Bean[] {
  const factor = dir === 'asc' ? 1 : -1;
  return [...beans].sort((a, b) => {
    const av = sortValue(a, field);
    const bv = sortValue(b, field);
    // Missing values always sort last, independent of direction.
    if (av === undefined && bv === undefined) return 0;
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    return compare(av, bv) * factor;
  });
}

function sortValue(bean: Bean, field: string): string | number | undefined {
  return bean[field as keyof Bean] as string | number | undefined;
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

function matches<T>(filterValue: T | undefined, beanValue: T | undefined): boolean {
  return filterValue === undefined || beanValue === filterValue;
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
