import type { ReactElement } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Button, Group, Stack, Title } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';

import type { GrowRecord } from '@fazole/common';
import { IconEdit, IconPlus } from '@tabler/icons-react';

import { BeanGrowHistory, BeanImageGallery, BeanProperties } from '../../components/beans';
import { ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useAuth } from '../../hooks/use-auth';
import { queryKeys } from '../../lib/queries/keys';
import { useBean, useBeanImages } from '../../lib/queries/beans';
import { useGrowRecords } from '../../lib/queries/grow-records';
import { useSource } from '../../lib/queries/sources';

export function BeanDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: bean, isLoading, isError, error, refetch } = useBean(id ?? '');
  const { data: images } = useBeanImages(id ?? '');
  const { data: source } = useSource(bean?.sourceId);
  const { data: growResult } = useGrowRecords({ filters: { beanId: id }, sortField: 'year', sortDir: 'desc' });

  const invalidateGrow = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.growRecords.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.seasons.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.home.all });
  };

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
        <BeanGrowHistory
          records={growResult?.records ?? []}
          isAdmin={isAdmin}
          onEdit={(record: GrowRecord) => navigate(`/grow-records/${record.id}/edit`)}
          onDeleted={invalidateGrow}
        />
      </Stack>
    </>
  );
}
