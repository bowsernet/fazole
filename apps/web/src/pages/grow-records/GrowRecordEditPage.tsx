import type { ReactElement } from 'react';

import { Title } from '@mantine/core';

import { PageBreadcrumbs } from '../../components/ui';

export function GrowRecordEditPage(): ReactElement {
  return (
    <>
      <PageBreadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'Grow Records', href: '/grow-records' }, { label: 'Edit' }]}
      />
      <Title order={1}>Edit Grow Record</Title>
    </>
  );
}
