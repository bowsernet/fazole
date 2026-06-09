import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { Anchor, Group, Image, SimpleGrid, Stack, Text, Title } from '@mantine/core';

import type { Bean, GrowRecord } from '@fazole/common';

import { getBeanThumbUrl } from '../../lib/bean-image-url';
import { epochToDisplayDate } from '../../lib/grow-record-dates';
import { useBeanImages } from '../../lib/queries/beans';

interface GrowRecordDetailProps {
  record: GrowRecord;
  bean?: Bean | null;
  showBean?: boolean;
}

export function GrowRecordDetail({ record, bean, showBean = true }: GrowRecordDetailProps): ReactElement {
  return (
    <Stack gap="lg">
      {showBean && bean && <BeanHeader bean={bean} />}

      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
        <Stat label="Year" value={record.year} />
        <Stat label="Plants" value={record.numPlanted ?? '-'} />
        <Stat label="Yield" value={record.yield != null ? `${record.yield} g` : '-'} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
        <Stat label="Preplant" value={epochToDisplayDate(record.preplantDate)} />
        <Stat label="Planted" value={epochToDisplayDate(record.plantDate)} />
        <Stat label="Sprouted" value={epochToDisplayDate(record.sproutDate)} />
        <Stat label="Flowered" value={epochToDisplayDate(record.flowerDate)} />
        <Stat label="Harvest Start" value={epochToDisplayDate(record.harvestStartDate)} />
        <Stat label="Harvest End" value={epochToDisplayDate(record.harvestEndDate)} />
      </SimpleGrid>

      <TextSection label="Location" value={record.location} />
      <TextSection label="Note" value={record.note} />
    </Stack>
  );
}

function BeanHeader({ bean }: { bean: Bean }): ReactElement {
  const { data: images } = useBeanImages(bean.id);

  return (
    <Group gap="sm" wrap="nowrap">
      <Image
        src={getBeanThumbUrl(images ?? [])}
        w={48}
        h={48}
        radius="sm"
        alt={bean.name}
        fallbackSrc="https://placehold.co/48?text=?"
      />
      <Anchor component={Link} to={`/beans/${bean.id}`} fw={600} fz="lg">
        {bean.name}
      </Anchor>
    </Group>
  );
}

function Stat({ label, value }: { label: string; value: string | number }): ReactElement {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase">
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Stack>
  );
}

function TextSection({ label, value }: { label: string; value?: string | null }): ReactElement | null {
  if (!value) return null;
  return (
    <Stack gap="xs">
      <Title order={5}>{label}</Title>
      <Text style={{ whiteSpace: 'pre-wrap' }}>{value}</Text>
    </Stack>
  );
}
