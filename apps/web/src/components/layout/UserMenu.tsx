import type { ReactElement } from 'react';

import { Button, Menu, UnstyledButton, Text } from '@mantine/core';
import { IconLogout, IconUser } from '@tabler/icons-react';

import { useAuth } from '../../hooks/use-auth';

export function UserMenu(): ReactElement {
  const { firebaseUser, loading, signInWithGoogle, logOut } = useAuth();

  if (loading) return <></>;

  if (!firebaseUser) {
    return (
      <Button size="xs" variant="light" onClick={signInWithGoogle}>
        Sign in
      </Button>
    );
  }

  return (
    <Menu>
      <Menu.Target>
        <UnstyledButton>
          <Text size="sm" fw={500}>
            <IconUser size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            {firebaseUser.displayName ?? 'User'}
          </Text>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconLogout size={14} />} onClick={logOut}>
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
