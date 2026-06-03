import type { ReactElement } from 'react';

import { Alert, Title } from '@mantine/core';

import { IconLock } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';

import { EmptyState, ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { UsersTable } from '../../components/users';
import { useAuth } from '../../hooks';
import { queryKeys } from '../../lib/queries/keys';
import { useUsers } from '../../lib/queries/users';

export function UsersPage(): ReactElement {
  const { isAdmin } = useAuth();
  const { data: users, isLoading: loading, isError: error, error: errorObj, refetch } = useUsers();
  const queryClient = useQueryClient();
  const invalidateUsers = (): void => void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

  if (!isAdmin) {
    return (
      <UsersPageShell>
        <Alert icon={<IconLock size={16} />} title="Unauthorized" color="orange">
          You do not have permission to view this page.
        </Alert>
      </UsersPageShell>
    );
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={errorObj.message} onRetry={refetch} />;
  if (!users || users.length === 0)
    return (
      <UsersPageShell>
        <EmptyState message="No users found." />
      </UsersPageShell>
    );

  return (
    <UsersPageShell>
      <UsersTable users={users} isAdmin={isAdmin} onUserUpdated={invalidateUsers} />
    </UsersPageShell>
  );
}

function UsersPageShell({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <>
      <PageBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Users' }]} />
      <Title order={1} mb="md">
        Users
      </Title>
      {children}
    </>
  );
}
