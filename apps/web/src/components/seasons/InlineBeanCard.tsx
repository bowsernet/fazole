import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { Anchor, Group, Image, Text } from '@mantine/core';

import type { Bean, BeanImage } from '@fazole/common';

interface InlineBeanCardProps {
  bean: Bean;
  images: BeanImage[];
}

export function InlineBeanCard({ bean, images }: InlineBeanCardProps): ReactElement {
  const thumbUrl = getThumbUrl(images);

  return (
    <Anchor component={Link} to={`/beans/${bean.id}`} underline="never">
      <Group gap="xs" wrap="nowrap">
        <Image src={thumbUrl} w={32} h={32} radius="sm" alt={bean.name} fallbackSrc="https://placehold.co/32?text=?" />
        <Text size="sm" truncate>
          {bean.name}
        </Text>
      </Group>
    </Anchor>
  );
}

function getThumbUrl(images: BeanImage[]): string | undefined {
  const closeup = images.find((img) => img.type === 'closeup');
  const source = images.find((img) => img.type === 'source');
  const preferred = closeup ?? source ?? images[0];
  return preferred?.urls.thumb_webp ?? undefined;
}
