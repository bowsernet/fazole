# Bean Browsing: URL-Persisted State + TanStack Query Data Layer

**Date:** 2026-06-03
**Status:** Approved — ready for implementation planning

## Problem

The bean browsing feature (`/beans`, `/beans/:id`) has two pain points, both rooted in
state being tied to component lifecycle:

1. **Filters are not preserved.** Filter/sort/page state lives in `useState` inside
   `BeanListPage`. Navigating list → detail → back unmounts the component and loses it.
2. **Everything reloads from scratch on back-navigation.** The hand-rolled `useQuery`
   hook (`apps/web/src/hooks/use-query.ts`) stores fetched data in component state, so an
   unmount discards the cache and a cold refetch runs on return.

The hand-rolled `useQuery` has also shown the classic data-layer footguns (e.g. the
`fetcher`-identity bug fixed in commit `1279e9d`), indicating we've been reimplementing a
caching data layer one bug at a time.

This was evaluated against switching to an SSR framework (Next.js) and rejected: the app is
authenticated client-side via the Firebase SDK + Google Auth, filtering is intentionally
client-side (avoids per-combination composite indexes — see `lib/firestore/beans.ts`), and
the backend story is already covered by `firebase-functions`. SSR would fight the stack and
its main benefit (server-rendered public pages / SEO) does not apply. The two problems are a
**state-location** problem and a **caching** problem — both solvable in the current Vite SPA.

## Goals

- Persist list filters, sort, view mode, and load-depth in the URL (survives navigation,
  shareable, back/forward works).
- Replace the hand-rolled `useQuery` with TanStack Query across the whole app; delete the
  old hook.
- Make back-navigation instant via a cache that survives unmounts.
- Replace traditional pagination with a "load more" pattern.
- Fetch bean images per-bean with shared caching between list and detail.

## Non-Goals

- Server-side pagination / filtering. The dataset is ~1000 beans, loaded client-side. Read
  cost is acknowledged and deferred to a later decision.
- SSR / framework migration.
- Redesigning the Firestore data model or the `lib/firestore/*` fetch/mutate functions
  themselves (the new query layer wraps them as-is).

## Decisions (from brainstorming)

- **Scope:** both changes (URL state + TanStack Query) in one coordinated spec.
- **Migration reach:** all 8 pages migrate to TanStack Query; `use-query.ts` and its test
  are deleted (no two competing data layers).
- **Freshness:** `staleTime: Infinity`, `refetchOnWindowFocus: false`. In-app mutations
  invalidate explicitly. The rare server-side scraper change is picked up on a hard refresh
  (in-memory cache is gone on reload) — accepted caveat.
- **URL params:** all of filters + sort + view mode + load-depth go in the URL.
- **Pagination:** replaced by "load more"; the URL persists the number of pages loaded.
- **Images:** per-bean query keyed `['beanImages', id]`, cached and shared with the detail
  page; fetched inside `BeanCard` / `BeanTableRow`.
- **Query-layer organization:** domain query-hook modules under `lib/queries/` with a
  central key factory.

## Architecture

### 1. TanStack Query foundation

Add `@tanstack/react-query` and `@tanstack/react-query-devtools` (dev only) to
`apps/web`. Create a single `QueryClient` in `main.tsx`, wrapped around the app outside
`AuthProvider`:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,        // only explicit invalidation or a fresh tab refetches
      gcTime: 1000 * 60 * 30,     // keep cache 30 min after the last observer unmounts
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

Provider order in `main.tsx`:
`MantineProvider > DatesProvider > QueryClientProvider > AuthProvider > Notifications + App`.
`ReactQueryDevtools` mounted in dev only.

**Caveat (documented):** server-side scraper edits to Firestore will not appear in an open
session until a full page reload, since nothing in the app invalidates those queries.

### 2. Query-layer structure (`apps/web/src/lib/queries/`)

