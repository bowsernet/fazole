# Bean Browsing: URL State + TanStack Query — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist bean-list filters/sort/view/load-depth in the URL and replace the hand-rolled `useQuery` hook with TanStack Query across all 8 pages, so navigation is instant and filters survive list→detail→back.

**Architecture:** A single `QueryClient` (`staleTime: Infinity`, `refetchOnWindowFocus: false`) provides a cache that survives component unmounts. Domain query/mutation hooks live in `apps/web/src/lib/queries/` over the existing `lib/firestore/*` functions. The bean list reads/writes its state through `useSearchParams` (pure parse/serialize in `lib/bean-list-params.ts`), uses cumulative "load more" instead of pagination, and each `BeanCard`/`BeanTableRow` fetches its own images via a shared `['beanImages', id]` query.

**Tech Stack:** React 19, TypeScript (strict), Vite 6, React Router 7, Mantine 8, Firebase 12, `@tanstack/react-query` v5, Vitest 3.

---

## Conventions & Policies (read before starting)

- **Tests:** Per project CLAUDE.md, unit-test pure library functions only. Do **not** write component/page tests or tests for the query/mutation hook wrappers (facades over TanStack + Firestore). Verification for non-pure tasks = `npm run lint` (this repo's `lint` script is `tsc --noEmit`) + `npm test` + a manual `npm run dev` smoke check.
- **Commands** run from `apps/web/`: `npm run lint`, `npm test`, `npm run dev`.
- **Return types:** Always annotate (CLAUDE.md). Hooks return `UseQueryResult<T>` / `UseMutationResult<...>`.
- **Invalidation policy** (used by every mutation hook / callback):
  - Bean create/update → invalidate `['beans']`, `['seasons']`, `['home']`.
  - Bean image change → invalidate `['beanImages', beanId]`.
  - Grow-record change → invalidate `['growRecords']`, `['seasons']`, `['home']`.
  - Source change → invalidate `['sources']`, `['beans']` (bean detail shows source name).
  - User change → invalidate `['users']`.
- **Loading gate:** Use TanStack's `isLoading` (= `isPending && isFetching`) to drive `<LoadingState>`, so `enabled:false` queries (e.g. the detail page's source query when `sourceId` is empty) don't show a spinner forever.
- **Mutation surface decision:** Edit pages call mutations directly → they use mutation hooks. Mutations triggered inside shared child components (`SourceForm`, `SourceTable`, `GrowRecordTable`, `BeanGrowHistory`, `BeanImageManager`, `UsersTable`) stay in those components untouched; the parent page passes a callback that invalidates the right keys via `useQueryClient()`. This keeps the diff focused and is fully correct (mutation fires → callback invalidates → refetch).

## File Structure

**Create:**
- `apps/web/src/lib/queries/keys.ts` — central query-key factory.
- `apps/web/src/lib/queries/beans.ts` — `useBeans`, `useBean`, `useBeanImages`, `useCreateBean`, `useUpdateBean`.
- `apps/web/src/lib/queries/sources.ts` — `useSources`, `useSource`.
- `apps/web/src/lib/queries/grow-records.ts` — `useGrowRecords`, `useGrowRecord`, `useCreateGrowRecord`, `useUpdateGrowRecord`.
- `apps/web/src/lib/queries/users.ts` — `useUsers`.
- `apps/web/src/lib/queries/index.ts` — barrel re-export.
- `apps/web/src/lib/bean-list-params.ts` — pure `parseParams` / `toSearchParams`.
- `apps/web/src/lib/bean-list-params.test.ts` — unit tests (colocated).
- `apps/web/src/pages/beans/use-bean-list-params.ts` — `useSearchParams`-backed hook.
- `apps/web/src/components/beans/BeanTableRow.tsx` — one table row that self-fetches images.

**Modify:** `main.tsx`, `lib/beans-select.ts` (+ its test), `components/beans/BeanCard.tsx`, `components/beans/BeanTable.tsx`, `components/beans/index.ts`, all 8 pages, `hooks/index.ts`.

**Delete:** `hooks/use-query.ts`, `__tests__/hooks/use-query.test.ts`.

---

## Phase 1 — Foundation

### Task 1: Install TanStack Query

**Files:** `apps/web/package.json`

- [ ] **Step 1: Install runtime + devtools**

Run (from `apps/web/`):
```bash
npm install @tanstack/react-query@^5
npm install -D @tanstack/react-query-devtools@^5
```
Expected: both added to `apps/web/package.json`; lockfile updated.

- [ ] **Step 2: Verify install**

Run: `npm ls @tanstack/react-query`
Expected: prints a resolved v5 version, no errors.

- [ ] **Step 3: Commit**
```bash
git add package.json ../../package-lock.json
git commit -m "build(web): add @tanstack/react-query"
```

### Task 2: Query-key factory

**Files:** Create `apps/web/src/lib/queries/keys.ts`

- [ ] **Step 1: Write the factory**
```ts
export const queryKeys = {
  beans: {
    all: ['beans'] as const,
    detail: (id: string) => ['beans', id] as const,
    images: (id: string) => ['beanImages', id] as const,
  },
  sources: {
    all: ['sources'] as const,
    detail: (id: string) => ['sources', id] as const,
  },
  growRecords: {
    all: ['growRecords'] as const,
    query: (options: unknown) => ['growRecords', options] as const,
    detail: (id: string) => ['growRecords', 'detail', id] as const,
  },
  users: { all: ['users'] as const },
  seasons: { all: ['seasons'] as const },
  home: { all: ['home'] as const, byYear: (year: number) => ['home', year] as const },
} as const;
```

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: PASS (no usages yet, just must compile).

- [ ] **Step 3: Commit**
```bash
git add src/lib/queries/keys.ts
git commit -m "feat(web): add query-key factory"
```

