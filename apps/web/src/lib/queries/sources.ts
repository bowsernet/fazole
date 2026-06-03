import type { Source } from '@fazole/common';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { fetchSource, fetchSources } from '../firestore/sources';
import { queryKeys } from './keys';

export function useSources(): UseQueryResult<Source[]> {
  return useQuery({ queryKey: queryKeys.sources.all, queryFn: fetchSources });
}

export function useSource(id: string | undefined): UseQueryResult<Source> {
  return useQuery({ queryKey: queryKeys.sources.detail(id ?? ''), queryFn: () => fetchSource(id!), enabled: !!id });
}
