import type { ReactElement } from 'react';

import { ActionIcon, Collapse, Group, Select, Stack, TextInput } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';

import type { BeanColor, Source } from '@fazole/common';
import { IconFilter, IconFilterOff } from '@tabler/icons-react';

import { BeanColorFilter } from './BeanColorFilter';

export interface BeanFiltersState {
  search: string | null;
  species: string | null;
  podType: string | null;
  plantType: string | null;
  yearGrown: string | null;
  beanColors: BeanColor[];
  sourceId: string | null;
  grown: string | null;
}

interface BeanFiltersProps {
  filters: BeanFiltersState;
  onChange: (filters: BeanFiltersState) => void;
  sources: Source[];
  yearOptions: string[];
}

const SPECIES_OPTIONS = [
  { value: 'vulgaris', label: 'Vulgaris' },
  { value: 'lima', label: 'Lima' },
  { value: 'scarlet', label: 'Scarlet' },
];

const POD_TYPE_OPTIONS = [
  { value: 'snap', label: 'Snap' },
  { value: 'dry', label: 'Dry' },
];

const PLANT_TYPE_OPTIONS = [
  { value: 'bush', label: 'Bush' },
  { value: 'semi', label: 'Semi' },
  { value: 'runner', label: 'Runner' },
];

const GROWN_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export function BeanFilters({ filters, onChange, sources, yearOptions }: BeanFiltersProps): ReactElement {
  const isLarge = useMediaQuery('(min-width: 75em)');
  const isSmall = useMediaQuery('(max-width: 48em)');
  const [opened, { toggle }] = useDisclosure(false);

  function updateFilter<K extends keyof BeanFiltersState>(key: K, value: BeanFiltersState[K]): void {
    onChange({ ...filters, [key]: value });
  }

  const hasActiveFilters = Object.values(filters).some((v) => (Array.isArray(v) ? v.length > 0 : v !== null));

  const filterSelects = (
    <>
      <TextInput
        label="Search"
        placeholder="Bean name"
        value={filters.search ?? ''}
        onChange={(e) => updateFilter('search', e.currentTarget.value || null)}
        size="sm"
      />
      <Select
        label="Species"
        placeholder="All"
        data={SPECIES_OPTIONS}
        value={filters.species}
        onChange={(v) => updateFilter('species', v)}
        clearable
        size="sm"
      />
      <Select
        label="Pod Type"
        placeholder="All"
        data={POD_TYPE_OPTIONS}
        value={filters.podType}
        onChange={(v) => updateFilter('podType', v)}
        clearable
        size="sm"
      />
      <Select
        label="Plant Type"
        placeholder="All"
        data={PLANT_TYPE_OPTIONS}
        value={filters.plantType}
        onChange={(v) => updateFilter('plantType', v)}
        clearable
        size="sm"
      />
      <Select
        label="Year Grown"
        placeholder="All"
        data={yearOptions.map((y) => ({ value: y, label: y }))}
        value={filters.yearGrown}
        onChange={(v) => updateFilter('yearGrown', v)}
        clearable
        size="sm"
      />
      <Select
        label="Grown"
        placeholder="All"
        data={GROWN_OPTIONS}
        value={filters.grown}
        onChange={(v) => updateFilter('grown', v)}
        clearable
        size="sm"
      />
      <Select
        label="Source"
        placeholder="All"
        data={sources.map((s) => ({ value: s.id, label: s.name }))}
        value={filters.sourceId}
        onChange={(v) => updateFilter('sourceId', v)}
        clearable
        size="sm"
      />
      <BeanColorFilter value={filters.beanColors} onChange={(v) => updateFilter('beanColors', v)} />
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