### Task 3: QueryClient + provider

**Files:** Modify `apps/web/src/main.tsx`

- [ ] **Step 1: Wrap the app**

Replace the file contents with:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

import '@mantine/carousel/styles.css';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { DatesProvider } from '@mantine/dates';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { App } from './App';
import { AuthProvider } from './hooks/use-auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider>
      <DatesProvider settings={{ consistentWeeks: true }}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Notifications />
            <App />
            <ReactQueryDevtools initialIsOpen={false} />
          </AuthProvider>
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>
  </React.StrictMode>
);
```

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**
```bash
git add src/main.tsx
git commit -m "feat(web): provide TanStack QueryClient at app root"
```

---

## Phase 2 — Domain query/mutation hooks

### Task 4: Bean hooks

**Files:** Create `apps/web/src/lib/queries/beans.ts`

- [ ] **Step 1: Write the hooks**
```ts
import type { Bean, BeanImage } from '@fazole/common';
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { createBean, fetchAllBeans, fetchBean, updateBean } from '../firestore/beans';
import { fetchBeanImages } from '../firestore/images';
import { queryKeys } from './keys';

type CreateBeanData = Parameters<typeof createBean>[0];

export function useBeans(): UseQueryResult<Bean[]> {
  return useQuery({ queryKey: queryKeys.beans.all, queryFn: fetchAllBeans });
}

export function useBean(id: string): UseQueryResult<Bean> {
  return useQuery({ queryKey: queryKeys.beans.detail(id), queryFn: () => fetchBean(id), enabled: !!id });
}

export function useBeanImages(id: string): UseQueryResult<BeanImage[]> {
  return useQuery({ queryKey: queryKeys.beans.images(id), queryFn: () => fetchBeanImages(id), enabled: !!id });
}

export function useCreateBean(): UseMutationResult<string, Error, CreateBeanData> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBeanData) => createBean(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.beans.all });
      void qc.invalidateQueries({ queryKey: queryKeys.seasons.all });
      void qc.invalidateQueries({ queryKey: queryKeys.home.all });
    },
  });
}

export function useUpdateBean(): UseMutationResult<void, Error, { id: string; data: Partial<Bean> }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Bean> }) => updateBean(id, data),
    onSuccess: (_result, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.beans.all });
      void qc.invalidateQueries({ queryKey: queryKeys.beans.detail(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.seasons.all });
      void qc.invalidateQueries({ queryKey: queryKeys.home.all });
    },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**
```bash
git add src/lib/queries/beans.ts
git commit -m "feat(web): bean query/mutation hooks"
```

### Task 5: Sources, grow-records, users hooks + barrel

**Files:** Create `sources.ts`, `grow-records.ts`, `users.ts`, `index.ts` under `apps/web/src/lib/queries/`

- [ ] **Step 1: `sources.ts`**
```ts
import type { Source } from '@fazole/common';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { fetchSource, fetchSources } from '../firestore/sources';
import { queryKeys } from './keys';

export function useSources(): UseQueryResult<Source[]> {
  return useQuery({ queryKey: queryKeys.sources.all, queryFn: fetchSources });
}

export function useSource(id: string | undefined): UseQueryResult<Source> {
  return useQuery({ queryKey: queryKeys.sources.detail(id ?? ''), queryFn: () => fetchSource(id!), enabled: !!id });
}
```

- [ ] **Step 2: `grow-records.ts`**
```ts
import type { GrowRecord } from '@fazole/common';
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  createGrowRecord,
  fetchGrowRecord,
  fetchGrowRecords,
  updateGrowRecord,
} from '../firestore/grow-records';
import { queryKeys } from './keys';

type FetchOptions = Parameters<typeof fetchGrowRecords>[0];
type GrowResult = Awaited<ReturnType<typeof fetchGrowRecords>>;
type CreateData = Parameters<typeof createGrowRecord>[0];

export function useGrowRecords(options: FetchOptions = {}): UseQueryResult<GrowResult> {
  return useQuery({ queryKey: queryKeys.growRecords.query(options), queryFn: () => fetchGrowRecords(options) });
}

export function useGrowRecord(id: string): UseQueryResult<GrowRecord> {
  return useQuery({ queryKey: queryKeys.growRecords.detail(id), queryFn: () => fetchGrowRecord(id), enabled: !!id });
}

function useInvalidateGrowRecords(): () => void {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.growRecords.all });
    void qc.invalidateQueries({ queryKey: queryKeys.seasons.all });
    void qc.invalidateQueries({ queryKey: queryKeys.home.all });
  };
}

export function useCreateGrowRecord(): UseMutationResult<string, Error, CreateData> {
  const invalidate = useInvalidateGrowRecords();
  return useMutation({ mutationFn: (data: CreateData) => createGrowRecord(data), onSuccess: invalidate });
}

export function useUpdateGrowRecord(): UseMutationResult<void, Error, { id: string; data: Partial<GrowRecord> }> {
  const invalidate = useInvalidateGrowRecords();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GrowRecord> }) => updateGrowRecord(id, data),
    onSuccess: invalidate,
  });
}
```

- [ ] **Step 3: `users.ts`**
```ts
import type { User } from '@fazole/common';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { fetchUsers } from '../firestore/users';
import { queryKeys } from './keys';

export function useUsers(): UseQueryResult<User[]> {
  return useQuery({ queryKey: queryKeys.users.all, queryFn: fetchUsers });
}
```

- [ ] **Step 4: `index.ts` barrel**
```ts
export * from './keys';
export * from './beans';
export * from './sources';
export * from './grow-records';
export * from './users';
```

- [ ] **Step 5: Typecheck + commit**

