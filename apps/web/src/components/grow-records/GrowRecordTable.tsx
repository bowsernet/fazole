import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { ActionIcon, Anchor, Group, Image, Modal, Table, Text, UnstyledButton } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import type { Bean, GrowRecord } from '@fazole/common';
import { IconChevronDown, IconChevronUp, IconEdit, IconEye, IconSelector, IconTrash } from '@tabler/icons-react';

import { getBeanThumbUrl } from '../../lib/bean-image-url';
import { restoreGrowRecord, softDeleteGrowRecord } from '../../lib/firestore/grow-records';
import { epochToDisplayDate } from '../../lib/grow-record-dates';
import { useBeanImages } from '../../lib/queries/beans';
import { GrowRecordDetail } from './GrowRecordDetail';

export interface SortState {
  field: string;
  dir: 'asc' | 'desc';
}

interface GrowRecordTableProps {
  records: GrowRecord[];
  beansMap: Record<string, Bean>;
  isAdmin: boolean;
  onDeleted: () => void;
  showBean?: boolean;
  sort?: SortState;
  onSort?: (field: string) => void;
}

export function GrowRecordTable({
  records,
  beansMap,
  isAdmin,
  onDeleted,
  showBean = true,
  sort,
  onSort,
}: GrowRecordTableProps): ReactElement {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<GrowRecord | null>(null);
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
    <>
      <Table.ScrollContainer minWidth={showBean ? 800 : 640}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              {showBean && (
                <>
                  <Table.Th w={56} />
                  <Table.Th>Bean</Table.Th>
                </>
              )}
              <Table.Th>
                {sort && onSort ? <SortableHeader field="year" label="Year" sort={sort} onSort={onSort} /> : 'Year'}
              </Table.Th>
              <Table.Th>Planted</Table.Th>
              <Table.Th>Harvest Start</Table.Th>
              <Table.Th>Plants</Table.Th>
              <Table.Th>Yield</Table.Th>
              <Table.Th>Location</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {records.map((record) => {
              const bean = beansMap[record.beanId];
              return (
                <Table.Tr key={record.id}>
                  {showBean && <BeanCells bean={bean} />}
                  <Table.Td fw={500}>{record.year}</Table.Td>
                  <Table.Td>{epochToDisplayDate(record.plantDate)}</Table.Td>
                  <Table.Td>{epochToDisplayDate(record.harvestStartDate)}</Table.Td>
                  <Table.Td>{record.numPlanted ?? '-'}</Table.Td>
                  <Table.Td>{record.yield != null ? `${record.yield} g` : '-'}</Table.Td>
                  <Table.Td>{formatText(record.location)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <ActionIcon variant="subtle" color="gray" onClick={() => setDetailRecord(record)}>
                        <IconEye size={16} />
                      </ActionIcon>
                      {isAdmin && (
                        <>
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            component={Link}
                            to={`/grow-records/${record.id}/edit`}
                          >
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
                        </>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Modal opened={detailRecord !== null} onClose={() => setDetailRecord(null)} title="Grow Record" size="lg">
        {detailRecord && (
          <GrowRecordDetail record={detailRecord} bean={beansMap[detailRecord.beanId]} showBean={showBean} />
        )}
      </Modal>
    </>
  );
}

function BeanCells({ bean }: { bean?: Bean }): ReactElement {
  const { data: images } = useBeanImages(bean?.id ?? '');

  if (!bean) {
    return (
      <>
        <Table.Td />
        <Table.Td>
          <Text c="dimmed" size="sm">
            Unknown
          </Text>
        </Table.Td>
      </>
    );
  }

  return (
    <>
      <Table.Td>
        <Image
          src={getBeanThumbUrl(images ?? [])}
          w={40}
          h={40}
          radius="sm"
          alt={bean.name}
          fallbackSrc="https://placehold.co/40?text=?"
        />
      </Table.Td>
      <Table.Td>
        <Anchor component={Link} to={`/beans/${bean.id}`} fw={500}>
          {bean.name}
        </Anchor>
      </Table.Td>
    </>
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

function formatText(value?: string | null): ReactElement {
  if (!value) return <>-</>;
  return (
    <Text size="sm" lineClamp={2} maw={200} style={{ whiteSpace: 'pre-wrap' }}>
      {value}
    </Text>
  );
}
