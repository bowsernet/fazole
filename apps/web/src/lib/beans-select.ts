import type { Bean, BeanColor, BeanSpecies, PlantType, PodType } from '@fazole/common';
import { PAGINATION_PAGE_SIZE } from '@fazole/config';

export interface BeanFilters {
  search?: string;
  species?: BeanSpecies;
  podType?: PodType;
  plantType?: PlantType;
  yearGrown?: number;
  beanColors?: BeanColor[];
  sourceId?: string;
  grown?: 'yes' | 'no';
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
      matchesSearch(filters.search, bean) &&
      matches(filters.species, bean.species) &&
      matches(filters.podType, bean.podType) &&
      matches(filters.plantType, bean.plantType) &&
      matchesColors(filters.beanColors, bean) &&
      matches(filters.sourceId, bean.sourceId) &&
      (filters.yearGrown === undefined || bean.yearsGrown.includes(filters.yearGrown)) &&
      matchesGrown(filters.grown, bean)
  );
}

export function sortBeans(beans: Bean[], field: string, dir: 'asc' | 'desc'): Bean[] {
  const factor = dir === 'asc' ? 1 : -1;
  return [...beans].sort((a, b) => {
    const av = sortValue(a, field);
    const bv = sortValue(b, field);
    // Missing values (undefined or null) always sort last, independent of direction.
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return compare(av, bv) * factor;
  });
}

function sortValue(bean: Bean, field: string): string | number | null | undefined {
  return bean[field as keyof Bean] as string | number | null | undefined;
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

function matches<T>(filterValue: T | undefined, beanValue: T | undefined): boolean {
  return filterValue === undefined || beanValue === filterValue;
}

function matchesSearch(search: string | undefined, bean: Bean): boolean {
  const term = search?.trim().toLowerCase();
  if (!term) return true;
  return bean.name.toLowerCase().includes(term);
}

function matchesColors(selected: BeanColor[] | undefined, bean: Bean): boolean {
  if (!selected || selected.length === 0) return true;
  const beanColors = [bean.beanColor1, bean.beanColor2, bean.beanColor3];
  return selected.every((color) => beanColors.includes(color));
}

function matchesGrown(grown: 'yes' | 'no' | undefined, bean: Bean): boolean {
  if (grown === undefined) return true;
  // Missing/empty yearsGrown counts as never grown (0).
  const hasGrown = (bean.yearsGrown ?? []).length > 0;
  return grown === 'yes' ? hasGrown : !hasGrown;
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