Run: `npm run lint` → PASS.
```bash
git add src/lib/queries/sources.ts src/lib/queries/grow-records.ts src/lib/queries/users.ts src/lib/queries/index.ts
git commit -m "feat(web): source/grow-record/user query hooks"
```

---

## Phase 3 — Pure logic (TDD)

### Task 6: `selectBeans` — cumulative load-more

**Files:** Modify `apps/web/src/lib/beans-select.ts`, `apps/web/src/lib/beans-select.test.ts`

- [ ] **Step 1: Update the failing tests**

In `beans-select.test.ts`, replace the entire `describe('selectBeans', …)` block with:
```ts
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
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- beans-select`
Expected: FAIL — `loaded` not handled / `hasMore` undefined.

- [ ] **Step 3: Implement**

In `beans-select.ts` replace `SelectBeansOptions` and `selectBeans` with:
```ts
export interface SelectBeansOptions {
  filters?: BeanFilters;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  loaded?: number;
  pageSize?: number;
}

export function selectBeans(
  beans: Bean[],
  options: SelectBeansOptions = {}
): { beans: Bean[]; total: number; hasMore: boolean } {
  const { filters = {}, sortField = 'name', sortDir = 'asc', loaded = 1, pageSize = PAGINATION_PAGE_SIZE } = options;

  const sorted = sortBeans(filterBeans(beans, filters), sortField, sortDir);
  const shown = sorted.slice(0, loaded * pageSize);

  return { beans: shown, total: sorted.length, hasMore: shown.length < sorted.length };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- beans-select`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/beans-select.ts src/lib/beans-select.test.ts
git commit -m "feat(web): selectBeans cumulative load-more slice"
```

### Task 7: `bean-list-params` — URL parse/serialize (TDD)

**Files:** Create `apps/web/src/lib/bean-list-params.ts`, `apps/web/src/lib/bean-list-params.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
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
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- bean-list-params`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**
```ts
import type { BeanFiltersState, SortState } from '../components/beans';

export interface BeanListState {
  filters: BeanFiltersState;
  sort: SortState;
  view: 'card' | 'table';
  loaded: number;
}

const DEFAULT_SORT: SortState = { field: 'name', dir: 'asc' };

const FILTER_PARAMS: Record<keyof BeanFiltersState, string> = {
  species: 'species',
  podType: 'pod',
  plantType: 'plant',
  yearGrown: 'year',
  beanColor: 'color',
  sourceId: 'source',
};

export function parseParams(params: URLSearchParams): BeanListState {
  const filters = {} as BeanFiltersState;
  (Object.keys(FILTER_PARAMS) as (keyof BeanFiltersState)[]).forEach((key) => {
    filters[key] = params.get(FILTER_PARAMS[key]);
  });

  return {
    filters,
    sort: parseSort(params.get('sort')),
    view: params.get('view') === 'table' ? 'table' : 'card',
    loaded: parseLoaded(params.get('loaded')),
  };
}

export function toSearchParams(state: BeanListState): URLSearchParams {
  const params = new URLSearchParams();

  (Object.keys(FILTER_PARAMS) as (keyof BeanFiltersState)[]).forEach((key) => {
    const value = state.filters[key];
    if (value) params.set(FILTER_PARAMS[key], value);
  });

  if (state.sort.field !== DEFAULT_SORT.field || state.sort.dir !== DEFAULT_SORT.dir) {
    params.set('sort', `${state.sort.field}.${state.sort.dir}`);
  }
  if (state.view !== 'card') params.set('view', state.view);
  if (state.loaded > 1) params.set('loaded', String(state.loaded));

  return params;
}

function parseSort(raw: string | null): SortState {
  if (!raw) return DEFAULT_SORT;
  const [field, dir] = raw.split('.');
  if (!field || (dir !== 'asc' && dir !== 'desc')) return DEFAULT_SORT;
  return { field, dir };
}

