import { type BeanColor, isValidBeanColor } from '@fazole/common';

import type { BeanFiltersState, SortState } from '../components/beans';

export interface BeanListState {
  filters: BeanFiltersState;
  sort: SortState;
  view: 'card' | 'table';
  loaded: number;
}

const DEFAULT_SORT: SortState = { field: 'name', dir: 'asc' };

type StringFilterKey = Exclude<keyof BeanFiltersState, 'beanColors'>;

const FILTER_PARAMS: Record<StringFilterKey, string> = {
  search: 'q',
  species: 'species',
  podType: 'pod',
  plantType: 'plant',
  yearGrown: 'year',
  sourceId: 'source',
  grown: 'grown',
};

const COLOR_PARAM = 'color';

export function parseParams(params: URLSearchParams): BeanListState {
  const filters = { beanColors: parseColors(params.get(COLOR_PARAM)) } as BeanFiltersState;
  (Object.keys(FILTER_PARAMS) as StringFilterKey[]).forEach((key) => {
    filters[key] = params.get(FILTER_PARAMS[key]);
  });

  return {
    filters,
    sort: parseSort(params.get('sort')),
    view: params.get('view') === 'table' ? 'table' : 'card',
    loaded: parseLoaded(params.get('loaded')),
  };
}

export function toSearchParams(state: BeanListState): URLSearchParams {
  const params = new URLSearchParams();

  (Object.keys(FILTER_PARAMS) as StringFilterKey[]).forEach((key) => {
    const value = state.filters[key];
    if (value) params.set(FILTER_PARAMS[key], value);
  });

  if (state.filters.beanColors.length > 0) params.set(COLOR_PARAM, state.filters.beanColors.join(','));

  if (state.sort.field !== DEFAULT_SORT.field || state.sort.dir !== DEFAULT_SORT.dir) {
    params.set('sort', `${state.sort.field}.${state.sort.dir}`);
  }
  if (state.view !== 'card') params.set('view', state.view);
  if (state.loaded > 1) params.set('loaded', String(state.loaded));

  return params;
}

function parseColors(raw: string | null): BeanColor[] {
  if (!raw) return [];
  return raw.split(',').filter(isValidBeanColor);
}

function parseSort(raw: string | null): SortState {
  if (!raw) return DEFAULT_SORT;
  const [field, dir] = raw.split('.');
  if (!field || (dir !== 'asc' && dir !== 'desc')) return DEFAULT_SORT;
  return { field, dir };
}

function parseLoaded(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}
