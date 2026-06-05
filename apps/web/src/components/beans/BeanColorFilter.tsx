import type { ReactElement } from 'react';

import { Group, Input, Tooltip, UnstyledButton } from '@mantine/core';
import { useUncontrolled } from '@mantine/hooks';

import { BEAN_COLORS, type BeanColor } from '@fazole/common';

import { BEAN_COLOR_CSS } from '../../lib/bean-color-css';

interface BeanColorFilterProps {
  label?: string;
  value?: BeanColor[];
  defaultValue?: BeanColor[];
  onChange?: (value: BeanColor[]) => void;
}

export function BeanColorFilter({
  label = 'Color',
  value,
  defaultValue,
  onChange,
}: BeanColorFilterProps): ReactElement {
  const [selected, setSelected] = useUncontrolled<BeanColor[]>({
    value,
    defaultValue,
    finalValue: [],
    onChange,
  });

  function toggle(color: BeanColor): void {
    setSelected(selected.includes(color) ? selected.filter((c) => c !== color) : [...selected, color]);
  }

  return (
    <Input.Wrapper label={label}>
      <Group gap={6} mt={4}>
        {BEAN_COLORS.map((color) => (
          <ColorSquare key={color} color={color} selected={selected.includes(color)} onToggle={() => toggle(color)} />
        ))}
      </Group>
    </Input.Wrapper>
  );
}

interface ColorSquareProps {
  color: BeanColor;
  selected: boolean;
  onToggle: () => void;
}

function ColorSquare({ color, selected, onToggle }: ColorSquareProps): ReactElement {
  return (
    <Tooltip label={color} withArrow openDelay={300}>
      <UnstyledButton
        onClick={onToggle}
        aria-label={color}
        aria-pressed={selected}
        w={28}
        h={28}
        style={{
          borderRadius: 'var(--mantine-radius-sm)',
          backgroundColor: BEAN_COLOR_CSS[color],
          border: selected ? '2px solid var(--mantine-color-dark-9)' : '1px solid var(--mantine-color-gray-3)',
          opacity: selected ? 1 : 0.4,
          transition: 'opacity 100ms ease, border-color 100ms ease',
        }}
      />
    </Tooltip>
  );
}
