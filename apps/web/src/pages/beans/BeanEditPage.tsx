import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Stack, Title } from '@mantine/core';

import type { BeanColor, BeanSpecies, PlantType, PodType } from '@fazole/common';

import { BeanForm, BeanImageManager } from '../../components/beans';
import type { BeanFormValues } from '../../components/beans/BeanForm';
import { ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useQuery } from '../../hooks/use-query';
import { createBean, fetchBean, updateBean } from '../../lib/firestore/beans';
import { fetchBeanImages } from '../../lib/firestore/images';
import { fetchSources } from '../../lib/firestore/sources';

export function BeanEditPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const {
    data: bean,
    loading: beanLoading,
    error: beanError,
  } = useQuery(
    useCallback(async () => {
      if (isNew) return null;
      return fetchBean(id);
    }, [id, isNew]),
  );

  const { data: sources } = useQuery(useCallback(() => fetchSources(), []));

  const {
    data: images,
    refetch: refetchImages,
  } = useQuery(
    useCallback(async () => {
      if (isNew) return [];
      return fetchBeanImages(id);
    }, [id, isNew]),
  );

  if (!isNew && beanLoading) return <LoadingState />;
  if (!isNew && beanError) return <ErrorState message={beanError.message} />;

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
      return createBean(data);
    }
    await updateBean(id, data);
  }

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

        {!isNew && id && (
          <BeanImageManager beanId={id} images={images ?? []} onChanged={refetchImages} />
        )}
      </Stack>
    </>
  );
}
