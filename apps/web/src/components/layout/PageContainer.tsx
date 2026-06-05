import type { ReactElement } from 'react';
import { Outlet } from 'react-router';

import { Container } from '@mantine/core';
import type { ContainerProps } from '@mantine/core';

interface PageContainerProps {
  size?: ContainerProps['size'];
}

export function PageContainer({ size = 'lg' }: PageContainerProps): ReactElement {
  return (
    <Container size={size}>
      <Outlet />
    </Container>
  );
}
