import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { Anchor, Group, Image, Text } from '@mantine/core';

import type { Bean, BeanImage } from '@fazole/common';

import { getBeanThumbUrl } from '../../lib/bean-image-url';

interface InlineBeanCardProps {
  bean: Bean;
  images: BeanImage[];
}

export function InlineBeanCard({ bean, images }: InlineBeanCardProps): ReactElement {
  const thumbUrl = getBeanThumbUrl(images);

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
