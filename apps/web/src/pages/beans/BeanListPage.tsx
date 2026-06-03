import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { Button, Group, SegmentedControl, SimpleGrid, Stack, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

import type { BeanColor, BeanSpecies, PlantType, PodType } from '@fazole/common';
import { IconPlus } from '@tabler/icons-react';

import { BeanCard, BeanFilters, BeanTable } from '../../components/beans';
import { EmptyState, ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useAuth } from '../../hooks/use-auth';
import { selectBeans } from '../../lib/beans-select';
import { useBeans } from '../../lib/queries/beans';
import { useSources } from '../../lib/queries/sources';
import { useBeanListParams } from './use-bean-list-params';

export function BeanListPage(): ReactElement {
  const { isAdmin } = useAuth();
  const isLarge = useMediaQuery('(min-width: 75em)');
  const { filters, sort, view, loaded, setFilters, setSort, setView, loadMore } = useBeanListParams();

  const { data: allBeans, isLoading, isError, error, refetch } = useBeans();
  const { data: sources } = useSources();

  const { beans, hasMore } = selectBeans(allBeans ?? [], {
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
    loaded,
  });

  const yearOptions = buildYearOptions(allBeans);

  return (
    <>
      <PageBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Beans' }]} />

      <Stack gap="md">
        <Group justify="space-between">
          <Title order={1}>Beans</Title>
          <Group>
            <SegmentedControl
              value={view}
              onChange={setView}
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
          <BeanFilters filters={filters} onChange={setFilters} sources={sources ?? []} yearOptions={yearOptions} />
        )}

        <Group align="flex-start" wrap="nowrap" gap="lg">
          {isLarge && (
            <BeanFilters filters={filters} onChange={setFilters} sources={sources ?? []} yearOptions={yearOptions} />
          )}

          <Stack gap="md" style={{ flex: 1, minWidth: 0 }}>
            {isLoading && <LoadingState />}
            {isError && <ErrorState message={error.message} onRetry={refetch} />}
            {!isLoading && !isError && beans.length === 0 && <EmptyState message="No beans found." />}

            {!isLoading && !isError && beans.length > 0 && (
              <>
                {view === 'card' ? (
                  <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 3 }} spacing="md">
                    {beans.map((bean) => (
                      <BeanCard key={bean.id} bean={bean} />
                    ))}
                  </SimpleGrid>
                ) : (
                  <BeanTable beans={beans} sort={sort} onSort={setSort} />
                )}

                {hasMore && (
                  <Group justify="center">
                    <Button variant="default" onClick={loadMore}>
                      Load more
                    </Button>
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

function buildYearOptions(allBeans: { yearsGrown: number[] }[] | undefined): string[] {
  const years = new Set<number>();
  (allBeans ?? []).forEach((b) => b.yearsGrown.forEach((y) => years.add(y)));
  return Array.from(years)
    .sort((a, b) => b - a)
    .map(String);
}
