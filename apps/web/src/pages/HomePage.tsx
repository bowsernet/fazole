import { useCallback, useMemo, useState, type ReactElement } from 'react';

import { Select, SimpleGrid, Title } from '@mantine/core';

import type { Bean, BeanImage, GrowRecord } from '@fazole/common';

import { BeanCard } from '../components/beans';
import { EmptyState, ErrorState, LoadingState } from '../components/ui';
import { useQuery } from '../hooks';
import { fetchBean, fetchBeanImages, fetchGrowRecords } from '../lib';

interface HomeData {
  records: GrowRecord[];
  beansMap: Map<string, Bean>;
  imagesMap: Map<string, BeanImage[]>;
}

export function HomePage(): ReactElement {
  const defaultYear = getDefaultYear();
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);

  const yearOptions = useMemo(() => buildYearOptions(), []);

  const fetcher = useCallback(async (): Promise<HomeData> => {
    const { records } = await fetchGrowRecords({ filters: { year: selectedYear } });

    const uniqueBeanIds = [...new Set(records.map((r) => r.beanId))];

    const [beans, images] = await Promise.all([
      Promise.all(uniqueBeanIds.map((id) => fetchBean(id))),
      Promise.all(uniqueBeanIds.map((id) => fetchBeanImages(id))),
    ]);

    const beansMap = new Map(beans.map((b) => [b.id, b]));
    const imagesMap = new Map(uniqueBeanIds.map((id, i) => [id, images[i]!]));

    return { records, beansMap, imagesMap };
  }, [selectedYear]);

  const { data, loading, error, refetch } = useQuery(fetcher, [selectedYear]);

  const title = selectedYear === new Date().getFullYear() ? 'Grown this year' : `Grown in ${selectedYear}`;

  return (
    <>
      <Title order={1} mb="md">
        {title}
      </Title>

      <Select
        label="Season"
        data={yearOptions}
        value={String(selectedYear)}
        onChange={(val) => val && setSelectedYear(Number(val))}
        w={120}
        mb="lg"
      />

      {loading && <LoadingState />}
      {error && <ErrorState message={error.message} onRetry={refetch} />}
      {!loading && !error && (!data || data.records.length === 0) && <EmptyState message="No beans grown this season." />}

      {!loading && !error && data && data.records.length > 0 && (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="lg">
          {[...data.beansMap.values()].map((bean) => (
            <BeanCard key={bean.id} bean={bean} images={data.imagesMap.get(bean.id) ?? []} />
          ))}
        </SimpleGrid>
      )}
    </>
  );
}

function getDefaultYear(): number {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed: 0=Jan, 5=Jun, 6=Jul
  const year = now.getFullYear();
  // Jan-June shows last year, Jul-Dec shows current year
  return month < 6 ? year - 1 : year;
}

function buildYearOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear();
  const options: { value: string; label: string }[] = [];
  for (let y = currentYear; y >= 2020; y--) {
    options.push({ value: String(y), label: String(y) });
  }
  return options;
}
