import type { ReactElement } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import { Stack, Title } from '@mantine/core';

import { GrowRecordForm } from '../../components/grow-records';
import type { GrowRecordFormValues } from '../../components/grow-records/GrowRecordForm';
import { ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { dateStringToEpoch } from '../../lib/grow-record-dates';
import { useBeans } from '../../lib/queries/beans';
import { useCreateGrowRecord, useGrowRecord, useUpdateGrowRecord } from '../../lib/queries/grow-records';

export function GrowRecordEditPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const defaultBeanId = searchParams.get('beanId');

  const { data: record, isLoading: recordLoading, isError: recordError, error } = useGrowRecord(isNew ? '' : id!);
  const { data: beans } = useBeans();
  const createMutation = useCreateGrowRecord();
  const updateMutation = useUpdateGrowRecord();

  if (!isNew && recordLoading) return <LoadingState />;
  if (!isNew && recordError) return <ErrorState message={error.message} />;

  async function handleSave(values: GrowRecordFormValues): Promise<string | void> {
    const data = {
      beanId: values.beanId!,
      year: typeof values.year === 'number' ? values.year : Number(values.year),
      preplantDate: dateStringToEpoch(values.preplantDate),
      plantDate: dateStringToEpoch(values.plantDate),
      sproutDate: dateStringToEpoch(values.sproutDate),
      flowerDate: dateStringToEpoch(values.flowerDate),
      harvestStartDate: dateStringToEpoch(values.harvestStartDate),
      harvestEndDate: dateStringToEpoch(values.harvestEndDate),
      numPlanted: values.numPlanted === '' ? undefined : Number(values.numPlanted),
      yield: values.yield === '' ? undefined : Number(values.yield),
      location: values.location.trim() || undefined,
      note: values.note.trim() || undefined,
    };

    if (isNew) {
      return createMutation.mutateAsync(data);
    }
    await updateMutation.mutateAsync({ id: id!, data });
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
