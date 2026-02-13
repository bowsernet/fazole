import type { ReactElement } from 'react';

import { Anchor, AppShell, Group, Text } from '@mantine/core';

export function AppFooter(): ReactElement {
  return (
    <AppShell.Footer>
      <Group h="100%" px="md" justify="center">
        <Text size="xs" c="dimmed">
          <Anchor href="https://c0decafe.dev" target="_blank" size="xs">
            c0decafe.dev
          </Anchor>
        </Text>
      </Group>
    </AppShell.Footer>
  );
}
