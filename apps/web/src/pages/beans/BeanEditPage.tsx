import type { ReactElement } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Stack, Title } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';

import type { BeanColor, BeanSpecies, PlantType, PodType } from '@fazole/common';

import { BeanForm, BeanImageManager } from '../../components/beans';
import type { BeanFormValues } from '../../components/beans/BeanForm';
import { ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useBean, useBeanImages, useCreateBean, useUpdateBean } from '../../lib/queries/beans';
import { queryKeys } from '../../lib/queries/keys';
import { useSources } from '../../lib/queries/sources';

export function BeanEditPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';
  const beanId = isNew ? '' : id;

  const { data: bean, isLoading: beanLoading, isError: beanError, error } = useBean(beanId);
  const { data: sources } = useSources();
  const { data: images } = useBeanImages(beanId);
  const createMutation = useCreateBean();
  const updateMutation = useUpdateBean();

  if (!isNew && beanLoading) return <LoadingState />;
  if (!isNew && beanError) return <ErrorState message={error.message} />;

  async function handleSave(values: BeanFormValues): Promise<string | void> {
    const data = {
      name: values.name,
      species: values.species as BeanSpecies,
      podType: values.podType as PodType,
      plantType: values.plantType as PlantType,
      beansPerPod: typeof values.beansPerPod === 'number' ? values.beansPerPod : undefined,
      beanSize: typeof values.beanSize === 'number' ? values.beanSize : undefined,
      beanWeight: typeof values.beanWeight === 'number' ? values.beanWeight : undefined,
      beanColor1: (values.beanColor1 as BeanColor) ?? undefined,
      beanColor2: (values.beanColor2 as BeanColor) ?? undefined,
      beanColor3: (values.beanColor3 as BeanColor) ?? undefined,
      sourceId: values.sourceId ?? '',
      description: values.description || undefined,
      sourceDescription: values.sourceDescription || undefined,
    };

    if (isNew) {
      return createMutation.mutateAsync(data);
    }
    await updateMutation.mutateAsync({ id: beanId, data });
  }

  const invalidateImages = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.beans.images(beanId) });
  };

  const breadcrumbItems = isNew
    ? [{ label: 'Home', href: '/' }, { label: 'Beans', href: '/beans' }, { label: 'New' }]
    : [
        { label: 'Home', href: '/' },
        { label: 'Beans', href: '/beans' },
        { label: bean?.name ?? 'Bean', href: `/beans/${id}` },
        { label: 'Edit' },
      ];

  return (
    <>
      <PageBreadcrumbs items={breadcrumbItems} />

      <Stack gap="lg">
        <Title order={1}>{isNew ? 'New Bean' : `Edit ${bean?.name ?? 'Bean'}`}</Title>

        <BeanForm
          bean={bean}
          sources={sources ?? []}
          onSave={handleSave}
          onCancel={() => navigate(isNew ? '/beans' : `/beans/${id}`)}
        />

        {!isNew && id && <BeanImageManager beanId={id} images={images ?? []} onChanged={invalidateImages} />}
      </Stack>
    </>
  );
}
