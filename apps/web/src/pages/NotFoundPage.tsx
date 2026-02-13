import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { Button, Center, Stack, Text, Title } from '@mantine/core';

export function NotFoundPage(): ReactElement {
  return (
    <Center h="60vh">
      <Stack align="center" gap="md">
        <Title order={1}>404</Title>
        <Text c="dimmed">Page not found</Text>
        <Button component={Link} to="/">
          Go Home
        </Button>
      </Stack>
    </Center>
  );
}
