import type { BeanFiltersState, SortState } from '../components/beans';

export interface BeanListState {
  filters: BeanFiltersState;
  sort: SortState;
  view: 'card' | 'table';
  loaded: number;
}

const DEFAULT_SORT: SortState = { field: 'name', dir: 'asc' };

const FILTER_PARAMS: Record<keyof BeanFiltersState, string> = {
  species: 'species',
  podType: 'pod',
  plantType: 'plant',
  yearGrown: 'year',
  beanColor: 'color',
  sourceId: 'source',
};

export function parseParams(params: URLSearchParams): BeanListState {
  const filters = {} as BeanFiltersState;
  (Object.keys(FILTER_PARAMS) as (keyof BeanFiltersState)[]).forEach((key) => {
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

  (Object.keys(FILTER_PARAMS) as (keyof BeanFiltersState)[]).forEach((key) => {
    const value = state.filters[key];
    if (value) params.set(FILTER_PARAMS[key], value);
  });

  if (state.sort.field !== DEFAULT_SORT.field || state.sort.dir !== DEFAULT_SORT.dir) {
    params.set('sort', `${state.sort.field}.${state.sort.dir}`);
  }
  if (state.view !== 'card') params.set('view', state.view);
  if (state.loaded > 1) params.set('loaded', String(state.loaded));

  return params;
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