function parseLoaded(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- bean-list-params`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/bean-list-params.ts src/lib/bean-list-params.test.ts
git commit -m "feat(web): URL parse/serialize for bean list state"
```

### Task 8: `useBeanListParams` hook

**Files:** Create `apps/web/src/pages/beans/use-bean-list-params.ts`

- [ ] **Step 1: Write the hook**
```ts
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import type { BeanFiltersState, SortState } from '../../components/beans';
import { type BeanListState, parseParams, toSearchParams } from '../../lib/bean-list-params';

export interface UseBeanListParamsResult extends BeanListState {
  setFilters: (filters: BeanFiltersState) => void;
  setSort: (field: string) => void;
  setView: (view: string) => void;
  loadMore: () => void;
}

export function useBeanListParams(): UseBeanListParamsResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => parseParams(searchParams), [searchParams]);

  const setFilters = useCallback(
    (filters: BeanFiltersState): void => {
      setSearchParams(toSearchParams({ ...state, filters, loaded: 1 }));
    },
    [state, setSearchParams]
  );

  const setSort = useCallback(
    (field: string): void => {
      const next: SortState =
        state.sort.field === field
          ? { field, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' }
          : { field, dir: 'asc' };
      setSearchParams(toSearchParams({ ...state, sort: next, loaded: 1 }));
    },
    [state, setSearchParams]
  );

  const setView = useCallback(
    (view: string): void => {
      setSearchParams(toSearchParams({ ...state, view: view === 'table' ? 'table' : 'card' }));
    },
    [state, setSearchParams]
  );

  const loadMore = useCallback((): void => {
    setSearchParams(toSearchParams({ ...state, loaded: state.loaded + 1 }));
  }, [state, setSearchParams]);

  return { ...state, setFilters, setSort, setView, loadMore };
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npm run lint` → PASS.
```bash
git add src/pages/beans/use-bean-list-params.ts
git commit -m "feat(web): useBeanListParams URL-state hook"
```

---

## Phase 4 — Per-bean images in components

### Task 9: `BeanCard` self-fetches images

**Files:** Modify `apps/web/src/components/beans/BeanCard.tsx`

- [ ] **Step 1: Remove the `images` prop, fetch internally**

Replace the imports + props interface + component signature so the top of the file reads:
```tsx
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
```
Leave the JSX body and the `getPreviewUrl(images: BeanImage[])` helper unchanged.

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: FAIL at `BeanListPage.tsx` and `HomePage.tsx` (still pass `images=`). That's expected — fixed in later tasks. Do not "fix" here.

- [ ] **Step 3: Commit**
```bash
git add src/components/beans/BeanCard.tsx
git commit -m "refactor(web): BeanCard fetches its own images"
```

### Task 10: `BeanTableRow` extraction + `BeanTable` drops `imagesMap`

**Files:** Create `apps/web/src/components/beans/BeanTableRow.tsx`; modify `apps/web/src/components/beans/BeanTable.tsx`

- [ ] **Step 1: Create `BeanTableRow.tsx`**
```tsx
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Group, Image, Table, Text } from '@mantine/core';

import type { Bean, BeanImage } from '@fazole/common';

import { useBeanImages } from '../../lib/queries/beans';

interface BeanTableRowProps {
  bean: Bean;
}

export function BeanTableRow({ bean }: BeanTableRowProps): ReactElement {
  const navigate = useNavigate();
  const { data: images } = useBeanImages(bean.id);
  const thumbUrl = getThumbUrl(images ?? []);
  const lastYear = bean.yearsGrown.length > 0 ? Math.max(...bean.yearsGrown) : null;

  return (
    <Table.Tr style={{ cursor: 'pointer' }} onClick={() => navigate(`/beans/${bean.id}`)}>
      <Table.Td>
        <Image src={thumbUrl} w={40} h={40} radius="sm" fallbackSrc="https://placehold.co/160x160?text=-" alt="" />
      </Table.Td>
      <Table.Td>
        <Text fw={500}>{bean.name}</Text>
      </Table.Td>
      <Table.Td>{bean.podType}</Table.Td>
      <Table.Td>{bean.plantType}</Table.Td>
      <Table.Td>{bean.beanSize ?? '-'}</Table.Td>
      <Table.Td>
        <BeanColorDisplay bean={bean} />
      </Table.Td>
      <Table.Td>{lastYear ?? '-'}</Table.Td>
    </Table.Tr>
  );
}

function BeanColorDisplay({ bean }: { bean: Bean }): ReactElement {
  const colors = [bean.beanColor1, bean.beanColor2, bean.beanColor3].filter(Boolean);
  if (colors.length === 0) return <Text size="sm">-</Text>;

  return (
    <Group gap={4}>
      {colors.map((color, i) => (
        <Badge key={i} size="xs" color={mapBeanColorToMantine(color!)}>
          {color}
        </Badge>
      ))}
    </Group>
  );
}

function mapBeanColorToMantine(color: string): string {
  const map: Record<string, string> = {
    white: 'gray',
    yellow: 'yellow',
    brown: 'orange',
    pink: 'pink',
    red: 'red',
    purple: 'grape',
    black: 'dark',
  };
  return map[color] ?? 'gray';
}

function getThumbUrl(images: BeanImage[]): string | undefined {
  const closeup = images.find((img) => img.type === 'closeup');
  const source = images.find((img) => img.type === 'source');
  const preferred = closeup ?? source ?? images[0];
  return preferred?.urls.thumb_webp ?? undefined;
}
```

- [ ] **Step 2: Rewrite `BeanTable.tsx` to use the row + drop `imagesMap`**
```tsx
import type { ReactElement } from 'react';

import { Group, Table, Text, UnstyledButton } from '@mantine/core';

import type { Bean } from '@fazole/common';
import { IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react';

import { BeanTableRow } from './BeanTableRow';

export interface SortState {
  field: string;
  dir: 'asc' | 'desc';
}

interface BeanTableProps {
  beans: Bean[];
  sort: SortState;
  onSort: (field: string) => void;
}

export function BeanTable({ beans, sort, onSort }: BeanTableProps): ReactElement {
  return (
    <Table.ScrollContainer minWidth={700}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={60} />
            <Table.Th>
              <SortableHeader field="name" label="Name" sort={sort} onSort={onSort} />
            </Table.Th>
            <Table.Th>Pod Type</Table.Th>
            <Table.Th>Plant Type</Table.Th>
            <Table.Th>
              <SortableHeader field="beanSize" label="Size" sort={sort} onSort={onSort} />
            </Table.Th>
            <Table.Th>Colors</Table.Th>
            <Table.Th>Last Year</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {beans.map((bean) => (
            <BeanTableRow key={bean.id} bean={bean} />
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

interface SortableHeaderProps {
  field: string;
  label: string;
  sort: SortState;
  onSort: (field: string) => void;
}

function SortableHeader({ field, label, sort, onSort }: SortableHeaderProps): ReactElement {
  const Icon = sort.field === field ? (sort.dir === 'asc' ? IconChevronUp : IconChevronDown) : IconSelector;

  return (
    <UnstyledButton onClick={() => onSort(field)}>
      <Group gap={4} wrap="nowrap">
        <Text fw={700} size="sm">
          {label}
        </Text>
        <Icon size={14} />
      </Group>
    </UnstyledButton>
  );
}
```

- [ ] **Step 3: Export `BeanTableRow` from the barrel**

In `apps/web/src/components/beans/index.ts` add after the `BeanTable` export line:
```ts
export { BeanTableRow } from './BeanTableRow';
```

- [ ] **Step 4: Commit** (typecheck still fails at pages — expected)
```bash
git add src/components/beans/BeanTable.tsx src/components/beans/BeanTableRow.tsx src/components/beans/index.ts
git commit -m "refactor(web): BeanTableRow self-fetches images, drop imagesMap"
```

---

## Phase 5 — Page migrations

### Task 11: `BeanListPage` — URL state, load-more, new hooks

**Files:** Modify `apps/web/src/pages/beans/BeanListPage.tsx`

- [ ] **Step 1: Rewrite the file**
```tsx
import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { Button, Group, SegmentedControl, SimpleGrid, Stack, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

import type { BeanColor, BeanSpecies, PlantType, PodType } from '@fazole/common';
import { IconPlus } from '@tabler/icons-react';

import { BeanCard, BeanFilters, BeanTable } from '../../components/beans';
import { EmptyState, ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useAuth } from '../../hooks/use-auth';
import { selectBeans } from '../../lib/beans-select';
import { useBeans } from '../../lib/queries/beans';
import { useSources } from '../../lib/queries/sources';
import { useBeanListParams } from './use-bean-list-params';

export function BeanListPage(): ReactElement {
  const { isAdmin } = useAuth();
  const isLarge = useMediaQuery('(min-width: 75em)');
  const { filters, sort, view, loaded, setFilters, setSort, setView, loadMore } = useBeanListParams();

  const { data: allBeans, isLoading, isError, error, refetch } = useBeans();
  const { data: sources } = useSources();

  const { beans, hasMore } = selectBeans(allBeans ?? [], {
    filters: {
      species: (filters.species as BeanSpecies) ?? undefined,
      podType: (filters.podType as PodType) ?? undefined,
      plantType: (filters.plantType as PlantType) ?? undefined,
      yearGrown: filters.yearGrown ? Number(filters.yearGrown) : undefined,
      beanColor: (filters.beanColor as BeanColor) ?? undefined,
      sourceId: filters.sourceId ?? undefined,
    },
    sortField: sort.field,
    sortDir: sort.dir,
    loaded,
  });

  const yearOptions = buildYearOptions(allBeans);

  return (
    <>
      <PageBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Beans' }]} />

      <Stack gap="md">
        <Group justify="space-between">
          <Title order={1}>Beans</Title>
          <Group>
            <SegmentedControl
              value={view}
              onChange={setView}
              data={[
                { label: 'Cards', value: 'card' },
                { label: 'Table', value: 'table' },
              ]}
              size="sm"
            />
            {isAdmin && (
              <Button leftSection={<IconPlus size={16} />} component={Link} to="/beans/new">
                Add Bean
              </Button>
            )}
          </Group>
        </Group>

        {!isLarge && (
          <BeanFilters filters={filters} onChange={setFilters} sources={sources ?? []} yearOptions={yearOptions} />
        )}

        <Group align="flex-start" wrap="nowrap" gap="lg">
          {isLarge && (
            <BeanFilters filters={filters} onChange={setFilters} sources={sources ?? []} yearOptions={yearOptions} />
          )}

          <Stack gap="md" style={{ flex: 1, minWidth: 0 }}>
            {isLoading && <LoadingState />}
            {isError && <ErrorState message={error.message} onRetry={refetch} />}
            {!isLoading && !isError && beans.length === 0 && <EmptyState message="No beans found." />}

            {!isLoading && !isError && beans.length > 0 && (
              <>
                {view === 'card' ? (
                  <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 3 }} spacing="md">
                    {beans.map((bean) => (
                      <BeanCard key={bean.id} bean={bean} />
                    ))}
                  </SimpleGrid>
                ) : (
                  <BeanTable beans={beans} sort={sort} onSort={setSort} />
                )}

                {hasMore && (
                  <Group justify="center">
                    <Button variant="default" onClick={loadMore}>
                      Load more
                    </Button>
                  </Group>
                )}
              </>
            )}
          </Stack>
        </Group>
      </Stack>
    </>
  );
}

function buildYearOptions(allBeans: { yearsGrown: number[] }[] | undefined): string[] {
  const years = new Set<number>();
  (allBeans ?? []).forEach((b) => b.yearsGrown.forEach((y) => years.add(y)));
  return Array.from(years)
    .sort((a, b) => b - a)
    .map(String);
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: PASS for this file (BeanCard/BeanTable signatures now match). `HomePage.tsx` may still fail — fixed in Task 17.

- [ ] **Step 3: Commit**
```bash
git add src/pages/beans/BeanListPage.tsx
git commit -m "feat(web): URL-persisted filters + load-more on bean list"
```

### Task 12: `BeanDetailPage` migration

**Files:** Modify `apps/web/src/pages/beans/BeanDetailPage.tsx`

- [ ] **Step 1: Rewrite the data-fetching section**

Replace imports + the body up to the early returns with:
```tsx
import type { ReactElement } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Button, Group, Stack, Title } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';

