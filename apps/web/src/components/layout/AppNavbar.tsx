import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { Anchor, AppShell, Burger, Group, Menu, Stack } from '@mantine/core';

import { IconChevronDown } from '@tabler/icons-react';

import { useAuth } from '../../hooks/use-auth';
import { UserMenu } from './UserMenu';

interface AppNavbarProps {
  opened: boolean;
  onToggle: () => void;
}

export function AppNavbar({ opened, onToggle }: AppNavbarProps): ReactElement {
  const { isAdmin } = useAuth();

  return (
    <AppShell.Header>
      <Group h="100%" px="md" justify="space-between">
        <Group>
          <Burger opened={opened} onClick={onToggle} hiddenFrom="sm" size="sm" />
          <Anchor component={Link} to="/" fw={700} size="lg" underline="never">
            Fazole
          </Anchor>
        </Group>

        <Group gap="md" visibleFrom="sm">
          <NavLinks isAdmin={isAdmin} />
          <UserMenu />
        </Group>
      </Group>

      {/* Mobile nav */}
      <AppShell.Navbar p="md" hiddenFrom="sm">
        <Stack gap="sm">
          <NavLinks isAdmin={isAdmin} onNavigate={onToggle} />
          <UserMenu />
        </Stack>
      </AppShell.Navbar>
    </AppShell.Header>
  );
}

interface NavLinksProps {
  isAdmin: boolean;
  onNavigate?: () => void;
}

function NavLinks({ isAdmin, onNavigate }: NavLinksProps): ReactElement {
  return (
    <>
      <Anchor component={Link} to="/beans" onClick={onNavigate}>
        Beans
      </Anchor>
      <Anchor component={Link} to="/seasons" onClick={onNavigate}>
        Seasons
      </Anchor>
      <Anchor component={Link} to="/grow-records" onClick={onNavigate}>
        Grow Records
      </Anchor>
      {isAdmin && (
        <Menu trigger="hover" openDelay={100} closeDelay={200}>
          <Menu.Target>
            <Group gap={4} style={{ cursor: 'pointer' }}>
              <Anchor component="span">Admin</Anchor>
              <IconChevronDown size={14} />
            </Group>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item component={Link} to="/sources" onClick={onNavigate}>
              Sources
            </Menu.Item>
            <Menu.Item component={Link} to="/users" onClick={onNavigate}>
              Users
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </>
  );
}
