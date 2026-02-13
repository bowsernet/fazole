import type { ReactElement } from 'react';

import { Title } from '@mantine/core';

import { PageBreadcrumbs } from '../../components/ui';

export function SourcesPage(): ReactElement {
  return (
    <>
      <PageBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Sources' }]} />
      <Title order={1}>Sources</Title>
    </>
  );
}
