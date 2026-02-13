import type { ReactElement } from 'react';

import { ActionIcon, Collapse, Group, Select, Stack } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconFilter, IconFilterOff } from '@tabler/icons-react';

import type { Bean } from '@fazole/common';

export interface GrowRecordFiltersState {
  year: string | null;
  beanId: string | null;
}

interface GrowRecordFiltersProps {
  filters: GrowRecordFiltersState;
  onChange: (filters: GrowRecordFiltersState) => void;
  beans: Bean[];
  yearOptions: string[];
}

export function GrowRecordFilters({ filters, onChange, beans, yearOptions }: GrowRecordFiltersProps): ReactElement {
  const isLarge = useMediaQuery('(min-width: 75em)');
  const isSmall = useMediaQuery('(max-width: 48em)');
  const [opened, { toggle }] = useDisclosure(false);

  function updateFilter(key: keyof GrowRecordFiltersState, value: string | null): void {
    onChange({ ...filters, [key]: value });
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== null);

  const filterSelects = (
    <>
      <Select
        label="Year"
        placeholder="All"
        data={yearOptions.map((y) => ({ value: y, label: y }))}
        value={filters.year}
        onChange={(v) => updateFilter('year', v)}
        clearable
        size="sm"
      />
      <Select
        label="Bean"
        placeholder="All"
        data={beans.map((b) => ({ value: b.id, label: b.name }))}
        value={filters.beanId}
        onChange={(v) => updateFilter('beanId', v)}
        clearable
        searchable
        size="sm"
      />
    </>
  );

  if (isLarge) {
    return (
      <Stack gap="sm" w={200} style={{ flexShrink: 0 }}>
        {filterSelects}
      </Stack>
    );
  }

  if (isSmall) {
    return (
      <Stack gap="sm">
        <Group>
          <ActionIcon variant={hasActiveFilters ? 'filled' : 'default'} onClick={toggle}>
            {hasActiveFilters ? <IconFilterOff size={16} /> : <IconFilter size={16} />}
          </ActionIcon>
        </Group>
        <Collapse in={opened}>
          <Group grow gap="sm">
            {filterSelects}
          </Group>
        </Collapse>
      </Stack>
    );
  }

  // Medium: horizontal row
  return (
    <Group grow gap="sm">
      {filterSelects}
    </Group>
  );
}
