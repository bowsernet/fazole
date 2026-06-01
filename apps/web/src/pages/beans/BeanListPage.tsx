import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { Button, Group, Pagination, SegmentedControl, SimpleGrid, Stack, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

import type { BeanColor, BeanImage, BeanSpecies, PlantType, PodType } from '@fazole/common';
import { PAGINATION_PAGE_SIZE } from '@fazole/config';
import { IconPlus } from '@tabler/icons-react';

import { BeanCard, BeanFilters, BeanTable } from '../../components/beans';
import type { BeanFiltersState, SortState } from '../../components/beans';
import { EmptyState, ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useAuth } from '../../hooks/use-auth';
import { useQuery } from '../../hooks/use-query';
import { selectBeans } from '../../lib/beans-select';
import { fetchAllBeans } from '../../lib/firestore/beans';
import { fetchBeanImages } from '../../lib/firestore/images';
import { fetchSources } from '../../lib/firestore/sources';

export function BeanListPage(): ReactElement {
  const { isAdmin } = useAuth();
  const [viewMode, setViewMode] = useState<string>('card');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' });
  const [filters, setFilters] = useState<BeanFiltersState>({
    species: null,
    podType: null,
    plantType: null,
    yearGrown: null,
    beanColor: null,
    sourceId: null,
  });

  const isLarge = useMediaQuery('(min-width: 75em)');

  const {
    data: allBeans,
    loading,
    error,
    refetch,
  } = useQuery(useCallback(() => fetchAllBeans(), []));

  const { beans, total } = useMemo(
    () =>
      selectBeans(allBeans ?? [], {
        filters: {
          species: (filters.species as BeanSpecies) ?? undefined,
          podType: (filters.podType as PodType) ?? undefined,
          plantType: (filters.plantType as PlantType) ?? undefined,
          yearGrown: filters.yearGrown ? Number(filters.yearGrown) : undefined,
          beanColor: (filters.beanColor as BeanColor) ?? undefined,
          sourceId: filters.sourceId ?? undefined,
        },
        sortField: sort.field,
        sortDir: sort.dir,
        page,
      }),
    [allBeans, filters, sort, page]
  );

  const { data: sources } = useQuery(useCallback(() => fetchSources(), []));

  const { data: imagesMap } = useQuery(
    useCallback(async () => {
      if (!beans.length) return {} as Record<string, BeanImage[]>;
      const entries = await Promise.all(
        beans.map(async (bean) => {
          const images = await fetchBeanImages(bean.id);
          return [bean.id, images] as const;
        })
      );
      return Object.fromEntries(entries) as Record<string, BeanImage[]>;
    }, [beans])
  );

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    (allBeans ?? []).forEach((b) => b.yearsGrown.forEach((y) => years.add(y)));
    return Array.from(years)
      .sort((a, b) => b - a)
      .map(String);
  }, [allBeans]);

  const totalPages = Math.ceil(total / PAGINATION_PAGE_SIZE);

  function handleSort(field: string): void {
    setSort((prev) =>
      prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' }
    );
    setPage(1);
  }

  function handleFiltersChange(newFilters: BeanFiltersState): void {
    setFilters(newFilters);
    setPage(1);
  }

  return (
    <>
      <PageBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Beans' }]} />

      <Stack gap="md">
        <Group justify="space-between">
          <Title order={1}>Beans</Title>
          <Group>
            <SegmentedControl
              value={viewMode}
              onChange={setViewMode}
              data={[
                { label: 'Cards', value: 'card' },
                { label: 'Table', value: 'table' },
              ]}
              size="sm"
            />
            {isAdmin && (
              <Button leftSection={<IconPlus size={16} />} component={Link} to="/beans/new">
                Add Bean
              </Button>
            )}
          </Group>
        </Group>

        {!isLarge && (
          <BeanFilters
            filters={filters}
            onChange={handleFiltersChange}
            sources={sources ?? []}
            yearOptions={yearOptions}
          />
        )}

        <Group align="flex-start" wrap="nowrap" gap="lg">
          {isLarge && (
            <BeanFilters
              filters={filters}
              onChange={handleFiltersChange}
              sources={sources ?? []}
              yearOptions={yearOptions}
            />
          )}

          <Stack gap="md" style={{ flex: 1, minWidth: 0 }}>
            {loading && <LoadingState />}
            {error && <ErrorState message={error.message} onRetry={refetch} />}
            {!loading && !error && beans.length === 0 && <EmptyState message="No beans found." />}

            {!loading && !error && beans.length > 0 && (
              <>
                {viewMode === 'card' ? (
                  <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 3 }} spacing="md">
                    {beans.map((bean) => (
                      <BeanCard key={bean.id} bean={bean} images={imagesMap?.[bean.id] ?? []} />
                    ))}
                  </SimpleGrid>
                ) : (
                  <BeanTable beans={beans} imagesMap={imagesMap ?? {}} sort={sort} onSort={handleSort} />
                )}

                {totalPages > 1 && (
                  <Group justify="center">
                    <Pagination value={page} onChange={setPage} total={totalPages} />
                  </Group>
                )}
              </>
            )}
          </Stack>
        </Group>
      </Stack>
    </>
  );
}
