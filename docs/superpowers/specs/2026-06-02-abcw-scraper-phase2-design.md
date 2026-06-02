# ABCW Scraper Phase 2 — Design (Scrape + Process Pipeline)

Phase 2 turns the Phase 1 dry-run into the real importer for
[A Bean Collector's Window](https://www.abeancollectorswindow.com/): it loads scraped bean varieties (and their images)
into our Firestore/Storage database. It builds on the Phase 1 `@fazole/scraper` app and reuses its `lib/` parsing,
rules, and fetch modules unchanged.

**Phase 1 recap (done):** `dryrun` fetches all 18 pages, parses beans, and writes a CSV + overlap report. Findings that
shaped this design:

- Deterministic rules matched the LLM 100% on `species`/`plantType`/`podType`; the LLM only added value on blanks and
  on colors.
- Color inference from text/name is unreliable — colors should come from the **photo**.
- Bean↔Network name overlap is only ~5% (95% of varieties are unique to one collection).
- The `BeanColor` enum lacks `blue`, which caused a hard extraction failure (*Bird Egg Blue*).

## Goals

- A **two-phase, decoupled** pipeline so the network scrape happens at most once per run and the expensive DB/AI work
  can be re-run offline.
- Idempotent, incremental imports: re-running is cheap and safe; unchanged beans/images aren't re-processed.
- Run safely against the emulator first, then production.

## Commands

Two standalone subcommands in `apps/scraper` (alongside the existing `dryrun`, which is kept as a quick CSV-only
evaluation tool and may be retired later). There is intentionally **no combined command** — chaining the two covers
every case.

| Command | Touches site? | Touches DB? | Purpose |
|---|---|---|---|
| `scrape` | yes (cache-aware) | no | site → local cache (CSV + images + manifest) |
| `process --target emulator\|prod` | no | yes | local cache → Firestore/Storage |

**Phase isolation (the requested control):**

- `scrape` always respects caching: it fetches each page, hashes it, and re-fetches/re-downloads images only for pages
  whose content changed since the last run.
- `process` **never touches the site**. It works purely from the local cache, regardless of staleness. If no cache
  exists, it exits with a clear error (`run \`scrape\` first`).
- "Skip scraping, use what we already have" = just run `process` on its own.
- To do everything: `scrape` then `process`.

```
pnpm --filter @fazole/scraper scrape
pnpm --filter @fazole/scraper process --target emulator
pnpm --filter @fazole/scraper process --target prod
```

## Local cache layout

Default cache dir `./.scraper-cache/` (repo-root relative, gitignored — fixes the Phase 1 gitignore gap where output
landed under `apps/scraper/docs/`). Overridable with `--cache <dir>`.

```
.scraper-cache/
  manifest.json          # { pageId: { hash, fetchedAt, beanSlugs: [...] } }
  beans.csv              # canonical scraped rows (raw fields + rules_* baseline)
  images/<slug>.<ext>    # original downloaded images
  extractions.json       # AI extraction results, keyed by content hash (token cache)
  process-state.<target>.json  # per-target import state for idempotency
```

## Scrape phase

For each of the 18 pages (`buildPageRefs('all')`):

1. Fetch HTML (existing `fetchPage`: browser headers, 1s spacing, 3×/10s retry, abort on failure).
2. Compute `sha256(html)`. If it equals `manifest.json[pageId].hash`, **skip**: reuse the existing CSV rows and images
   for that page. Otherwise continue.
3. Parse with existing `parseBeanPage`; compute `extractRules` for the `rules_*` baseline columns.
4. Download each bean's image to `images/<slug>.<ext>` (skip if the file already exists and the page was unchanged).
5. Update `manifest.json` for the page (hash, timestamp, the bean slugs it produced).

Then write `beans.csv` with columns:

```
name, origin, pageId, slug, imageUrl, localImagePath, alt, packet, rawDescription,
rules_species, rules_plantType, rules_podType
```

(LLM columns are gone — extraction now lives in `process`.) If a page yields 0 beans, log a loud warning and continue.
A page that fails all fetch retries aborts the run (per the original spec).

## Process phase

Reads `beans.csv` + local images only. Errors immediately if the cache is missing.

### 1. Sources

Upsert two `Source` docs with fixed ids:

- `abcw-beans` — name "A Bean Collector's Window — Beans", `link` the site URL.
- `abcw-network` — name "A Bean Collector's Window — Network".

(`color`/`description` set to sensible constants.)

### 2. Extraction — one multimodal call per bean

A single Claude **vision** call per bean receives the downloaded photo + `name` + `rawDescription` and returns
structured fields via forced tool-use:

```ts
{ species: BeanSpecies; plantType: PlantType; podType: PodType; beanColors: BeanColor[]; notes: string }
```

- Model defaults to Sonnet (`claude-sonnet-4-6`) for the quality run; `--model` overrides. This is a deliberate
  one-off token spend for the full DB build.
- Prompt keeps the Phase 1 "where to look" hints (leading type token; `lima`→lima; never `scarlet` from "runner"
  alone) and instructs colors to be read from the **image**, mapped to the `BeanColor` enum, 1–3 most dominant first.
- **Fallbacks:** if the call fails after retries or returns an invalid field, fall back to the deterministic `rules_*`
  value for that field; if a color is outside the enum, **drop that color** (never fail the whole bean — the Phase 1
  bug). `notes` is recorded in `extractions.json` (not stored in Firestore — no field for it).
- **Token cache:** results are written to `extractions.json` keyed by `sha256(name + rawDescription + imageBytes)`.
  Re-running `process` (emulator → prod, or after a fix) reuses cached extractions and spends **no new tokens** unless a
  bean's text or image actually changed.

### 3. Bean upsert

Doc id = slug of the normalized name (`lowercase`, trim, collapse whitespace, non-alphanumerics → `-`), e.g.
`cherokee-trail-of-tears`. Process **bean-origin rows first, network second**; for a name already imported from a bean
page, the network duplicate is skipped (the "prefer bean page" rule — affects the ~48 dual-listed beans).

Fields written:

- create or update: `name` (original display name), `species`, `podType`, `plantType`, `beanColor1/2/3` (from
  `beanColors[0..2]`, omitted if absent), `sourceId` (the origin's source), `sourceDescription` = `rawDescription`,
  `updatedAt`.
- on create only: `createdAt`, `yearsGrown: []`.
- on update: `yearsGrown` is left untouched (owned by grow records); `deletedInSource`/`deletedAt` cleared if the bean
  had been soft-deleted and now reappears.
- not set by the scraper: `beansPerPod`, `beanSize`, `beanWeight` (source has none), `description` (the user's own).

### 4. Images — reuse the existing pipeline

Per bean, mirror the frontend's `uploadBeanImage` flow with the admin SDK:

1. Upsert a `BeanImage` doc at `beans/{beanId}/images/source` (deterministic id `source` → idempotent, satisfies the
   `onImageUpload` path regex) with `type: 'source'`, `primary: true`, **no `year`** (see schema change), `originalPath`,
   `createdAt`/`updatedAt`.
2. Upload the local original to `beans/{beanId}/images/source.<ext>`.
3. The **existing `onImageUpload` Cloud Function** generates the webp/avif variants and fills `paths`/`urls`. The
   scraper does not duplicate that logic. (For `--target emulator`, the full emulator suite — functions + firestore +
   storage — must be running.)

Idempotency: `process-state.<target>.json` records the uploaded image's content hash per bean; upload is skipped when
the local image is unchanged for that target. `--reimport-images` forces re-upload.

### 5. Soft delete

After import, list all beans whose `sourceId` is `abcw-beans` or `abcw-network`. Any whose id is **not** in the current
scrape set → set `deletedInSource: true, deletedAt: now`. (Beans are never hard-deleted by the scraper; reappearing
beans clear the flag in step 3.)

### Target & credentials

- `--target emulator` (default): connect to the running emulator via `FIRESTORE_EMULATOR_HOST` /
  `FIREBASE_STORAGE_EMULATOR_HOST` (ports from `firebase.json`), dummy project id. Safe rehearsal of the full import.
- `--target prod`: `firebase-admin` with service-account credentials from `GOOGLE_APPLICATION_CREDENTIALS` (ADC).
  Defaulting to emulator prevents accidental prod writes.
- `--limit N` caps how many beans are processed (cheap trials). `ANTHROPIC_API_KEY` required (the upfront check from
  Phase 1).

## Schema changes (`packages/common`)

1. **`BeanColor`:** add `'blue'`. Update `constants/bean-colors.ts` and its test accordingly. Color validation in the
   extractor **drops** unknown colors instead of failing.
2. **`BeanImage.year`:** change to `year?: number` (optional); the scraper omits it for source images. Frontend touch:
   `apps/web/src/components/beans/BeanImageManager.tsx` reads/edits `img.year` and `lib/firestore/images.ts`
   `uploadBeanImage` takes a required `year` — update the manager to tolerate `undefined` (display a fallback such as
   "—" for source images); user uploads continue to set a year. This is the only frontend change in scope.

## Error handling & idempotency

- `scrape`: page fetch failure aborts (retry/abort as Phase 1); image download failure for a single bean logs a warning
  and continues (the bean still imports without an image).
- `process`: per-bean failures (extraction, write, upload) are caught, logged, and recorded; one bad bean never aborts
  the run. A run summary reports counts (created/updated/skipped/soft-deleted/failed).
- Re-running either phase is safe: `scrape` is hash-gated; `process` is content-hash gated for both extraction and
  image upload, and all writes are upserts keyed by deterministic ids.

## Testing (per project rules)

Unit-test the pure new units: slug/id normalization, manifest hash-diff (changed/unchanged page detection), source-
precedence dedup (bean wins over network), soft-delete diff (DB set − scrape set), color mapping/validation
(drop-unknown, `blue` accepted). Facades — not unit-tested (no mocking): `download-image`, `extract-multimodal`,
`firestore-import`, `image-upload`. Integration check: `process --target emulator --limit N` against the running
emulator suite.

## Module layout (added to `apps/scraper`)

```
src/commands/scrape.ts          # phase 1: site -> cache (facade/orchestration)
src/commands/process.ts         # phase 2: cache -> DB (facade/orchestration)
src/lib/manifest.ts             # read/write/diff page-hash manifest
src/lib/slug.ts                 # name -> normalized doc id
src/lib/sources.ts              # the two Source definitions
src/lib/download-image.ts       # fetch image bytes -> local file (facade)
src/lib/extract-multimodal.ts   # image+text -> fields+colors via Claude (facade)
src/lib/extraction-cache.ts     # read/write extractions.json (content-hash keyed)
src/lib/firestore-import.ts     # upsert sources/beans, soft-delete (admin facade)
src/lib/image-upload.ts         # create image doc + upload original (admin facade)
src/lib/process-state.ts        # per-target idempotency state
```
New dependency: `firebase-admin`. New scripts: `scrape`, `process`. Reuses Phase 1 `lib/`
(`pages`, `fetch-page`, `parse-bean-page`, `extract-rules`, `types`).

## Out of scope

- Changes to the `onImageUpload` variant pipeline (reused as-is).
- The Phase 1 `dryrun` command (left intact).
- Backfilling `beansPerPod`/`beanSize`/`beanWeight` or the user's own `description`.
- Any new frontend beyond the `BeanImageManager` `year`-optional tweak.
