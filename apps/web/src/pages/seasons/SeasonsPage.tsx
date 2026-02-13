import type { ReactElement } from 'react';

import { Title } from '@mantine/core';

import { PageBreadcrumbs } from '../../components/ui';

export function SeasonsPage(): ReactElement {
  return (
    <>
      <PageBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Seasons' }]} />
      <Title order={1}>Seasons</Title>
    </>
  );
}
