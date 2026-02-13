import type { ReactElement } from 'react';

import { Alert, Title } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';

import { UsersTable } from '../../components/users';
import { EmptyState, ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useAuth, useQuery } from '../../hooks';
import { fetchUsers } from '../../lib';

export function UsersPage(): ReactElement {
  const { isAdmin } = useAuth();
  const { data: users, loading, error, refetch } = useQuery(fetchUsers);

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
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!users || users.length === 0) return <UsersPageShell><EmptyState message="No users found." /></UsersPageShell>;

  return (
    <UsersPageShell>
      <UsersTable users={users} isAdmin={isAdmin} onUserUpdated={refetch} />
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
