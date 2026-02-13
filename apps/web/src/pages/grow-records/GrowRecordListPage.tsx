import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { Button, Group, Pagination, Stack, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';

import type { Bean } from '@fazole/common';
import { PAGINATION_PAGE_SIZE } from '@fazole/config';

import { GrowRecordFilters, GrowRecordTable } from '../../components/grow-records';
import type { GrowRecordFiltersState, SortState } from '../../components/grow-records';
import { EmptyState, ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useAuth } from '../../hooks/use-auth';
import { useQuery } from '../../hooks/use-query';
import { fetchAllBeans } from '../../lib/firestore/beans';
import { fetchGrowRecords } from '../../lib/firestore/grow-records';

export function GrowRecordListPage(): ReactElement {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ field: 'year', dir: 'desc' });
  const [filters, setFilters] = useState<GrowRecordFiltersState>({
    year: null,
    beanId: null,
  });

  const isLarge = useMediaQuery('(min-width: 75em)');

  const fetchOptions = useMemo(
    () => ({
      filters: {
        beanId: filters.beanId ?? undefined,
        year: filters.year ? Number(filters.year) : undefined,
      },
      sortField: sort.field,
      sortDir: sort.dir,
      page,
    }),
    [filters, sort, page],
  );

  const {
    data: recordsResult,
    loading,
    error,
    refetch,
  } = useQuery(useCallback(() => fetchGrowRecords(fetchOptions), [fetchOptions]));

  const { data: beans } = useQuery(useCallback(() => fetchAllBeans(), []));

  const beansMap = useMemo(() => {
    if (!beans) return {} as Record<string, Bean>;
    return Object.fromEntries(beans.map((b) => [b.id, b])) as Record<string, Bean>;
  }, [beans]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => String(currentYear - i));
  }, []);

  const totalPages = recordsResult ? Math.ceil(recordsResult.total / PAGINATION_PAGE_SIZE) : 0;

  function handleSort(field: string): void {
    setSort((prev) =>
      prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'desc' },
    );
    setPage(1);
  }

  function handleFiltersChange(newFilters: GrowRecordFiltersState): void {
    setFilters(newFilters);
    setPage(1);
  }

  return (
    <>
      <PageBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Grow Records' }]} />

      <Stack gap="md">
        <Group justify="space-between">
          <Title order={1}>Grow Records</Title>
          {isAdmin && (
            <Button leftSection={<IconPlus size={16} />} component={Link} to="/grow-records/new">
              Add Grow Record
            </Button>
          )}
        </Group>

        {!isLarge && (
          <GrowRecordFilters
            filters={filters}
            onChange={handleFiltersChange}
            beans={beans ?? []}
            yearOptions={yearOptions}
          />
        )}

        <Group align="flex-start" wrap="nowrap" gap="lg">
          {isLarge && (
            <GrowRecordFilters
              filters={filters}
              onChange={handleFiltersChange}
              beans={beans ?? []}
              yearOptions={yearOptions}
            />
          )}

          <Stack gap="md" style={{ flex: 1, minWidth: 0 }}>
            {loading && <LoadingState />}
            {error && <ErrorState message={error.message} onRetry={refetch} />}
            {!loading && !error && recordsResult?.records.length === 0 && (
              <EmptyState message="No grow records found." />
            )}

            {!loading && !error && recordsResult && recordsResult.records.length > 0 && (
              <>
                <GrowRecordTable
                  records={recordsResult.records}
                  beansMap={beansMap}
                  sort={sort}
                  onSort={handleSort}
                  isAdmin={isAdmin}
                  onDeleted={refetch}
                />

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
