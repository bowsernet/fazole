import { type ReactElement, useState } from 'react';

import { Badge, Select, Table, Text } from '@mantine/core';

import type { User, UserRole } from '@fazole/common';

import { updateUserRole } from '../../lib';

interface UsersTableProps {
  users: User[];
  isAdmin: boolean;
  onUserUpdated: () => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' },
];

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'blue',
  user: 'gray',
};

export function UsersTable({ users, isAdmin, onUserUpdated }: UsersTableProps): ReactElement {
  return (
    <Table.ScrollContainer minWidth={400}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Display name</Table.Th>
            <Table.Th>Role</Table.Th>
            <Table.Th>Created at</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {users.map((user) => (
            <UsersTableRow key={user.id} user={user} isAdmin={isAdmin} onUserUpdated={onUserUpdated} />
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

interface UsersTableRowProps {
  user: User;
  isAdmin: boolean;
  onUserUpdated: () => void;
}

function UsersTableRow({ user, isAdmin, onUserUpdated }: UsersTableRowProps): ReactElement {
  const [updating, setUpdating] = useState(false);

  async function handleRoleChange(role: string | null): Promise<void> {
    if (!role || role === user.role) return;
    setUpdating(true);
    try {
      await updateUserRole(user.id, role as UserRole);
      onUserUpdated();
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Table.Tr>
      <Table.Td>
        <Text>{user.displayName}</Text>
      </Table.Td>
      <Table.Td>
        {isAdmin ? (
          <Select
            data={ROLE_OPTIONS}
            value={user.role}
            onChange={handleRoleChange}
            size="xs"
            w={120}
            disabled={updating}
          />
        ) : (
          <Badge color={ROLE_COLORS[user.role]} variant="light">
            {user.role}
          </Badge>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {formatDate(user.createdAt)}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
