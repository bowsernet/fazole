import type { ReactElement } from 'react';

import { Title } from '@mantine/core';

import { PageBreadcrumbs } from '../../components/ui';

export function GrowRecordListPage(): ReactElement {
  return (
    <>
      <PageBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Grow Records' }]} />
      <Title order={1}>Grow Records</Title>
    </>
  );
}
