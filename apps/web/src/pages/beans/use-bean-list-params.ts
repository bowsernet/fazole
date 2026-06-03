import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import type { BeanFiltersState, SortState } from '../../components/beans';
import { type BeanListState, parseParams, toSearchParams } from '../../lib/bean-list-params';

export interface UseBeanListParamsResult extends BeanListState {
  setFilters: (filters: BeanFiltersState) => void;
  setSort: (field: string) => void;
  setView: (view: string) => void;
  loadMore: () => void;
}

export function useBeanListParams(): UseBeanListParamsResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => parseParams(searchParams), [searchParams]);

  const setFilters = useCallback(
    (filters: BeanFiltersState): void => {
      setSearchParams(toSearchParams({ ...state, filters, loaded: 1 }));
    },
    [state, setSearchParams]
  );

  const setSort = useCallback(
    (field: string): void => {
      const next: SortState =
        state.sort.field === field
          ? { field, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' }
          : { field, dir: 'asc' };
      setSearchParams(toSearchParams({ ...state, sort: next, loaded: 1 }));
    },
    [state, setSearchParams]
  );

  const setView = useCallback(
    (view: string): void => {
      setSearchParams(toSearchParams({ ...state, view: view === 'table' ? 'table' : 'card' }));
    },
    [state, setSearchParams]
  );

  const loadMore = useCallback((): void => {
    setSearchParams(toSearchParams({ ...state, loaded: state.loaded + 1 }));
  }, [state, setSearchParams]);

  return { ...state, setFilters, setSort, setView, loadMore };
}