import type { GrowRecord } from '@fazole/common';
import { IconEdit, IconPlus } from '@tabler/icons-react';

import { BeanGrowHistory, BeanImageGallery, BeanProperties } from '../../components/beans';
import { ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useAuth } from '../../hooks/use-auth';
import { queryKeys } from '../../lib/queries/keys';
import { useBean, useBeanImages } from '../../lib/queries/beans';
import { useGrowRecords } from '../../lib/queries/grow-records';
import { useSource } from '../../lib/queries/sources';

export function BeanDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: bean, isLoading, isError, error, refetch } = useBean(id ?? '');
  const { data: images } = useBeanImages(id ?? '');
  const { data: source } = useSource(bean?.sourceId);
  const { data: growResult } = useGrowRecords({ filters: { beanId: id }, sortField: 'year', sortDir: 'desc' });

  const invalidateGrow = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.growRecords.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.seasons.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.home.all });
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!bean) return <ErrorState message="Bean not found" />;
```
Then in the JSX, change `<BeanProperties bean={bean} source={source} />` to `<BeanProperties bean={bean} source={source ?? null} />`, and change `onDeleted={refetchGrow}` to `onDeleted={invalidateGrow}`. Leave the rest of the JSX unchanged.

- [ ] **Step 2: Typecheck + manual smoke**

Run: `npm run lint` → PASS (this file).
Run: `npm run dev`, open a bean detail page; confirm it renders bean, images, source, grow history.

- [ ] **Step 3: Commit**
```bash
git add src/pages/beans/BeanDetailPage.tsx
git commit -m "feat(web): migrate BeanDetailPage to TanStack Query"
```

### Task 13: `BeanEditPage` migration

**Files:** Modify `apps/web/src/pages/beans/BeanEditPage.tsx`

- [ ] **Step 1: Rewrite imports + hooks + `handleSave`**

Replace the import block and the top of the component (through the early returns and `handleSave`) with:
```tsx
import type { ReactElement } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Stack, Title } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';

