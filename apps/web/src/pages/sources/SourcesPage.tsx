import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';

import { Button, Group, Stack, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

import type { Source } from '@fazole/common';

import { SourceForm, SourceTable } from '../../components/sources';
import { EmptyState, ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useAuth } from '../../hooks/use-auth';
import { useQuery } from '../../hooks/use-query';
import { fetchSources } from '../../lib/firestore/sources';

export function SourcesPage(): ReactElement {
  const { isAdmin } = useAuth();
  const { data: sources, loading, error, refetch } = useQuery(useCallback(() => fetchSources(), []));

  const [modalOpened, setModalOpened] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);

  function handleAdd(): void {
    setEditingSource(null);
    setModalOpened(true);
  }

  function handleEdit(source: Source): void {
    setEditingSource(source);
    setModalOpened(true);
  }

  function handleModalClose(): void {
    setModalOpened(false);
    setEditingSource(null);
  }

  function handleSuccess(): void {
    setModalOpened(false);
    setEditingSource(null);
    refetch();
  }

  return (
    <>
      <PageBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Sources' }]} />

      <Stack gap="md">
        <Group justify="space-between">
          <Title order={1}>Sources</Title>
          {isAdmin && (
            <Button leftSection={<IconPlus size={16} />} onClick={handleAdd}>
              Add Source
            </Button>
          )}
        </Group>

        {loading && <LoadingState />}
        {error && <ErrorState message={error.message} onRetry={refetch} />}
        {!loading && !error && sources?.length === 0 && <EmptyState message="No sources found." />}
        {!loading && !error && sources && sources.length > 0 && (
          <SourceTable sources={sources} isAdmin={isAdmin} onEdit={handleEdit} onDeleted={refetch} />
        )}
      </Stack>

      <SourceForm
        opened={modalOpened}
        source={editingSource}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
      />
    </>
  );
}
