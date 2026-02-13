import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import { Stack, Title } from '@mantine/core';

import { GrowRecordForm } from '../../components/grow-records';
import type { GrowRecordFormValues } from '../../components/grow-records/GrowRecordForm';
import { ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useQuery } from '../../hooks/use-query';
import { fetchAllBeans } from '../../lib/firestore/beans';
import { createGrowRecord, fetchGrowRecord, updateGrowRecord } from '../../lib/firestore/grow-records';

export function GrowRecordEditPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const defaultBeanId = searchParams.get('beanId');

  const {
    data: record,
    loading: recordLoading,
    error: recordError,
  } = useQuery(
    useCallback(async () => {
      if (isNew) return null;
      return fetchGrowRecord(id);
    }, [id, isNew])
  );

  const { data: beans } = useQuery(useCallback(() => fetchAllBeans(), []));

  if (!isNew && recordLoading) return <LoadingState />;
  if (!isNew && recordError) return <ErrorState message={recordError.message} />;

  async function handleSave(values: GrowRecordFormValues): Promise<string | void> {
    const data = {
      beanId: values.beanId!,
      year: typeof values.year === 'number' ? values.year : Number(values.year),
      preplantDate: dateToEpoch(values.preplantDate),
      plantDate: dateToEpoch(values.plantDate),
      sproutDate: dateToEpoch(values.sproutDate),
      flowerDate: dateToEpoch(values.flowerDate),
      harvestStartDate: dateToEpoch(values.harvestStartDate),
      harvestEndDate: dateToEpoch(values.harvestEndDate),
    };

    if (isNew) {
      return createGrowRecord(data);
    }
    await updateGrowRecord(id, data);
  }

  const breadcrumbItems = isNew
    ? [{ label: 'Home', href: '/' }, { label: 'Grow Records', href: '/grow-records' }, { label: 'New' }]
    : [
        { label: 'Home', href: '/' },
        { label: 'Grow Records', href: '/grow-records' },
        { label: `Year ${record?.year ?? ''}` },
        { label: 'Edit' },
      ];

  return (
    <>
      <PageBreadcrumbs items={breadcrumbItems} />

      <Stack gap="lg">
        <Title order={1}>{isNew ? 'New Grow Record' : 'Edit Grow Record'}</Title>

        <GrowRecordForm
          record={record}
          beans={beans ?? []}
          defaultBeanId={defaultBeanId}
          onSave={handleSave}
          onCancel={() => navigate('/grow-records')}
        />
      </Stack>
    </>
  );
}

function dateToEpoch(date: Date | null): number | undefined {
  if (!date) return undefined;
  return date.getTime();
}
