import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { Badge, Card, Group, Image, Text } from '@mantine/core';

import type { Bean, BeanImage } from '@fazole/common';

import { useBeanImages } from '../../lib/queries/beans';

interface BeanCardProps {
  bean: Bean;
}

export function BeanCard({ bean }: BeanCardProps): ReactElement {
  const { data: images } = useBeanImages(bean.id);
  const previewUrl = getPreviewUrl(images ?? []);
  const lastYear = bean.yearsGrown.length > 0 ? Math.max(...bean.yearsGrown) : null;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder component={Link} to={`/beans/${bean.id}`}>
      <Card.Section>
        <Image src={previewUrl} height={180} alt={bean.name} fallbackSrc="https://placehold.co/640x480?text=No+Image" />
      </Card.Section>

      <Text fw={500} size="lg" mt="md" truncate>
        {bean.name}
      </Text>

      <Group gap="xs" mt="xs">
        <Badge variant="light" size="sm">
          {bean.species}
        </Badge>
        <Badge variant="light" size="sm" color="teal">
          {bean.podType}
        </Badge>
        <Badge variant="light" size="sm" color="grape">
          {bean.plantType}
        </Badge>
      </Group>

      {lastYear && (
        <Text size="sm" c="dimmed" mt="xs">
          Last grown: {lastYear}
        </Text>
      )}
    </Card>
  );
}

function getPreviewUrl(images: BeanImage[]): string | undefined {
  const closeup = images.find((img) => img.type === 'closeup');
  const source = images.find((img) => img.type === 'source');
  const preferred = closeup ?? source ?? images[0];
  return preferred?.urls.card_webp ?? undefined;
}
