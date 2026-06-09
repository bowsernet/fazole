import type { ReactElement } from 'react';
import { Link, useParams } from 'react-router';

import { Button, Group, Stack, Title } from '@mantine/core';

import { IconEdit, IconPlus } from '@tabler/icons-react';

import { BeanImageGallery, BeanProperties } from '../../components/beans';
import { GrowRecordTable } from '../../components/grow-records';
import { ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useAuth } from '../../hooks/use-auth';
import { useBean, useBeanImages } from '../../lib/queries/beans';
import { useGrowRecords, useInvalidateGrowRecords } from '../../lib/queries/grow-records';
import { useSource } from '../../lib/queries/sources';

export function BeanDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const invalidateGrow = useInvalidateGrowRecords();

  const { data: bean, isLoading, isError, error, refetch } = useBean(id ?? '');
  const { data: images } = useBeanImages(id ?? '');
  const { data: source } = useSource(bean?.sourceId);
  const { data: growResult } = useGrowRecords({ filters: { beanId: id }, sortField: 'year', sortDir: 'desc' });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!bean) return <ErrorState message="Bean not found" />;

  return (
    <>
      <PageBreadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'Beans', href: '/beans' }, { label: bean.name }]}
      />

      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>{bean.name}</Title>
          {isAdmin && (
            <Group>
              <Button
                variant="light"
                leftSection={<IconEdit size={16} />}
                component={Link}
                to={`/beans/${bean.id}/edit`}
              >
                Edit
              </Button>
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                component={Link}
                to={`/grow-records/new?beanId=${bean.id}`}
              >
                Add Grow Record
              </Button>
            </Group>
          )}
        </Group>

        <BeanImageGallery images={images ?? []} />

        <BeanProperties bean={bean} source={source ?? null} />

        <Title order={3}>Grow History</Title>
        <GrowRecordTable
          records={growResult?.records ?? []}
          beansMap={bean ? { [bean.id]: bean } : {}}
          isAdmin={isAdmin}
          onDeleted={invalidateGrow}
          showBean={false}
        />
      </Stack>
    </>
  );
}