import type { BeanColor, BeanSpecies, PlantType, PodType } from '@fazole/common';

import { BeanForm, BeanImageManager } from '../../components/beans';
import type { BeanFormValues } from '../../components/beans/BeanForm';
import { ErrorState, LoadingState, PageBreadcrumbs } from '../../components/ui';
import { useBean, useBeanImages, useCreateBean, useUpdateBean } from '../../lib/queries/beans';
import { queryKeys } from '../../lib/queries/keys';
import { useSources } from '../../lib/queries/sources';

export function BeanEditPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';
  const beanId = isNew ? '' : id;

  const { data: bean, isLoading: beanLoading, isError: beanError, error } = useBean(beanId);
  const { data: sources } = useSources();
  const { data: images } = useBeanImages(beanId);
  const createMutation = useCreateBean();
  const updateMutation = useUpdateBean();

  if (!isNew && beanLoading) return <LoadingState />;
  if (!isNew && beanError) return <ErrorState message={error.message} />;

  async function handleSave(values: BeanFormValues): Promise<string | void> {
    const data = {
      name: values.name,
      species: values.species as BeanSpecies,
      podType: values.podType as PodType,
      plantType: values.plantType as PlantType,
      beansPerPod: typeof values.beansPerPod === 'number' ? values.beansPerPod : undefined,
      beanSize: typeof values.beanSize === 'number' ? values.beanSize : undefined,
      beanWeight: typeof values.beanWeight === 'number' ? values.beanWeight : undefined,
      beanColor1: (values.beanColor1 as BeanColor) ?? undefined,
      beanColor2: (values.beanColor2 as BeanColor) ?? undefined,
      beanColor3: (values.beanColor3 as BeanColor) ?? undefined,
      sourceId: values.sourceId ?? '',
      description: values.description || undefined,
      sourceDescription: values.sourceDescription || undefined,
    };

    if (isNew) {
      return createMutation.mutateAsync(data);
    }
    await updateMutation.mutateAsync({ id: beanId, data });
  }

  const invalidateImages = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.beans.images(beanId) });
  };
```

- [ ] **Step 2: Update the image manager callback in JSX**

Change `<BeanImageManager beanId={id} images={images ?? []} onChanged={refetchImages} />` to:
```tsx
{!isNew && id && <BeanImageManager beanId={id} images={images ?? []} onChanged={invalidateImages} />}
```
(`beanId={id}` retained — `id` is defined in the `!isNew` branch. Leave the breadcrumb/title JSX unchanged.)

- [ ] **Step 3: Typecheck + smoke**

Run: `npm run lint` → PASS (this file).
Run: `npm run dev`; edit a bean, save → returns to it and shows updated data; upload/delete an image → gallery refreshes.

- [ ] **Step 4: Commit**
```bash
git add src/pages/beans/BeanEditPage.tsx
git commit -m "feat(web): migrate BeanEditPage to TanStack Query mutations"
```

### Task 14: `GrowRecordListPage` migration (keeps pagination)

**Files:** Modify `apps/web/src/pages/grow-records/GrowRecordListPage.tsx`

- [ ] **Step 1: Swap data hooks; keep local filter/sort/page state**

Change the imports: remove `useCallback` from the React import (keep `useMemo`, `useState`); remove
```tsx
import { useQuery } from '../../hooks/use-query';
import { fetchAllBeans } from '../../lib/firestore/beans';
import { fetchGrowRecords } from '../../lib/firestore/grow-records';
```
and add
```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useBeans } from '../../lib/queries/beans';
import { useGrowRecords } from '../../lib/queries/grow-records';
import { queryKeys } from '../../lib/queries/keys';
```
Replace the two `useQuery(...)` blocks with:
```tsx
  const { data: recordsResult, isLoading: loading, isError: error, error: errorObj, refetch } =
    useGrowRecords(fetchOptions);

  const { data: beans } = useBeans();
  const queryClient = useQueryClient();

  const invalidateGrow = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.growRecords.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.seasons.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.home.all });
  };
