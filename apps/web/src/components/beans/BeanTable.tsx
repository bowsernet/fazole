import type { ReactElement } from 'react';

import { Group, Table, Text, UnstyledButton } from '@mantine/core';

import type { Bean } from '@fazole/common';
import { IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react';

import { BeanTableRow } from './BeanTableRow';

export interface SortState {
  field: string;
  dir: 'asc' | 'desc';
}

interface BeanTableProps {
  beans: Bean[];
  sort: SortState;
  onSort: (field: string) => void;
}

export function BeanTable({ beans, sort, onSort }: BeanTableProps): ReactElement {
  return (
    <Table.ScrollContainer minWidth={700}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={60} />
            <Table.Th>
              <SortableHeader field="name" label="Name" sort={sort} onSort={onSort} />
            </Table.Th>
            <Table.Th>Pod Type</Table.Th>
            <Table.Th>Plant Type</Table.Th>
            <Table.Th>
              <SortableHeader field="beanSize" label="Size" sort={sort} onSort={onSort} />
            </Table.Th>
            <Table.Th>Colors</Table.Th>
            <Table.Th>Last Year</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {beans.map((bean) => (
            <BeanTableRow key={bean.id} bean={bean} />
          ))}
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