**`keys.ts`** — central key factory:

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
  growRecords: { list: (beanId: string) => ['growRecords', beanId] as const },
  users: { all: ['users'] as const },
  seasons: { all: ['seasons'] as const },
};
```

**Per-domain hook modules** — thin wrappers over the existing `lib/firestore/*`
functions:

- `beans.ts`: `useBeans()`, `useBean(id)`, `useBeanImages(id)`, `useCreateBean()`,
  `useUpdateBean()`, `useDeleteBean()`, `useAddBeanImage()` / `useDeleteBeanImage()`
  (whatever the image manager needs).
- `sources.ts`: `useSources()`, `useSource(id)` (with `enabled: !!id`), plus source
  mutations.
- `grow-records.ts`: `useGrowRecords(beanId)`, plus grow-record mutations.
- `users.ts`: `useUsers()`, plus user mutations.
- `seasons.ts`: `useSeasons()`, plus season mutations.

Query hooks set `queryKey` from `queryKeys` and `queryFn` from the existing fetch function.
Mutation hooks use `useMutation` with `onSuccess` invalidating the relevant key(s), e.g.
`useUpdateBean` invalidates `queryKeys.beans.all` and `queryKeys.beans.detail(id)`.

These wrappers are coupling chokepoints to TanStack + Firestore and are **not** unit-tested
(per CLAUDE.md: don't test facades over 3rd-party APIs).

### 3. URL-persisted list state

`BeanListPage` removes all `useState` for filters / sort / view / page.

**`apps/web/src/lib/bean-list-params.ts`** — pure functions:

- `parseParams(searchParams: URLSearchParams): BeanListState`
- `toSearchParams(state: BeanListState): URLSearchParams`

`BeanListState` = `{ filters: BeanFiltersState, sort: SortState, view: 'card' | 'table',
loaded: number }`.

**`useBeanListParams()`** hook wraps `useSearchParams` around those pure functions and
returns `{ filters, sort, view, loaded, setFilters, setSort, setView, loadMore }`. Setters
write back via `setSearchParams`.

URL param scheme (defaults omitted to keep links clean):

| State | Param | Example | Default (omitted) |
|---|---|---|---|
| species | `species` | `lima` | none |
| pod type | `pod` | `dry` | none |
| plant type | `plant` | `runner` | none |
| year grown | `year` | `2025` | none |
| bean color | `color` | `red` | none |
| source | `source` | `<sourceId>` | none |
| sort | `sort` | `beanWeight.desc` | `name.asc` |
| view mode | `view` | `table` | `card` |
| pages loaded | `loaded` | `3` | `1` |

Behavior rules:

- Changing any filter or the sort resets `loaded` to `1`.
- Writing a value equal to the default removes its param.
- Invalid / unknown param values fall back to defaults (defensive parsing).

The pure `parseParams` / `toSearchParams` functions **are** unit-tested: round-trip,
defaults-omitted, filter/sort change resets `loaded`, malformed input → defaults.

### 4. Load-more replaces pagination

`apps/web/src/lib/beans-select.ts` — `selectBeans` changes from a single-page slice to a
cumulative slice:

- `SelectBeansOptions` replaces `page` with `loaded` (number of pages loaded, ≥ 1).
- Returns `{ beans, total, hasMore }` where `beans` is the first
  `loaded × PAGINATION_PAGE_SIZE` items of the filtered/sorted set and
  `hasMore = shown < total`.

`PAGINATION_PAGE_SIZE` (= 50, in `packages/config`) is retained as the load-more chunk size.

In `BeanListPage`, the Mantine `<Pagination>` is replaced by a centered **"Load more"**
`Button`, rendered only while `hasMore`, calling `loadMore()` (which increments `loaded` in
the URL).

`selectBeans` unit tests are updated for the cumulative slice and `hasMore`.

### 5. Per-bean cached images

Image fetching moves out of `BeanListPage`:

- `BeanCard` calls `useBeanImages(bean.id)` internally; its `images` prop is removed.
- `BeanTable` is split so each row is a `BeanTableRow` component that calls
  `useBeanImages(bean.id)` (a hook cannot be called inside a `.map`, but one per component
  instance is fine); the `imagesMap` prop is removed.
- `BeanDetailPage` uses `useBeanImages(id)` — sharing the `['beanImages', id]` cache, so a
  bean opened from the list shows its images instantly.

Result: load-more fetches only the newly revealed beans' images; already-seen images stay
cached; list and detail share one cache.

### 6. Page migrations + cleanup

All 8 pages move from `useQuery(useCallback(fetchX))` to the new domain hooks:

- `BeanListPage`, `BeanDetailPage`, `BeanEditPage`
- `GrowRecordListPage`, `GrowRecordEditPage`
- `SourcesPage`, `UsersPage`, `SeasonsPage`, `HomePage`

`enabled` replaces manual "skip if no id" guards (e.g. detail page's source fetch, edit
page's "isNew → null"). Mutation call sites use the mutation hooks; their `onSuccess`
invalidation replaces the current `refetch()` calls and post-`navigate` refresh patterns.

Then delete:

- `apps/web/src/hooks/use-query.ts`
- `apps/web/src/__tests__/hooks/use-query.test.ts`
- the `useQuery` export in `apps/web/src/hooks/index.ts`

### 7. Error / loading mapping

TanStack's `isLoading` / `isError` / `error` / `refetch` map onto the existing
`LoadingState` / `ErrorState` / `EmptyState` components — same UX. `ErrorState`'s retry is
wired to the query's `refetch`.

## Testing

- **Unit (added/updated):**
  - `bean-list-params.ts` — parse/serialize round-trip, defaults omitted, filter/sort change
    resets `loaded`, malformed input → defaults.
  - `beans-select.ts` — cumulative slice across multiple `loaded` values, `hasMore`
    boundary, interaction with filters/sort.
- **Not tested:** query/mutation hook wrappers in `lib/queries/*` (facade chokepoints over
  TanStack + Firestore).

## Out of Scope / Future

- Server-side pagination or filtering if the dataset grows materially beyond ~1000 beans.
- Optimistic updates for mutations (invalidation-only is sufficient for this app's volume).
- Migrating auth state into TanStack Query.