```
Then update the JSX usages: `{error && <ErrorState message={errorObj.message} onRetry={refetch} />}` and pass `onDeleted={invalidateGrow}` to `GrowRecordTable`. `loading`/`error` booleans keep the existing conditionals working.

- [ ] **Step 2: Typecheck + smoke**

Run: `npm run lint` → PASS.
Run: `npm run dev`; open Grow Records, page through, change filters; delete a record → list refreshes.

- [ ] **Step 3: Commit**
```bash
git add src/pages/grow-records/GrowRecordListPage.tsx
git commit -m "feat(web): migrate GrowRecordListPage to TanStack Query"
```

### Task 15: `GrowRecordEditPage` migration

**Files:** Modify `apps/web/src/pages/grow-records/GrowRecordEditPage.tsx`

- [ ] **Step 1: Swap hooks**

Remove:
```tsx
import { useCallback } from 'react';
import { useQuery } from '../../hooks/use-query';
import { fetchAllBeans } from '../../lib/firestore/beans';
import { createGrowRecord, fetchGrowRecord, updateGrowRecord } from '../../lib/firestore/grow-records';
```
Add:
```tsx
import { useBeans } from '../../lib/queries/beans';
import { useCreateGrowRecord, useGrowRecord, useUpdateGrowRecord } from '../../lib/queries/grow-records';
```
Replace the `record` query and `beans` query with:
```tsx
  const { data: record, isLoading: recordLoading, isError: recordError, error } = useGrowRecord(isNew ? '' : id!);
  const { data: beans } = useBeans();
  const createMutation = useCreateGrowRecord();
  const updateMutation = useUpdateGrowRecord();
```
Update the early returns to use `error.message`:
```tsx
  if (!isNew && recordLoading) return <LoadingState />;
  if (!isNew && recordError) return <ErrorState message={error.message} />;
```
In `handleSave`, replace `return createGrowRecord(data);` with `return createMutation.mutateAsync(data);` and `await updateGrowRecord(id, data);` with `await updateMutation.mutateAsync({ id: id!, data });`.

- [ ] **Step 2: Typecheck + smoke**

Run: `npm run lint` → PASS.
Run: `npm run dev`; create and edit a grow record → list/detail/home reflect the change.

- [ ] **Step 3: Commit**
```bash
git add src/pages/grow-records/GrowRecordEditPage.tsx
git commit -m "feat(web): migrate GrowRecordEditPage to TanStack Query"
```

### Task 16: `SourcesPage` + `UsersPage` migration

**Files:** Modify `apps/web/src/pages/sources/SourcesPage.tsx`, `apps/web/src/pages/users/UsersPage.tsx`

- [ ] **Step 1: `SourcesPage`**

Remove:
```tsx
import { useCallback, useState } from 'react';
import { useQuery } from '../../hooks/use-query';
import { fetchSources } from '../../lib/firestore/sources';
```
Add:
```tsx
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSources } from '../../lib/queries/sources';
import { queryKeys } from '../../lib/queries/keys';
```
Replace the data line with:
```tsx
  const { data: sources, isLoading: loading, isError: error, error: errorObj, refetch } = useSources();
  const queryClient = useQueryClient();

  const invalidateSources = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.beans.all });
  };
```
Change `handleSuccess` to call `invalidateSources()` instead of `refetch()`, pass `onDeleted={invalidateSources}` to `SourceTable`, and update `{error && <ErrorState message={errorObj.message} onRetry={refetch} />}`.

- [ ] **Step 2: `UsersPage`**

Change `import { useAuth, useQuery } from '../../hooks';` to `import { useAuth } from '../../hooks';`, remove `import { fetchUsers } from '../../lib';`, and add:
```tsx
import { useQueryClient } from '@tanstack/react-query';
import { useUsers } from '../../lib/queries/users';
import { queryKeys } from '../../lib/queries/keys';
```
Replace the data line:
```tsx
  const { data: users, isLoading: loading, isError: error, error: errorObj, refetch } = useUsers();
  const queryClient = useQueryClient();
  const invalidateUsers = (): void => void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
```
Update `{error && <ErrorState message={errorObj.message} onRetry={refetch} />}` and pass `onUserUpdated={invalidateUsers}` to `UsersTable`.

- [ ] **Step 3: Typecheck + smoke**

Run: `npm run lint` → PASS.
Run: `npm run dev`; add/edit/delete a source → list refreshes; change a user role → list refreshes.

- [ ] **Step 4: Commit**
```bash
git add src/pages/sources/SourcesPage.tsx src/pages/users/UsersPage.tsx
git commit -m "feat(web): migrate Sources and Users pages to TanStack Query"
```

### Task 17: `HomePage` + `SeasonsPage` migration

**Files:** Modify `apps/web/src/pages/HomePage.tsx`, `apps/web/src/pages/seasons/SeasonsPage.tsx`

- [ ] **Step 1: `HomePage` — drop image fetching (BeanCard self-fetches), wrap composite in TanStack**

Replace imports:
```tsx
import { type ReactElement, useMemo, useState } from 'react';

