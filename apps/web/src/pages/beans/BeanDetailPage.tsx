import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Button, Group, Stack, Title } from '@mantine/core';
import { IconEdit, IconPlus } from '@tabler/icons-react';

import type { GrowRecord } from '@fazole/common';

import { BeanGrowHistory, BeanImageGallery, BeanProperties } from '../../components/beans';
import { ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useAuth } from '../../hooks/use-auth';
import { useQuery } from '../../hooks/use-query';
import { fetchBean } from '../../lib/firestore/beans';
import { fetchGrowRecords } from '../../lib/firestore/grow-records';
import { fetchBeanImages } from '../../lib/firestore/images';
import { fetchSource } from '../../lib/firestore/sources';

export function BeanDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const {
    data: bean,
    loading: beanLoading,
    error: beanError,
    refetch: refetchBean,
  } = useQuery(useCallback(() => fetchBean(id!), [id]));

  const { data: images } = useQuery(useCallback(() => fetchBeanImages(id!), [id]));

  const { data: source } = useQuery(
    useCallback(async () => {
      if (!bean?.sourceId) return null;
      try {
        return await fetchSource(bean.sourceId);
      } catch {
        return null;
      }
    }, [bean?.sourceId]),
  );

  const {
    data: growResult,
    refetch: refetchGrow,
  } = useQuery(
    useCallback(
      () => fetchGrowRecords({ filters: { beanId: id }, sortField: 'year', sortDir: 'desc' }),
      [id],
    ),
  );

  if (beanLoading) return <LoadingState />;
  if (beanError) return <ErrorState message={beanError.message} onRetry={refetchBean} />;
  if (!bean) return <ErrorState message="Bean not found" />;

  return (
    <>
      <PageBreadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Beans', href: '/beans' },
          { label: bean.name },
        ]}
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

        <BeanProperties bean={bean} source={source} />

        <Title order={3}>Grow History</Title>
        <BeanGrowHistory
          records={growResult?.records ?? []}
          isAdmin={isAdmin}
          onEdit={(record: GrowRecord) => navigate(`/grow-records/${record.id}/edit`)}
          onDeleted={refetchGrow}
        />
      </Stack>
    </>
  );
}
