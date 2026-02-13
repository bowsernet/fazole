import { useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { ActionIcon, Group, Table, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import type { GrowRecord } from '@fazole/common';
import { IconEdit, IconTrash } from '@tabler/icons-react';

import { restoreGrowRecord, softDeleteGrowRecord } from '../../lib/firestore/grow-records';

interface BeanGrowHistoryProps {
  records: GrowRecord[];
  isAdmin: boolean;
  onEdit: (record: GrowRecord) => void;
  onDeleted: () => void;
}

export function BeanGrowHistory({ records, isAdmin, onEdit, onDeleted }: BeanGrowHistoryProps): ReactElement {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleDelete(record: GrowRecord): Promise<void> {
    setDeletingId(record.id);
    try {
      await softDeleteGrowRecord(record.id);
      onDeleted();

      const notifId = `undo-grow-${record.id}`;
      notifications.show({
        id: notifId,
        title: 'Grow record deleted',
        message: `Year ${record.year} record deleted. Click to undo.`,
        color: 'orange',
        autoClose: 10000,
        onClick: async () => {
          if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
          await restoreGrowRecord(record.id);
          notifications.hide(notifId);
          onDeleted();
        },
      });

      undoTimerRef.current = setTimeout(() => {
        undoTimerRef.current = null;
      }, 10000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      notifications.show({ title: 'Error', message, color: 'red' });
    } finally {
      setDeletingId(null);
    }
  }

  if (records.length === 0) {
    return <Text c="dimmed">No grow records yet.</Text>;
  }

  return (
    <Table.ScrollContainer minWidth={700}>
      <Table striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Year</Table.Th>
            <Table.Th>Preplant</Table.Th>
            <Table.Th>Planted</Table.Th>
            <Table.Th>Sprouted</Table.Th>
            <Table.Th>Flowered</Table.Th>
            <Table.Th>Harvest Start</Table.Th>
            <Table.Th>Harvest End</Table.Th>
            {isAdmin && <Table.Th>Actions</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {records.map((record) => (
            <Table.Tr key={record.id}>
              <Table.Td fw={500}>{record.year}</Table.Td>
              <Table.Td>{formatDate(record.preplantDate)}</Table.Td>
              <Table.Td>{formatDate(record.plantDate)}</Table.Td>
              <Table.Td>{formatDate(record.sproutDate)}</Table.Td>
              <Table.Td>{formatDate(record.flowerDate)}</Table.Td>
              <Table.Td>{formatDate(record.harvestStartDate)}</Table.Td>
              <Table.Td>{formatDate(record.harvestEndDate)}</Table.Td>
              {isAdmin && (
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" color="blue" onClick={() => onEdit(record)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      loading={deletingId === record.id}
                      onClick={() => handleDelete(record)}
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

function formatDate(epoch?: number): string {
  if (!epoch) return '-';
  return new Date(epoch).toLocaleDateString();
}
