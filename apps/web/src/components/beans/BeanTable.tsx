import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Group, Image, Table, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react';

import type { Bean, BeanImage } from '@fazole/common';

export interface SortState {
  field: string;
  dir: 'asc' | 'desc';
}

interface BeanTableProps {
  beans: Bean[];
  imagesMap: Record<string, BeanImage[]>;
  sort: SortState;
  onSort: (field: string) => void;
}

export function BeanTable({ beans, imagesMap, sort, onSort }: BeanTableProps): ReactElement {
  const navigate = useNavigate();

  return (
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
        {beans.map((bean) => {
          const images = imagesMap[bean.id] ?? [];
          const thumbUrl = getThumbUrl(images);
          const lastYear = bean.yearsGrown.length > 0 ? Math.max(...bean.yearsGrown) : null;

          return (
            <Table.Tr
              key={bean.id}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/beans/${bean.id}`)}
            >
              <Table.Td>
                <Image
                  src={thumbUrl}
                  w={40}
                  h={40}
                  radius="sm"
                  fallbackSrc="https://placehold.co/160x160?text=-"
                  alt=""
                />
              </Table.Td>
              <Table.Td>
                <Text fw={500}>{bean.name}</Text>
              </Table.Td>
              <Table.Td>{bean.podType}</Table.Td>
              <Table.Td>{bean.plantType}</Table.Td>
              <Table.Td>{bean.beanSize ?? '-'}</Table.Td>
              <Table.Td>
                <BeanColorDisplay bean={bean} />
              </Table.Td>
              <Table.Td>{lastYear ?? '-'}</Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
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

function BeanColorDisplay({ bean }: { bean: Bean }): ReactElement {
  const colors = [bean.beanColor1, bean.beanColor2, bean.beanColor3].filter(Boolean);
  if (colors.length === 0) return <Text size="sm">-</Text>;

  return (
    <Group gap={4}>
      {colors.map((color, i) => (
        <Badge key={i} size="xs" color={mapBeanColorToMantine(color!)}>
          {color}
        </Badge>
      ))}
    </Group>
  );
}

function mapBeanColorToMantine(color: string): string {
  const map: Record<string, string> = {
    white: 'gray',
    yellow: 'yellow',
    brown: 'orange',
    pink: 'pink',
    red: 'red',
    purple: 'grape',
    black: 'dark',
  };
  return map[color] ?? 'gray';
}

function getThumbUrl(images: BeanImage[]): string | undefined {
  const closeup = images.find((img) => img.type === 'closeup');
  const source = images.find((img) => img.type === 'source');
  const preferred = closeup ?? source ?? images[0];
  return preferred?.urls.thumb_webp ?? undefined;
}
