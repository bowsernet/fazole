import { useState } from 'react';
import type { ReactElement } from 'react';

import { ActionIcon, Anchor, Badge, Group, Table } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import type { Source } from '@fazole/common';
import { IconEdit, IconTrash } from '@tabler/icons-react';

import { callDeleteSource } from '../../lib/firestore/sources';

interface SourceTableProps {
  sources: Source[];
  isAdmin: boolean;
  onEdit: (source: Source) => void;
  onDeleted: () => void;
}

export function SourceTable({ sources, isAdmin, onEdit, onDeleted }: SourceTableProps): ReactElement {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(source: Source): Promise<void> {
    const confirmed = window.confirm(`Delete source "${source.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(source.id);
    try {
      await callDeleteSource(source.id);
      notifications.show({ title: 'Deleted', message: `Source "${source.name}" deleted.`, color: 'green' });
      onDeleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      notifications.show({ title: 'Error', message, color: 'red' });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Table.ScrollContainer minWidth={500}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Link</Table.Th>
            <Table.Th>Description</Table.Th>
            {isAdmin && <Table.Th>Actions</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sources.map((source) => (
            <Table.Tr key={source.id}>
              <Table.Td>
                <Badge color={source.color} variant="light">
                  {source.name}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Anchor href={source.link} target="_blank" rel="noopener noreferrer" size="sm">
                  {source.link}
                </Anchor>
              </Table.Td>
              <Table.Td>{source.description}</Table.Td>
              {isAdmin && (
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" color="blue" onClick={() => onEdit(source)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      loading={deletingId === source.id}
                      onClick={() => handleDelete(source)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              )}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
