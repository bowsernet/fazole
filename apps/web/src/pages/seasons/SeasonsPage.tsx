import { type ReactElement } from 'react';

import { Title } from '@mantine/core';

import type { Bean, BeanImage, GrowRecord } from '@fazole/common';
import { useQuery } from '@tanstack/react-query';

import { SeasonsTable } from '../../components/seasons';
import { EmptyState, ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { fetchBean } from '../../lib/firestore/beans';
import { fetchBeanImages } from '../../lib/firestore/images';
import { fetchGrowRecords } from '../../lib/firestore/grow-records';
import { queryKeys } from '../../lib/queries/keys';

interface SeasonsData {
  records: GrowRecord[];
  beansMap: Map<string, Bean>;
  imagesMap: Map<string, BeanImage[]>;
}

export function SeasonsPage(): ReactElement {
  const { data, isLoading, isError, error, refetch } = useQuery<SeasonsData>({
    queryKey: queryKeys.seasons.all,
    queryFn: async (): Promise<SeasonsData> => {
      const { records } = await fetchGrowRecords({ sortField: 'year', sortDir: 'desc' });
      const uniqueBeanIds = [...new Set(records.map((r) => r.beanId))];
      const [beans, images] = await Promise.all([
        Promise.all(uniqueBeanIds.map((id) => fetchBean(id))),
        Promise.all(uniqueBeanIds.map((id) => fetchBeanImages(id))),
      ]);
      const beansMap = new Map(beans.map((b) => [b.id, b]));
      const imagesMap = new Map(uniqueBeanIds.map((id, i) => [id, images[i]!]));
      return { records, beansMap, imagesMap };
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data || data.records.length === 0)
    return (
      <SeasonsPageShell>
        <EmptyState message="No seasons found." />
      </SeasonsPageShell>
    );

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
