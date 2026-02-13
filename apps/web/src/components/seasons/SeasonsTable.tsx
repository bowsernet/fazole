import type { ReactElement } from 'react';

import { Group, Table, Text } from '@mantine/core';

import type { Bean, BeanImage, GrowRecord } from '@fazole/common';

import { InlineBeanCard } from './InlineBeanCard';

interface SeasonRow {
  year: number;
  beanIds: string[];
}

interface SeasonsTableProps {
  records: GrowRecord[];
  beansMap: Map<string, Bean>;
  imagesMap: Map<string, BeanImage[]>;
}

export function SeasonsTable({ records, beansMap, imagesMap }: SeasonsTableProps): ReactElement {
  const rows = buildSeasonRows(records);

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Year</Table.Th>
          <Table.Th>Beans grown</Table.Th>
          <Table.Th>Beans</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row) => (
          <Table.Tr key={row.year}>
            <Table.Td>
              <Text fw={600}>{row.year}</Text>
            </Table.Td>
            <Table.Td>{row.beanIds.length}</Table.Td>
            <Table.Td>
              <Group gap="md" wrap="wrap">
                {row.beanIds.map((beanId) => {
                  const bean = beansMap.get(beanId);
                  if (!bean) return null;
                  return <InlineBeanCard key={beanId} bean={bean} images={imagesMap.get(beanId) ?? []} />;
                })}
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function buildSeasonRows(records: GrowRecord[]): SeasonRow[] {
  const byYear = new Map<number, Set<string>>();

  for (const record of records) {
    const existing = byYear.get(record.year);
    if (existing) {
      existing.add(record.beanId);
    } else {
      byYear.set(record.year, new Set([record.beanId]));
    }
  }

  return Array.from(byYear.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, beanIds]) => ({ year, beanIds: Array.from(beanIds) }));
}
