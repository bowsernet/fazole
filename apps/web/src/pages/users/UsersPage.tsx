import type { ReactElement } from 'react';

import { Title } from '@mantine/core';

import { PageBreadcrumbs } from '../../components/ui';

export function UsersPage(): ReactElement {
  return (
    <>
      <PageBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Users' }]} />
      <Title order={1}>Users</Title>
    </>
  );
}
