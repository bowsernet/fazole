import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Group, Image, Table, Text } from '@mantine/core';

import type { Bean, BeanImage } from '@fazole/common';

import { useBeanImages } from '../../lib/queries/beans';

interface BeanTableRowProps {
  bean: Bean;
}

export function BeanTableRow({ bean }: BeanTableRowProps): ReactElement {
  const navigate = useNavigate();
  const { data: images } = useBeanImages(bean.id);
  const thumbUrl = getThumbUrl(images ?? []);
  const lastYear = bean.yearsGrown.length > 0 ? Math.max(...bean.yearsGrown) : null;

  return (
    <Table.Tr style={{ cursor: 'pointer' }} onClick={() => navigate(`/beans/${bean.id}`)}>
      <Table.Td>
        <Image src={thumbUrl} w={40} h={40} radius="sm" fallbackSrc="https://placehold.co/160x160?text=-" alt="" />
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
    blue: 'blue',
    green: 'green',
  };
  return map[color] ?? 'gray';
}

function getThumbUrl(images: BeanImage[]): string | undefined {
  const closeup = images.find((img) => img.type === 'closeup');
  const source = images.find((img) => img.type === 'source');
  const preferred = closeup ?? source ?? images[0];
  return preferred?.urls.thumb_webp ?? undefined;
}
