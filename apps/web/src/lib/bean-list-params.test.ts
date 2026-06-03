import { describe, expect, it } from 'vitest';

import { type BeanListState, parseParams, toSearchParams } from './bean-list-params';

const DEFAULT_STATE: BeanListState = {
  filters: { species: null, podType: null, plantType: null, yearGrown: null, beanColor: null, sourceId: null },
  sort: { field: 'name', dir: 'asc' },
  view: 'card',
  loaded: 1,
};

describe('parseParams', () => {
  it('returns defaults for an empty query string', () => {
    expect(parseParams(new URLSearchParams())).toEqual(DEFAULT_STATE);
  });

  it('parses filters, sort, view and loaded', () => {
    const params = new URLSearchParams('species=lima&pod=dry&color=red&sort=beanWeight.desc&view=table&loaded=3');
    const state = parseParams(params);
    expect(state.filters.species).toBe('lima');
    expect(state.filters.podType).toBe('dry');
    expect(state.filters.beanColor).toBe('red');
    expect(state.sort).toEqual({ field: 'beanWeight', dir: 'desc' });
    expect(state.view).toBe('table');
    expect(state.loaded).toBe(3);
  });

  it('falls back to defaults for malformed sort, view, loaded', () => {
    const params = new URLSearchParams('sort=bogus&view=grid&loaded=-2');
    const state = parseParams(params);
    expect(state.sort).toEqual({ field: 'name', dir: 'asc' });
    expect(state.view).toBe('card');
    expect(state.loaded).toBe(1);
  });
});

describe('toSearchParams', () => {
  it('omits all defaults', () => {
    expect(toSearchParams(DEFAULT_STATE).toString()).toBe('');
  });

  it('serializes non-defaults and round-trips', () => {
    const state: BeanListState = {
      filters: { ...DEFAULT_STATE.filters, sourceId: 's1', yearGrown: '2025' },
      sort: { field: 'beanSize', dir: 'desc' },
      view: 'table',
      loaded: 2,
    };
    const round = parseParams(toSearchParams(state));
    expect(round).toEqual(state);
  });
});
