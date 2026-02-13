import type { ReactElement } from 'react';

import { Title } from '@mantine/core';

import { PageBreadcrumbs } from '../../components/ui';

export function BeanListPage(): ReactElement {
  return (
    <>
      <PageBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Beans' }]} />
      <Title order={1}>Beans</Title>
    </>
  );
}
