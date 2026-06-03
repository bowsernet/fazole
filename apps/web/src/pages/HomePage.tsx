import { type ReactElement, useMemo, useState } from 'react';

import { Select, SimpleGrid, Title } from '@mantine/core';

import type { Bean } from '@fazole/common';
import { useQuery } from '@tanstack/react-query';

import { BeanCard } from '../components/beans';
import { EmptyState, ErrorState, LoadingState } from '../components/ui';
import { fetchBean } from '../lib/firestore/beans';
import { fetchGrowRecords } from '../lib/firestore/grow-records';
import { queryKeys } from '../lib/queries/keys';

interface HomeData {
  beans: Bean[];
}

export function HomePage(): ReactElement {
  const defaultYear = getDefaultYear();
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);

  const yearOptions = useMemo(() => buildYearOptions(), []);

  const { data, isLoading, isError, error, refetch } = useQuery<HomeData>({
    queryKey: queryKeys.home.byYear(selectedYear),
    queryFn: async (): Promise<HomeData> => {
      const { records } = await fetchGrowRecords({ filters: { year: selectedYear } });
      const uniqueBeanIds = [...new Set(records.map((r) => r.beanId))];
      const beans = await Promise.all(uniqueBeanIds.map((id) => fetchBean(id)));
      return { beans };
    },
  });

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

      {isLoading && <LoadingState />}
      {isError && <ErrorState message={error.message} onRetry={refetch} />}
      {!isLoading && !isError && (!data || data.beans.length === 0) && (
        <EmptyState message="No beans grown this season." />
      )}

      {!isLoading && !isError && data && data.beans.length > 0 && (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="lg">
          {data.beans.map((bean) => (
            <BeanCard key={bean.id} bean={bean} />
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
