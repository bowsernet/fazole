import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { ActionIcon, Anchor, Group, Table, Text, UnstyledButton } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import type { Bean, GrowRecord } from '@fazole/common';
import { IconChevronDown, IconChevronUp, IconEdit, IconSelector, IconTrash } from '@tabler/icons-react';

import { restoreGrowRecord, softDeleteGrowRecord } from '../../lib/firestore/grow-records';

export interface SortState {
  field: string;
  dir: 'asc' | 'desc';
}

interface GrowRecordTableProps {
  records: GrowRecord[];
  beansMap: Record<string, Bean>;
  sort: SortState;
  onSort: (field: string) => void;
  isAdmin: boolean;
  onDeleted: () => void;
}

export function GrowRecordTable({
  records,
  beansMap,
  sort,
  onSort,
  isAdmin,
  onDeleted,
}: GrowRecordTableProps): ReactElement {
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

  return (
    <Table.ScrollContainer minWidth={800}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Bean</Table.Th>
            <Table.Th>
              <SortableHeader field="year" label="Year" sort={sort} onSort={onSort} />
            </Table.Th>
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
          {records.map((record) => {
            const bean = beansMap[record.beanId];
            return (
              <Table.Tr key={record.id}>
                <Table.Td>
                  {bean ? (
                    <Anchor component={Link} to={`/beans/${bean.id}`} fw={500}>
                      {bean.name}
                    </Anchor>
                  ) : (
                    <Text c="dimmed" size="sm">
                      Unknown
                    </Text>
                  )}
                </Table.Td>
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
                      <ActionIcon variant="subtle" color="blue" component={Link} to={`/grow-records/${record.id}/edit`}>
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
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

interface SortableHeaderProps {
  field: string;
  label: string;
  sort: SortState;
  onSort: (field: string) => void;
}

function SortableHeader({ field, label, sort, onSort }: SortableHeaderProps): ReactElement {
  const Icon = sort.field === field ? (sort.dir === 'asc' ? IconChevronUp : IconChevronDown) : IconSelector;

  return (
    <UnstyledButton onClick={() => onSort(field)}>
      <Group gap={4} wrap="nowrap">
        <Text fw={700} size="sm">
          {label}
        </Text>
        <Icon size={14} />
      </Group>
    </UnstyledButton>
  );
}

function formatDate(epoch?: number | null): string {
  if (!epoch) return '-';
  return new Date(epoch).toLocaleDateString();
}
