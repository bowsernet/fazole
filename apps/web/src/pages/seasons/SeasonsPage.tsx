import { useCallback, type ReactElement } from 'react';

import { Title } from '@mantine/core';

import type { Bean, BeanImage, GrowRecord } from '@fazole/common';

import { SeasonsTable } from '../../components/seasons';
import { EmptyState, ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useQuery } from '../../hooks';
import { fetchBean, fetchBeanImages, fetchGrowRecords } from '../../lib';

interface SeasonsData {
  records: GrowRecord[];
  beansMap: Map<string, Bean>;
  imagesMap: Map<string, BeanImage[]>;
}

export function SeasonsPage(): ReactElement {
  const fetcher = useCallback(async (): Promise<SeasonsData> => {
    const { records } = await fetchGrowRecords({ sortField: 'year', sortDir: 'desc' });

    const uniqueBeanIds = [...new Set(records.map((r) => r.beanId))];

    const [beans, images] = await Promise.all([
      Promise.all(uniqueBeanIds.map((id) => fetchBean(id))),
      Promise.all(uniqueBeanIds.map((id) => fetchBeanImages(id))),
    ]);

    const beansMap = new Map(beans.map((b) => [b.id, b]));
    const imagesMap = new Map(uniqueBeanIds.map((id, i) => [id, images[i]!]));

    return { records, beansMap, imagesMap };
  }, []);

  const { data, loading, error, refetch } = useQuery(fetcher);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data || data.records.length === 0) return <SeasonsPageShell><EmptyState message="No seasons found." /></SeasonsPageShell>;

  return (
    <SeasonsPageShell>
      <SeasonsTable records={data.records} beansMap={data.beansMap} imagesMap={data.imagesMap} />
    </SeasonsPageShell>
  );
}

function SeasonsPageShell({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <>
      <PageBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Seasons' }]} />
      <Title order={1} mb="md">
        Seasons
      </Title>
      {children}
    </>
  );
}
