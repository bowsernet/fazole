import type { ReactElement } from 'react';
import { Outlet } from 'react-router';

import { AppShell, Container } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

import { AppFooter } from './AppFooter';
import { AppNavbar } from './AppNavbar';

export function AppLayout(): ReactElement {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <AppShell
      header={{ height: 60 }}
      footer={{ height: 40 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { desktop: true, mobile: !opened } }}
      padding="md"
    >
      <AppNavbar opened={opened} onToggle={toggle} />
      <AppFooter />
      <AppShell.Main>
        <Container size="lg">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
