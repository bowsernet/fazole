import type { ReactElement } from 'react';

import { Badge, Box, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';

import type { Bean, BeanColor, Source } from '@fazole/common';

import { BEAN_COLOR_CSS } from '../../lib/bean-color-css';

interface BeanPropertiesProps {
  bean: Bean;
  source?: Source | null;
}

export function BeanProperties({ bean, source }: BeanPropertiesProps): ReactElement {
  const colors = beanColors(bean);

  return (
    <Stack gap="md">
      <Group gap="xs">
        <Badge variant="light" size="lg">
          {bean.species}
        </Badge>
        <Badge variant="light" size="lg" color="teal">
          {bean.podType}
        </Badge>
        <Badge variant="light" size="lg" color="grape">
          {bean.plantType}
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
        <StatBlock label="Bean Size" value={bean.beanSize} />
        <StatBlock label="Weight" value={bean.beanWeight} />
        <StatBlock label="Beans per Pod" value={bean.beansPerPod} />
      </SimpleGrid>

      {colors.length > 0 && (
        <Group gap="xs">
          <Text size="sm" fw={500}>
            Colors:
          </Text>
          {colors.map((color, i) => (
            <Box
              key={i}
              w={24}
              h={24}
              style={{
                borderRadius: '50%',
                backgroundColor: BEAN_COLOR_CSS[color] ?? '#868e96',
                border: '1px solid var(--mantine-color-gray-4)',
              }}
              title={color}
            />
          ))}
        </Group>
      )}

      {bean.yearsGrown.length > 0 && (
        <Group gap="xs">
          <Text size="sm" fw={500}>
            Years grown:
          </Text>
          {[...bean.yearsGrown]
            .sort((a, b) => b - a)
            .map((year) => (
              <Badge key={year} variant="outline" size="sm">
                {year}
              </Badge>
            ))}
        </Group>
      )}

      <DescriptionSection bean={bean} source={source} />
    </Stack>
  );
}

function beanColors(bean: Bean): BeanColor[] {
  return [bean.beanColor1, bean.beanColor2, bean.beanColor3].filter((c): c is BeanColor => Boolean(c));
}

function StatBlock({ label, value }: { label: string; value?: number | null }): ReactElement {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase">
        {label}
      </Text>
      <Text size="lg" fw={600}>
        {value ?? '-'}
      </Text>
    </Stack>
  );
}

function DescriptionSection({ bean, source }: { bean: Bean; source?: Source | null }): ReactElement | null {
  if (bean.description) {
    return (
      <Stack gap="xs">
        <Title order={4}>Description</Title>
        <Text>{bean.description}</Text>
      </Stack>
    );
  }

  if (bean.sourceDescription && source) {
    return (
      <Stack gap="xs">
        <Title order={4}>Description</Title>
        <Paper p="md" bg="gray.0" radius="sm">
          <Text>{bean.sourceDescription}</Text>
          <Badge variant="light" mt="xs" size="sm">
            from {source.name}
          </Badge>
        </Paper>
      </Stack>
    );
  }

  return null;
}