import { Select, SimpleGrid, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import type { Bean, GrowRecord } from '@fazole/common';

import { BeanCard } from '../components/beans';
import { EmptyState, ErrorState, LoadingState } from '../components/ui';
import { fetchBean } from '../lib/firestore/beans';
import { fetchGrowRecords } from '../lib/firestore/grow-records';
import { queryKeys } from '../lib/queries/keys';
```
Replace the `HomeData` interface and the `fetcher`/`useQuery` block with:
```tsx
interface HomeData {
  beans: Bean[];
}

export function HomePage(): ReactElement {
  const defaultYear = getDefaultYear();
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);

  const yearOptions = useMemo(() => buildYearOptions(), []);

  const { data, isLoading, isError, error, refetch } = useQuery<HomeData>({
    queryKey: queryKeys.home.byYear(selectedYear),
    queryFn: async (): Promise<HomeData> => {
      const { records } = await fetchGrowRecords({ filters: { year: selectedYear } });
      const uniqueBeanIds = [...new Set(records.map((r) => r.beanId))];
      const beans = await Promise.all(uniqueBeanIds.map((id) => fetchBean(id)));
      return { beans };
    },
  });
```
Update the render conditionals to use `isLoading`/`isError`/`error.message`/`refetch`, change the empty check to `(!data || data.beans.length === 0)`, and render:
```tsx
          {data.beans.map((bean) => (
            <BeanCard key={bean.id} bean={bean} />
          ))}
```
Leave `getDefaultYear` / `buildYearOptions` unchanged. The unused `GrowRecord` import can be dropped if `tsc` flags it.

- [ ] **Step 2: `SeasonsPage` — wrap composite in TanStack (keeps imagesMap for SeasonsTable)**

Replace:
```tsx
import { type ReactElement, useCallback } from 'react';
...
import { useQuery } from '../../hooks';
import { fetchBean, fetchBeanImages, fetchGrowRecords } from '../../lib';
```
with:
```tsx
import { type ReactElement } from 'react';
...
import { useQuery } from '@tanstack/react-query';
import { fetchBean } from '../../lib/firestore/beans';
import { fetchBeanImages } from '../../lib/firestore/images';
import { fetchGrowRecords } from '../../lib/firestore/grow-records';
import { queryKeys } from '../../lib/queries/keys';
```
Replace the `useCallback` fetcher + `useQuery(fetcher)` with:
```tsx
  const { data, isLoading, isError, error, refetch } = useQuery<SeasonsData>({
    queryKey: queryKeys.seasons.all,
    queryFn: async (): Promise<SeasonsData> => {
      const { records } = await fetchGrowRecords({ sortField: 'year', sortDir: 'desc' });
      const uniqueBeanIds = [...new Set(records.map((r) => r.beanId))];
      const [beans, images] = await Promise.all([
        Promise.all(uniqueBeanIds.map((id) => fetchBean(id))),
        Promise.all(uniqueBeanIds.map((id) => fetchBeanImages(id))),
      ]);
      const beansMap = new Map(beans.map((b) => [b.id, b]));
      const imagesMap = new Map(uniqueBeanIds.map((id, i) => [id, images[i]!]));
      return { records, beansMap, imagesMap };
    },
  });
```
Update the early returns to `isLoading`/`isError`/`error.message`/`refetch`.

- [ ] **Step 3: Typecheck + smoke**

Run: `npm run lint` → PASS (BeanCard `images` prop now gone everywhere).
Run: `npm run dev`; Home and Seasons render bean cards with images.

- [ ] **Step 4: Commit**
```bash
git add src/pages/HomePage.tsx src/pages/seasons/SeasonsPage.tsx
git commit -m "feat(web): migrate Home and Seasons pages to TanStack Query"
```

---

## Phase 6 — Cleanup & verification

### Task 18: Delete the hand-rolled `useQuery`

**Files:** Delete `apps/web/src/hooks/use-query.ts`, `apps/web/src/__tests__/hooks/use-query.test.ts`; modify `apps/web/src/hooks/index.ts`

- [ ] **Step 1: Confirm no remaining importers**

Run: `grep -rn "use-query\|from '../hooks'\|hooks/use-query" apps/web/src --include=*.ts --include=*.tsx | grep -i query`
Expected: no references to `use-query` outside `hooks/index.ts` and the deletion targets. (If any page still imports `useQuery` from `../hooks`, fix it before deleting.)

- [ ] **Step 2: Delete files + export**
```bash
git rm src/hooks/use-query.ts src/__tests__/hooks/use-query.test.ts
```
In `apps/web/src/hooks/index.ts` remove the line:
```ts
export { useQuery } from './use-query';
```
(leaving the `AuthProvider, useAuth` export).

- [ ] **Step 3: Full verification**

Run: `npm run lint`
Expected: PASS.

Run: `npm test`
Expected: PASS (bean-list-params + beans-select suites green; old use-query suite gone).

- [ ] **Step 4: Commit**
```bash
git add src/hooks/index.ts
git commit -m "chore(web): remove hand-rolled useQuery hook"
```

### Task 19: Manual end-to-end smoke + refactor pass

- [ ] **Step 1: Manual smoke checklist**

Run: `npm run dev`, then verify:
- `/beans`: set several filters + sort + switch to table view → URL reflects them (`?species=…&sort=…&view=table`). Click "Load more" → `loaded=2` in URL, more cards appear.
- Open a bean → back: filters, sort, view, and scroll depth (loaded count) are all preserved; **no full reload/refetch flash**.
- Copy the filtered URL into a new tab → same filtered view reproduced.
- Open a bean you just saw on the list → its images appear instantly (shared cache).
- Edit a bean / add a grow record → detail, list, and Home/Seasons reflect changes without a hard reload.

- [ ] **Step 2: Refactor pass (per CLAUDE.md)**

Invoke the `refactor-ts` skill over the changed files; apply recommended refactorings; re-run `npm test` and `npm run lint`.

- [ ] **Step 3: Commit any refactors**
```bash
git add -A
git commit -m "refactor(web): cleanup pass on bean-browsing migration"
```

---

## Self-Review notes (verified against spec)

- Spec §1 foundation → Tasks 1–3. §2 query layer → Tasks 2,4,5. §3 URL state → Tasks 7,8,11. §4 load-more → Tasks 6,11. §5 per-bean images → Tasks 9,10 (+ Home/Seasons in 17). §6 page migrations + delete hook → Tasks 11–18. §7 error/loading mapping → applied in every page task via `isLoading/isError/error/refetch`. Testing → Tasks 6,7 (pure) + manual smoke (18,19).
- All 8 pages covered: Beans list/detail/edit (11–13), GrowRecord list/edit (14–15), Sources/Users (16), Home/Seasons (17).
- Type consistency: `selectBeans` returns `{beans,total,hasMore}` (Task 6) consumed in Task 11; `BeanListState`/`parseParams`/`toSearchParams` (Task 7) consumed by `useBeanListParams` (Task 8); `queryKeys` shape (Task 2) used by all hooks and invalidation callbacks.
- Caveat carried from spec: server-side scraper edits appear only after a hard refresh.
```
