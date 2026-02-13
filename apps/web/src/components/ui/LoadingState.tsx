import type { ReactElement } from 'react';

import { Center, Loader } from '@mantine/core';

export function LoadingState(): ReactElement {
  return (
    <Center py="xl">
      <Loader />
    </Center>
  );
}
