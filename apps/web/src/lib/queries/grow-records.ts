import type { GrowRecord } from '@fazole/common';
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  createGrowRecord,
  fetchGrowRecord,
  fetchGrowRecords,
  updateGrowRecord,
} from '../firestore/grow-records';
import { queryKeys } from './keys';

type FetchOptions = Parameters<typeof fetchGrowRecords>[0];
type GrowResult = Awaited<ReturnType<typeof fetchGrowRecords>>;
type CreateData = Parameters<typeof createGrowRecord>[0];

export function useGrowRecords(options: FetchOptions = {}): UseQueryResult<GrowResult> {
  return useQuery({ queryKey: queryKeys.growRecords.query(options), queryFn: () => fetchGrowRecords(options) });
}

export function useGrowRecord(id: string): UseQueryResult<GrowRecord> {
  return useQuery({ queryKey: queryKeys.growRecords.detail(id), queryFn: () => fetchGrowRecord(id), enabled: !!id });
}

function useInvalidateGrowRecords(): () => void {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.growRecords.all });
    void qc.invalidateQueries({ queryKey: queryKeys.seasons.all });
    void qc.invalidateQueries({ queryKey: queryKeys.home.all });
  };
}

export function useCreateGrowRecord(): UseMutationResult<string, Error, CreateData> {
  const invalidate = useInvalidateGrowRecords();
  return useMutation({ mutationFn: (data: CreateData) => createGrowRecord(data), onSuccess: invalidate });
}

export function useUpdateGrowRecord(): UseMutationResult<void, Error, { id: string; data: Partial<GrowRecord> }> {
  const invalidate = useInvalidateGrowRecords();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GrowRecord> }) => updateGrowRecord(id, data),
    onSuccess: invalidate,
  });
}
