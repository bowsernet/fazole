import type { Bean, BeanImage } from '@fazole/common';
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { createBean, fetchAllBeans, fetchBean, updateBean } from '../firestore/beans';
import { fetchBeanImages } from '../firestore/images';
import { queryKeys } from './keys';

type CreateBeanData = Parameters<typeof createBean>[0];

export function useBeans(): UseQueryResult<Bean[]> {
  return useQuery({ queryKey: queryKeys.beans.all, queryFn: fetchAllBeans });
}

export function useBean(id: string): UseQueryResult<Bean> {
  return useQuery({ queryKey: queryKeys.beans.detail(id), queryFn: () => fetchBean(id), enabled: !!id });
}

export function useBeanImages(id: string): UseQueryResult<BeanImage[]> {
  return useQuery({ queryKey: queryKeys.beans.images(id), queryFn: () => fetchBeanImages(id), enabled: !!id });
}

export function useCreateBean(): UseMutationResult<string, Error, CreateBeanData> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBeanData) => createBean(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.beans.all });
      void qc.invalidateQueries({ queryKey: queryKeys.seasons.all });
      void qc.invalidateQueries({ queryKey: queryKeys.home.all });
    },
  });
}

export function useUpdateBean(): UseMutationResult<void, Error, { id: string; data: Partial<Bean> }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Bean> }) => updateBean(id, data),
    onSuccess: (_result, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.beans.all });
      void qc.invalidateQueries({ queryKey: queryKeys.beans.detail(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.seasons.all });
      void qc.invalidateQueries({ queryKey: queryKeys.home.all });
    },
  });
}
