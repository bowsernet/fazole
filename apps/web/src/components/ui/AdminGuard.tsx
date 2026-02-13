import type { ReactElement, ReactNode } from 'react';

import { Alert, Center } from '@mantine/core';

import { IconLock } from '@tabler/icons-react';

import { useAuth } from '../../hooks/use-auth';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps): ReactElement {
  const { isAdmin, loading } = useAuth();

  if (loading) return <></>;
  if (!isAdmin) {
    return (
      <Center h="60vh">
        <Alert icon={<IconLock size={16} />} title="Unauthorized" color="red">
          You do not have permission to view this page.
        </Alert>
      </Center>
    );
  }

  return <>{children}</>;
}
