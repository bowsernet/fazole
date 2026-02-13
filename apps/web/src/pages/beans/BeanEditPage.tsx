import type { ReactElement } from 'react';

import { Title } from '@mantine/core';

import { PageBreadcrumbs } from '../../components/ui';

export function BeanEditPage(): ReactElement {
  return (
    <>
      <PageBreadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'Beans', href: '/beans' }, { label: 'Edit' }]}
      />
      <Title order={1}>Edit Bean</Title>
    </>
  );
}
