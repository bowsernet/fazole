import type { ReactElement } from 'react';

import { Title } from '@mantine/core';

import { PageBreadcrumbs } from '../../components/ui';

export function BeanDetailPage(): ReactElement {
  return (
    <>
      <PageBreadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'Beans', href: '/beans' }, { label: 'Detail' }]}
      />
      <Title order={1}>Bean Detail</Title>
    </>
  );
}
