import type { Bean } from '@fazole/common';
import { describe, expect, it } from 'vitest';

import { filterBeans, selectBeans, sortBeans } from './beans-select';

function makeBean(overrides: Partial<Bean> & { id: string; name: string }): Bean {
  return {
    species: 'vulgaris',
    podType: 'dry',
    plantType: 'bush',
    sourceId: 's1',
    yearsGrown: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as Bean;
}

const beans: Bean[] = [
  makeBean({ id: '1', name: 'Cranberry', beanSize: 12, beanColor1: 'red', sourceId: 's1', yearsGrown: [2023, 2024] }),
  makeBean({ id: '2', name: 'Apple', beanSize: 8, beanColor1: 'white', sourceId: 's2', yearsGrown: [2024] }),
  makeBean({ id: '3', name: 'Borlotti', beanColor1: 'pink', sourceId: 's1', yearsGrown: [2022] }),
];

describe('filterBeans', () => {
  it('returns all beans when no filters set', () => {
    expect(filterBeans(beans, {})).toHaveLength(3);
  });

  it('filters by equality fields', () => {
    expect(filterBeans(beans, { beanColor: 'white' }).map((b) => b.id)).toEqual(['2']);
    expect(filterBeans(beans, { sourceId: 's1' }).map((b) => b.id)).toEqual(['1', '3']);
  });

  it('filters by yearGrown via yearsGrown membership', () => {
    expect(filterBeans(beans, { yearGrown: 2024 }).map((b) => b.id)).toEqual(['1', '2']);
  });

  it('combines multiple filters (AND)', () => {
    expect(filterBeans(beans, { sourceId: 's1', yearGrown: 2024 }).map((b) => b.id)).toEqual(['1']);
  });
});

describe('sortBeans', () => {
  it('sorts by name ascending and descending', () => {
    expect(sortBeans(beans, 'name', 'asc').map((b) => b.name)).toEqual(['Apple', 'Borlotti', 'Cranberry']);
    expect(sortBeans(beans, 'name', 'desc').map((b) => b.name)).toEqual(['Cranberry', 'Borlotti', 'Apple']);
  });

  it('sorts by numeric beanSize with missing values last', () => {
    expect(sortBeans(beans, 'beanSize', 'asc').map((b) => b.id)).toEqual(['2', '1', '3']);
    expect(sortBeans(beans, 'beanSize', 'desc').map((b) => b.id)).toEqual(['1', '2', '3']);
  });

  it('does not mutate the input array', () => {
    const input = [...beans];
    sortBeans(input, 'name', 'desc');
    expect(input.map((b) => b.id)).toEqual(['1', '2', '3']);
  });
});

describe('selectBeans', () => {
  it('filters, sorts, and reports total before slicing', () => {
    const result = selectBeans(beans, { filters: { sourceId: 's1' }, sortField: 'name', sortDir: 'asc' });
    expect(result.total).toBe(2);
    expect(result.beans.map((b) => b.id)).toEqual(['3', '1']);
  });

  it('returns a cumulative slice of loaded x pageSize', () => {
    const result = selectBeans(beans, { sortField: 'name', sortDir: 'asc', loaded: 1, pageSize: 2 });
    expect(result.total).toBe(3);
    expect(result.beans.map((b) => b.name)).toEqual(['Apple', 'Borlotti']);
    expect(result.hasMore).toBe(true);
  });

  it('grows the slice as loaded increases', () => {
    const result = selectBeans(beans, { sortField: 'name', sortDir: 'asc', loaded: 2, pageSize: 2 });
    expect(result.beans.map((b) => b.name)).toEqual(['Apple', 'Borlotti', 'Cranberry']);
    expect(result.hasMore).toBe(false);
  });

  it('defaults to loaded=1, name ascending', () => {
    const result = selectBeans(beans);
    expect(result.beans.map((b) => b.name)).toEqual(['Apple', 'Borlotti', 'Cranberry']);
    expect(result.hasMore).toBe(false);
  });
});
