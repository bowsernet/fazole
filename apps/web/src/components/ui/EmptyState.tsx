import type { ReactElement } from 'react';

import { Center, Text } from '@mantine/core';

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps): ReactElement {
  return (
    <Center py="xl">
      <Text c="dimmed">{message}</Text>
    </Center>
  );
}
