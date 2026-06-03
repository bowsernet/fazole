import { useState } from 'react';
import type { ReactElement } from 'react';

import { Button, Group, Stack, Title } from '@mantine/core';

import type { Source } from '@fazole/common';
import { IconPlus } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';

import { SourceForm, SourceTable } from '../../components/sources';
import { EmptyState, ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useAuth } from '../../hooks/use-auth';
import { queryKeys } from '../../lib/queries/keys';
import { useSources } from '../../lib/queries/sources';

export function SourcesPage(): ReactElement {
  const { isAdmin } = useAuth();
  const { data: sources, isLoading: loading, isError: error, error: errorObj, refetch } = useSources();
  const queryClient = useQueryClient();

  const invalidateSources = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.beans.all });
  };

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
    invalidateSources();
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
        {error && <ErrorState message={errorObj.message} onRetry={refetch} />}
        {!loading && !error && sources?.length === 0 && <EmptyState message="No sources found." />}
        {!loading && !error && sources && sources.length > 0 && (
          <SourceTable sources={sources} isAdmin={isAdmin} onEdit={handleEdit} onDeleted={invalidateSources} />
        )}
      </Stack>

      <SourceForm opened={modalOpened} source={editingSource} onClose={handleModalClose} onSuccess={handleSuccess} />
    </>
  );
}
