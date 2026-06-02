# ABCW Scraper Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `@fazole/scraper` with a decoupled two-phase pipeline — `scrape` (site → local cache: CSV + images + page-hash manifest) and `process --target emulator|prod` (cache → Firestore/Storage with a single multimodal extraction per bean) — that imports A Bean Collector's Window beans into the database idempotently.

**Architecture:** `scrape` always fetches the 18 pages (to hash them) but only re-parses + re-downloads images for changed pages; it writes a canonical CSV + local images + `manifest.json`. `process` reads only local files, runs one Claude vision call per bean (photo + text → fields + colors, cached by content hash so re-runs spend no tokens), upserts two `Source` docs and the beans (slug ids, prefer-bean-page dedup), uploads each image to reuse the existing `onImageUpload` variant pipeline, and soft-deletes beans gone from source. Pure logic lives in tested `lib/` units; firebase-admin / Anthropic / fetch calls are untested facades per project rules.

**Tech Stack:** TypeScript strict + `noUncheckedIndexedAccess`, `cheerio`, `@anthropic-ai/sdk` (Claude Sonnet vision, forced tool-use), `firebase-admin`, `csv-stringify` + `csv-parse`, `vitest`, `tsx`. Reuses Phase 1 `lib/` (`pages`, `fetch-page`, `parse-bean-page`, `extract-rules`, `types`) and the existing `onImageUpload` Cloud Function.

**Reference spec:** `docs/superpowers/specs/2026-06-02-abcw-scraper-phase2-design.md`

---

## Shared contracts (used across tasks)

- **`CsvBean`** (the canonical scraped row): `{ name, origin: Origin, pageId, slug, imageUrl, localImagePath, alt, packet, rawDescription, rules: RuleFields }`.
- **Extraction result** reuses Phase 1 **`LlmFields`** from `src/lib/types.ts`: `{ species, plantType, podType, beanColors: BeanColor[], notes }`.
- **Source ids:** `abcw-beans`, `abcw-network`.
- **Bean doc id:** `slugifyName(name)` (e.g. `cherokee-trail-of-tears`).
- **Cache dir:** default `./.scraper-cache/` (repo-root relative), `--cache <dir>` override. Contains `manifest.json`, `beans.csv`, `images/<slug>.<ext>`, `extractions.json`, `process-state.<target>.json`.
- **Emulator ports** (from `firebase.json`): firestore `5043`, storage `5045`. Project id `fazole`.

---

## Task 1: Add `blue` to the BeanColor enum

**Files:**
- Modify: `packages/common/src/types/bean.ts`
- Modify: `packages/common/src/constants/bean-colors.ts`
- Test: `packages/common/src/__tests__/validation/bean-colors.test.ts`

- [ ] **Step 1: Update the failing test first**

In `packages/common/src/__tests__/validation/bean-colors.test.ts`, change the length assertion and add `blue` coverage:

```ts
  it('should contain expected colors', () => {
    expect(BEAN_COLORS).toContain('white');
    expect(BEAN_COLORS).toContain('black');
    expect(BEAN_COLORS).toContain('blue');
    expect(BEAN_COLORS).toHaveLength(8);
  });

  it('should validate valid colors', () => {
    expect(isValidBeanColor('red')).toBe(true);
    expect(isValidBeanColor('purple')).toBe(true);
    expect(isValidBeanColor('blue')).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fazole/common test bean-colors`
Expected: FAIL (length is 7, `blue` missing).

- [ ] **Step 3: Add `blue` to the type and constant**

In `packages/common/src/types/bean.ts`:

```ts
export type BeanColor = 'white' | 'yellow' | 'brown' | 'pink' | 'red' | 'purple' | 'black' | 'blue';
```

In `packages/common/src/constants/bean-colors.ts`, add `'blue'` to the array:

```ts
export const BEAN_COLORS: readonly BeanColor[] = [
  'white',
  'yellow',
  'brown',
  'pink',
  'red',
  'purple',
  'black',
  'blue',
] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @fazole/common test bean-colors`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/common/src/types/bean.ts packages/common/src/constants/bean-colors.ts packages/common/src/__tests__/validation/bean-colors.test.ts
git commit -m "feat(common): add blue to BeanColor"
```

---

## Task 2: Make `BeanImage.year` optional

**Files:**
- Modify: `packages/common/src/types/image.ts`
- Modify: `apps/web/src/components/beans/BeanImageManager.tsx`

- [ ] **Step 1: Make `year` optional in the type**

In `packages/common/src/types/image.ts`, change:

```ts
  year: number;
```
to:
```ts
  year?: number;
```

- [ ] **Step 2: Verify the web app type-checks and find the break**

Run: `pnpm --filter @fazole/web lint`
Expected: a type error in `apps/web/src/components/beans/BeanImageManager.tsx` where `img.year` (now `number | undefined`) is passed to the year `NumberInput`'s `value` prop. (If the web `lint` script is absent, run `pnpm --filter @fazole/web build` instead.)

- [ ] **Step 3: Make BeanImageManager tolerate a missing year**

In `apps/web/src/components/beans/BeanImageManager.tsx`, find the year `NumberInput` (around line 140) and change its value binding to fall back to empty:

```tsx
value={img.year ?? ''}
```

Leave the rest of the component unchanged (new user uploads still default `year: new Date().getFullYear()`; `uploadBeanImage` still takes a required `year`). This is the only frontend change.

- [ ] **Step 4: Verify the web app type-checks**

Run: `pnpm --filter @fazole/web lint`
Expected: PASS (no type errors).

- [ ] **Step 5: Commit**

```bash
git add packages/common/src/types/image.ts apps/web/src/components/beans/BeanImageManager.tsx
git commit -m "feat(common): make BeanImage.year optional for source images"
```

---

## Task 3: Slug helper (`lib/slug.ts`)

**Files:**
- Create: `apps/scraper/src/lib/slug.ts`
- Test: `apps/scraper/src/__tests__/slug.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { slugifyName } from '../lib/slug';

describe('slugifyName', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyName('Cherokee Trail of Tears')).toBe('cherokee-trail-of-tears');
  });

  it('drops punctuation and collapses separators', () => {
    expect(slugifyName('Bird Egg #2')).toBe('bird-egg-2');
    expect(slugifyName("Berry's Best")).toBe('berry-s-best');
  });

  it('trims surrounding whitespace and stray hyphens', () => {
    expect(slugifyName('  Fruhe  Goldbohne ')).toBe('fruhe-goldbohne');
  });

  it('strips diacritics', () => {
    expect(slugifyName('Café Crème')).toBe('cafe-creme');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fazole/scraper test slug`
Expected: FAIL — cannot find module `../lib/slug`.

- [ ] **Step 3: Write the implementation**

```ts
export function slugifyName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, ''); // trim stray hyphens
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @fazole/scraper test slug`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/scraper/src/lib/slug.ts apps/scraper/src/__tests__/slug.test.ts
git commit -m "feat(scraper): add name-to-slug helper"
```

---

## Task 4: Scrape CSV schema (`lib/scrape-csv.ts`)

**Files:**
- Create: `apps/scraper/src/lib/scrape-csv.ts`
- Test: `apps/scraper/src/__tests__/scrape-csv.test.ts`

- [ ] **Step 1: Add the `csv-parse` dependency**

Run: `pnpm --filter @fazole/scraper add csv-parse`
Expected: installs (sibling of the already-present `csv-stringify`).

- [ ] **Step 2: Write the failing test**

```ts
import { stringify } from 'csv-stringify/sync';
import { describe, expect, it } from 'vitest';

import { SCRAPE_COLUMNS, parseScrapeCsv, toScrapeRow } from '../lib/scrape-csv';
import type { CsvBean } from '../lib/scrape-csv';

const bean: CsvBean = {
  name: 'Abundant Little Gem',
  origin: 'bean',
  pageId: 'bean-1',
  slug: 'abundant-little',
  imageUrl: 'https://x/abundant-little.jpg',
  localImagePath: '.scraper-cache/images/abundant-little.jpg',
  alt: 'pinto',
  packet: 'Packet Size 30 Seeds $5.00',
  rawDescription: 'Bush/Dry. Robust, with commas, and\nnewlines.',
  rules: { species: 'vulgaris', plantType: 'bush', podType: 'dry' },
};

describe('scrape-csv', () => {
  it('round-trips a bean through stringify + parse', () => {
    const csv = stringify([toScrapeRow(bean)], { header: true, columns: [...SCRAPE_COLUMNS] });
    const [parsed] = parseScrapeCsv(csv);
    expect(parsed).toEqual(bean);
  });

  it('parses blank rule fields back to empty strings', () => {
    const blanked: CsvBean = { ...bean, rules: { species: 'lima', plantType: '', podType: '' } };
    const csv = stringify([toScrapeRow(blanked)], { header: true, columns: [...SCRAPE_COLUMNS] });
    expect(parseScrapeCsv(csv)[0]?.rules).toEqual({ species: 'lima', plantType: '', podType: '' });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @fazole/scraper test scrape-csv`
Expected: FAIL — cannot find module `../lib/scrape-csv`.

- [ ] **Step 4: Write the implementation**

```ts
import { parse } from 'csv-parse/sync';

import type { BeanSpecies, PlantType, PodType } from '@fazole/common';
import type { Origin, RuleFields } from './types';

export interface CsvBean {
  name: string;
  origin: Origin;
  pageId: string;
  slug: string;
  imageUrl: string;
  localImagePath: string;
  alt: string;
  packet: string;
  rawDescription: string;
  rules: RuleFields;
}

export const SCRAPE_COLUMNS = [
  'name',
  'origin',
  'pageId',
  'slug',
  'imageUrl',
  'localImagePath',
  'alt',
  'packet',
  'rawDescription',
  'rules_species',
  'rules_plantType',
  'rules_podType',
] as const;

export function toScrapeRow(b: CsvBean): Record<string, string> {
  return {
    name: b.name,
    origin: b.origin,
    pageId: b.pageId,
    slug: b.slug,
    imageUrl: b.imageUrl,
    localImagePath: b.localImagePath,
    alt: b.alt,
    packet: b.packet,
    rawDescription: b.rawDescription,
    rules_species: b.rules.species,
    rules_plantType: b.rules.plantType,
    rules_podType: b.rules.podType,
  };
}

export function parseScrapeCsv(csv: string): CsvBean[] {
  const records = parse(csv, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  return records.map((r) => ({
    name: r.name ?? '',
    origin: (r.origin as Origin) ?? 'bean',
    pageId: r.pageId ?? '',
    slug: r.slug ?? '',
    imageUrl: r.imageUrl ?? '',
    localImagePath: r.localImagePath ?? '',
    alt: r.alt ?? '',
    packet: r.packet ?? '',
    rawDescription: r.rawDescription ?? '',
    rules: {
      species: (r.rules_species as BeanSpecies) ?? 'vulgaris',
      plantType: (r.rules_plantType as PlantType | '') ?? '',
      podType: (r.rules_podType as PodType | '') ?? '',
    },
  }));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @fazole/scraper test scrape-csv`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/scraper/src/lib/scrape-csv.ts apps/scraper/src/__tests__/scrape-csv.test.ts apps/scraper/package.json pnpm-lock.yaml
git commit -m "feat(scraper): add scrape CSV schema (read + write)"
```

---

## Task 5: Page-hash manifest (`lib/manifest.ts`)

**Files:**
- Create: `apps/scraper/src/lib/manifest.ts`
- Test: `apps/scraper/src/__tests__/manifest.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { type Manifest, hashContent, isUnchanged } from '../lib/manifest';

describe('manifest', () => {
  it('hashes content deterministically', () => {
    expect(hashContent('<html>a</html>')).toBe(hashContent('<html>a</html>'));
    expect(hashContent('a')).not.toBe(hashContent('b'));
  });

  it('detects unchanged vs changed pages', () => {
    const h = hashContent('page');
    const manifest: Manifest = { 'bean-1': { hash: h, fetchedAt: 1, slugs: ['x'] } };
    expect(isUnchanged(manifest, 'bean-1', h)).toBe(true);
    expect(isUnchanged(manifest, 'bean-1', hashContent('other'))).toBe(false);
    expect(isUnchanged(manifest, 'bean-2', h)).toBe(false); // unknown page
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fazole/scraper test manifest`
Expected: FAIL — cannot find module `../lib/manifest`.

- [ ] **Step 3: Write the implementation**

```ts
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export interface PageEntry {
  hash: string;
  fetchedAt: number;
  slugs: string[];
}

export type Manifest = Record<string, PageEntry>;

export function hashContent(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export function isUnchanged(manifest: Manifest, pageId: string, hash: string): boolean {
  return manifest[pageId]?.hash === hash;
}

export function readManifest(path: string): Manifest {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Manifest) : {};
}

export function writeManifest(path: string, manifest: Manifest): void {
  writeFileSync(path, JSON.stringify(manifest, null, 2));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @fazole/scraper test manifest`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/scraper/src/lib/manifest.ts apps/scraper/src/__tests__/manifest.test.ts
git commit -m "feat(scraper): add page-hash manifest"
```

---

## Task 6: Image downloader (`lib/download-image.ts`) — facade, untested

**Files:**
- Create: `apps/scraper/src/lib/download-image.ts`

- [ ] **Step 1: Write the implementation**

```ts
import { writeFileSync } from 'node:fs';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
};

export async function downloadImage(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buffer);
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @fazole/scraper lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/scraper/src/lib/download-image.ts
git commit -m "feat(scraper): add image downloader"
```

---

## Task 7: `scrape` command + script + gitignore

**Files:**
- Create: `apps/scraper/src/commands/scrape.ts`
- Modify: `apps/scraper/src/index.ts`
- Modify: `apps/scraper/package.json` (add `scrape` script)
- Modify: `package.json` (root — add `scrape` convenience script)
- Modify: `.gitignore`

- [ ] **Step 1: Write `apps/scraper/src/commands/scrape.ts`**

```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { parseArgs } from 'node:util';

import { stringify } from 'csv-stringify/sync';

import { extractRules } from '../lib/extract-rules';
import { fetchPage } from '../lib/fetch-page';
import { type Manifest, hashContent, isUnchanged, readManifest, writeManifest } from '../lib/manifest';
import { buildPageRefs } from '../lib/pages';
import { parseBeanPage } from '../lib/parse-bean-page';
import { downloadImage } from '../lib/download-image';
import { SCRAPE_COLUMNS, type CsvBean, parseScrapeCsv, toScrapeRow } from '../lib/scrape-csv';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function imageExt(url: string): string {
  const ext = extname(new URL(url).pathname).replace('.', '').toLowerCase();
  return ext || 'jpg';
}

export async function scrape(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv.filter((a) => a !== '--'),
    options: { cache: { type: 'string', default: '.scraper-cache' } },
  });
  const cacheDir = values.cache ?? '.scraper-cache';
  const imagesDir = join(cacheDir, 'images');
  const csvPath = join(cacheDir, 'beans.csv');
  const manifestPath = join(cacheDir, 'manifest.json');
  mkdirSync(imagesDir, { recursive: true });

  const manifest: Manifest = readManifest(manifestPath);
  const previous = existsSync(csvPath) ? parseScrapeCsv(readFileSync(csvPath, 'utf8')) : [];
  const previousByPage = new Map<string, CsvBean[]>();
  for (const b of previous) {
    previousByPage.set(b.pageId, [...(previousByPage.get(b.pageId) ?? []), b]);
  }

  const beans: CsvBean[] = [];
  const refs = buildPageRefs('all');

  for (const [i, ref] of refs.entries()) {
    if (i > 0) await sleep(1000); // 1s spacing
    console.log(`Fetching ${ref.pageId} — ${ref.url}`);
    const html = await fetchPage(ref.url);
    const hash = hashContent(html);

    if (isUnchanged(manifest, ref.pageId, hash) && previousByPage.has(ref.pageId)) {
      console.log(`  unchanged — reusing cached rows + images`);
      beans.push(...previousByPage.get(ref.pageId)!);
      continue;
    }

    const parsed = parseBeanPage(html, ref.url);
    if (parsed.length === 0) console.warn(`WARNING: ${ref.pageId} yielded 0 beans — selector regression?`);

    for (const p of parsed) {
      const localImagePath = join(imagesDir, `${p.slug}.${imageExt(p.imageUrl)}`);
      try {
        await downloadImage(p.imageUrl, localImagePath);
      } catch (err) {
        console.warn(`  image download failed for ${p.slug}: ${String(err)}`);
      }
      beans.push({
        ...p,
        origin: ref.origin,
        pageId: ref.pageId,
        localImagePath,
        rules: extractRules(p),
      });
    }
    manifest[ref.pageId] = { hash, fetchedAt: Date.now(), slugs: parsed.map((p) => p.slug) };
  }

  writeFileSync(csvPath, stringify(beans.map(toScrapeRow), { header: true, columns: [...SCRAPE_COLUMNS] }));
  writeManifest(manifestPath, manifest);
  console.log(`Scraped ${beans.length} beans → ${csvPath} (cache: ${cacheDir})`);
}
```

- [ ] **Step 2: Route the `scrape` subcommand in `apps/scraper/src/index.ts`**

Replace the file with:

```ts
import { dryrun } from './commands/dryrun';
import { scrape } from './commands/scrape';

const [command, ...rest] = process.argv.slice(2);

const commands: Record<string, (argv: string[]) => Promise<void>> = {
  dryrun,
  scrape,
};

const handler = command ? commands[command] : undefined;
if (handler) {
  handler(rest).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.error(
    `Unknown command: ${command ?? '(none)'}.\nUsage: scrape [--cache DIR] | process --target emulator|prod [...] | dryrun [...]`,
  );
  process.exit(1);
}
```

- [ ] **Step 3: Add the `scrape` package script**

In `apps/scraper/package.json` `"scripts"`, add:

```json
    "scrape": "tsx src/index.ts scrape",
```

- [ ] **Step 4: Add root convenience script + gitignore the cache**

In root `package.json` `"scripts"` add:

```json
    "scrape": "pnpm --filter @fazole/scraper scrape",
```

Append to `.gitignore`:

```
# ABCW scraper local cache
.scraper-cache/
```

- [ ] **Step 5: Type-check**

Run: `pnpm --filter @fazole/scraper lint`
Expected: PASS.

- [ ] **Step 6: Real run to verify end-to-end (network needed, no API key)**

Run: `pnpm --filter @fazole/scraper scrape`
Expected: fetches all 18 pages, downloads ~1000 images into `.scraper-cache/images/`, writes `.scraper-cache/beans.csv` and `manifest.json`. Re-running immediately should log "unchanged — reusing cached rows + images" for every page and not re-download. Spot-check that `beans.csv` has the `localImagePath` column populated and a few images exist on disk.

- [ ] **Step 7: Commit**

```bash
git add apps/scraper/src/commands/scrape.ts apps/scraper/src/index.ts apps/scraper/package.json package.json .gitignore
git commit -m "feat(scraper): add scrape command (site -> local cache)"
```

---

## Task 8: Source definitions (`lib/sources.ts`)

**Files:**
- Create: `apps/scraper/src/lib/sources.ts`

- [ ] **Step 1: Write the implementation**

```ts
import type { Origin } from './types';

export interface SourceSeed {
  id: string;
  name: string;
  color: string;
  link: string;
  description: string;
}

export const ABCW_SOURCES: SourceSeed[] = [
  {
    id: 'abcw-beans',
    name: "A Bean Collector's Window — Beans",
    color: '#6b4f2a',
    link: 'https://www.abeancollectorswindow.com/',
    description: "Main bean catalog from A Bean Collector's Window.",
  },
  {
    id: 'abcw-network',
    name: "A Bean Collector's Window — Network",
    color: '#9c7a3c',
    link: 'https://www.abeancollectorswindow.com/',
    description: "Network collection (other collectors' beans) from A Bean Collector's Window.",
  },
];

export function sourceIdForOrigin(origin: Origin): string {
  return origin === 'bean' ? 'abcw-beans' : 'abcw-network';
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @fazole/scraper lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/scraper/src/lib/sources.ts
git commit -m "feat(scraper): add ABCW source definitions"
```

---

## Task 9: Extraction coercion (`lib/coerce-extraction.ts`)

**Files:**
- Create: `apps/scraper/src/lib/coerce-extraction.ts`
- Test: `apps/scraper/src/__tests__/coerce-extraction.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { coerceExtraction } from '../lib/coerce-extraction';
import type { RuleFields } from '../lib/types';

const rules: RuleFields = { species: 'vulgaris', plantType: 'bush', podType: 'dry' };

describe('coerceExtraction', () => {
  it('keeps valid fields and valid colors (including blue)', () => {
    const r = coerceExtraction(
      { species: 'lima', plantType: 'runner', podType: 'snap', beanColors: ['white', 'blue'], notes: 'ok' },
      rules,
    );
    expect(r).toEqual({ species: 'lima', plantType: 'runner', podType: 'snap', beanColors: ['white', 'blue'], notes: 'ok' });
  });

  it('drops unknown colors instead of failing', () => {
    const r = coerceExtraction({ species: 'vulgaris', plantType: 'bush', podType: 'dry', beanColors: ['white', 'teal', 5], notes: '' }, rules);
    expect(r.beanColors).toEqual(['white']);
  });

  it('falls back to rules for invalid/missing fields', () => {
    const r = coerceExtraction({ species: 'bogus', beanColors: [] }, rules);
    expect(r.species).toBe('vulgaris');
    expect(r.plantType).toBe('bush');
    expect(r.podType).toBe('dry');
  });

  it('defaults blank rule fields (bush/dry) when both LLM and rules are empty', () => {
    const r = coerceExtraction({}, { species: 'lima', plantType: '', podType: '' });
    expect(r.plantType).toBe('bush');
    expect(r.podType).toBe('dry');
    expect(r.species).toBe('lima');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fazole/scraper test coerce-extraction`
Expected: FAIL — cannot find module `../lib/coerce-extraction`.

- [ ] **Step 3: Write the implementation**

```ts
import { isValidBeanColor } from '@fazole/common';
import type { BeanColor, BeanSpecies, PlantType, PodType } from '@fazole/common';

import type { LlmFields, RuleFields } from './types';

const SPECIES: BeanSpecies[] = ['vulgaris', 'lima', 'scarlet'];
const PLANT_TYPES: PlantType[] = ['bush', 'semi', 'runner'];
const POD_TYPES: PodType[] = ['snap', 'dry'];

export function coerceExtraction(raw: unknown, rules: RuleFields): LlmFields {
  const o = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

  const species = SPECIES.includes(o.species as BeanSpecies) ? (o.species as BeanSpecies) : rules.species || 'vulgaris';
  const plantType = PLANT_TYPES.includes(o.plantType as PlantType) ? (o.plantType as PlantType) : rules.plantType || 'bush';
  const podType = POD_TYPES.includes(o.podType as PodType) ? (o.podType as PodType) : rules.podType || 'dry';

  const beanColors = Array.isArray(o.beanColors)
    ? o.beanColors.filter((c): c is BeanColor => typeof c === 'string' && isValidBeanColor(c))
    : [];

  return { species, plantType, podType, beanColors, notes: typeof o.notes === 'string' ? o.notes : '' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @fazole/scraper test coerce-extraction`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/scraper/src/lib/coerce-extraction.ts apps/scraper/src/__tests__/coerce-extraction.test.ts
git commit -m "feat(scraper): add extraction coercion (rules fallback, drop-unknown colors)"
```

---

## Task 10: Multimodal extractor (`lib/extract-multimodal.ts`) — facade, untested

**Files:**
- Create: `apps/scraper/src/lib/extract-multimodal.ts`

> Use the `context7` MCP to confirm the current `@anthropic-ai/sdk` image content-block shape (`{ type: 'image', source: { type: 'base64', media_type, data } }`) and tool-use response handling. Adjust to match the installed v0.65 SDK if needed.

- [ ] **Step 1: Write the implementation**

```ts
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

import Anthropic from '@anthropic-ai/sdk';

import { coerceExtraction } from './coerce-extraction';
import type { CsvBean } from './scrape-csv';
import type { LlmFields } from './types';

export const DEFAULT_MODEL = 'claude-sonnet-4-6';

const TOOL: Anthropic.Tool = {
  name: 'record_bean',
  description: 'Record the structured attributes of a single bean variety.',
  input_schema: {
    type: 'object',
    properties: {
      species: { type: 'string', enum: ['vulgaris', 'lima', 'scarlet'] },
      plantType: { type: 'string', enum: ['bush', 'semi', 'runner'] },
      podType: { type: 'string', enum: ['snap', 'dry'] },
      beanColors: {
        type: 'array',
        items: { type: 'string', enum: ['white', 'yellow', 'brown', 'pink', 'red', 'purple', 'black', 'blue'] },
      },
      notes: { type: 'string', description: 'Extraction caveats or low-confidence flags.' },
    },
    required: ['species', 'plantType', 'podType', 'beanColors', 'notes'],
  },
};

function mediaType(path: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  const ext = extname(path).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function prompt(bean: CsvBean): string {
  return [
    'Extract structured attributes for this heirloom bean variety. You are shown the seed photo plus catalog text.',
    '',
    `Name: ${bean.name}`,
    `Image alt text: ${bean.alt}`,
    `Description: ${bean.rawDescription}`,
    '',
    'Guidance:',
    '- plantType / podType usually appear as a leading token like "Bush/Dry", "Pole lima", "Runner/Snap".',
    '- species: "lima" in the text means lima; only use "scarlet" for an explicit Phaseolus coccineus / scarlet runner — never infer it from the word "runner" alone.',
    '- beanColors: read the SEED colors primarily from the PHOTO (the text/name is a weak hint). Map to the closest of: white, yellow, brown, pink, red, purple, black, blue. List 1-3, most dominant first.',
  ].join('\n');
}

export async function extractMultimodal(
  client: Anthropic,
  bean: CsvBean,
  model: string = DEFAULT_MODEL,
  retries = 2,
): Promise<LlmFields> {
  const data = readFileSync(bean.localImagePath).toString('base64');
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await client.messages.create({
        model,
        max_tokens: 1024,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'record_bean' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType(bean.localImagePath), data } },
              { type: 'text', text: prompt(bean) },
            ],
          },
        ],
      });
      const block = res.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
      if (!block) throw new Error('no tool_use block in response');
      return coerceExtraction(block.input, bean.rules);
    } catch (err) {
      lastError = err;
      if (attempt <= retries) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error(`multimodal extraction failed for "${bean.name}": ${String(lastError)}`);
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @fazole/scraper lint`
Expected: PASS. Adjust SDK type names / content-block shape to match v0.65 if `tsc` complains (confirm via context7).

- [ ] **Step 3: Commit**

```bash
git add apps/scraper/src/lib/extract-multimodal.ts
git commit -m "feat(scraper): add multimodal (photo+text) extractor"
```

---

## Task 11: Extraction cache (`lib/extraction-cache.ts`)

**Files:**
- Create: `apps/scraper/src/lib/extraction-cache.ts`
- Test: `apps/scraper/src/__tests__/extraction-cache.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractionKey, readExtractionCache, writeExtractionCache } from '../lib/extraction-cache';
import type { LlmFields } from '../lib/types';

describe('extraction-cache', () => {
  it('keys deterministically on name + description + image hash', () => {
    expect(extractionKey('A', 'desc', 'h1')).toBe(extractionKey('A', 'desc', 'h1'));
    expect(extractionKey('A', 'desc', 'h1')).not.toBe(extractionKey('A', 'desc', 'h2'));
  });

  it('round-trips through disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'extcache-'));
    const path = join(dir, 'extractions.json');
    const fields: LlmFields = { species: 'lima', plantType: 'runner', podType: 'dry', beanColors: ['white'], notes: 'n' };
    writeExtractionCache(path, { k1: fields });
    expect(readExtractionCache(path)).toEqual({ k1: fields });
  });

  it('returns empty object when the file is missing', () => {
    expect(readExtractionCache(join(tmpdir(), 'does-not-exist-xyz.json'))).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fazole/scraper test extraction-cache`
Expected: FAIL — cannot find module `../lib/extraction-cache`.

- [ ] **Step 3: Write the implementation**

```ts
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import type { LlmFields } from './types';

export type ExtractionCache = Record<string, LlmFields>;

export function extractionKey(name: string, rawDescription: string, imageHash: string): string {
  return createHash('sha256').update(`${name}\n${rawDescription}\n${imageHash}`).digest('hex');
}

export function readExtractionCache(path: string): ExtractionCache {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as ExtractionCache) : {};
}

export function writeExtractionCache(path: string, cache: ExtractionCache): void {
  writeFileSync(path, JSON.stringify(cache, null, 2));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @fazole/scraper test extraction-cache`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/scraper/src/lib/extraction-cache.ts apps/scraper/src/__tests__/extraction-cache.test.ts
git commit -m "feat(scraper): add content-hash extraction cache"
```

---

## Task 12: Import planning (`lib/import-plan.ts`)

**Files:**
- Create: `apps/scraper/src/lib/import-plan.ts`
- Test: `apps/scraper/src/__tests__/import-plan.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { computeSoftDeletes, dedupeByPreferBean } from '../lib/import-plan';
import type { CsvBean } from '../lib/scrape-csv';

function bean(name: string, origin: 'bean' | 'network'): CsvBean {
  return {
    name,
    origin,
    pageId: origin === 'bean' ? 'bean-1' : 'network-1',
    slug: name.toLowerCase(),
    imageUrl: '',
    localImagePath: '',
    alt: '',
    packet: '',
    rawDescription: '',
    rules: { species: 'vulgaris', plantType: '', podType: '' },
  };
}

describe('dedupeByPreferBean', () => {
  it('keeps the bean-page row when a name appears in both collections', () => {
    const out = dedupeByPreferBean([bean('Rattlesnake', 'network'), bean('Rattlesnake', 'bean'), bean('Hidatsa', 'network')]);
    expect(out).toHaveLength(2);
    const rattlesnake = out.find((b) => b.name === 'Rattlesnake');
    expect(rattlesnake?.origin).toBe('bean');
  });
});

describe('computeSoftDeletes', () => {
  it('returns existing ids that are absent from the scrape set', () => {
    expect(computeSoftDeletes(['a', 'b', 'c'], ['a', 'c'])).toEqual(['b']);
    expect(computeSoftDeletes(['a'], ['a'])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fazole/scraper test import-plan`
Expected: FAIL — cannot find module `../lib/import-plan`.

- [ ] **Step 3: Write the implementation**

```ts
import { slugifyName } from './slug';
import type { CsvBean } from './scrape-csv';

export function dedupeByPreferBean(beans: CsvBean[]): CsvBean[] {
  // Bean-origin rows take precedence over network for the same slug id.
  const ordered = [...beans].sort((a, b) => (a.origin === 'bean' ? 0 : 1) - (b.origin === 'bean' ? 0 : 1));
  const seen = new Set<string>();
  const out: CsvBean[] = [];
  for (const b of ordered) {
    const id = slugifyName(b.name);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(b);
  }
  return out;
}

export function computeSoftDeletes(existingIds: string[], scrapeIds: string[]): string[] {
  const present = new Set(scrapeIds);
  return existingIds.filter((id) => !present.has(id));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @fazole/scraper test import-plan`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/scraper/src/lib/import-plan.ts apps/scraper/src/__tests__/import-plan.test.ts
git commit -m "feat(scraper): add import planning (prefer-bean dedup, soft-delete diff)"
```

---

## Task 13: Firebase-admin init (`lib/admin.ts`) — facade, untested

**Files:**
- Create: `apps/scraper/src/lib/admin.ts`

- [ ] **Step 1: Add the `firebase-admin` dependency**

Run: `pnpm --filter @fazole/scraper add firebase-admin`
Expected: installs.

- [ ] **Step 2: Write the implementation**

```ts
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { type Firestore, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

export type Target = 'emulator' | 'prod';

const PROJECT_ID = 'fazole';
const STORAGE_BUCKET = process.env.SCRAPER_STORAGE_BUCKET ?? 'fazole.firebasestorage.app';
// Emulator ports mirror firebase.json.
const FIRESTORE_EMULATOR = '127.0.0.1:5043';
const STORAGE_EMULATOR = '127.0.0.1:5045';

export function initAdmin(target: Target): void {
  if (getApps().length > 0) return;
  if (target === 'emulator') {
    process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR;
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = STORAGE_EMULATOR;
    initializeApp({ projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET });
  } else {
    initializeApp({ projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET, credential: applicationDefault() });
  }
}

export function db(): Firestore {
  return getFirestore();
}

export function bucket() {
  return getStorage().bucket();
}
```

> For `--target prod`, set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account key path and confirm `SCRAPER_STORAGE_BUCKET` matches the project's real bucket (check the Firebase console; the default above is the modern `*.firebasestorage.app` form).

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @fazole/scraper lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/scraper/src/lib/admin.ts apps/scraper/package.json pnpm-lock.yaml
git commit -m "feat(scraper): add firebase-admin init (emulator/prod)"
```

---

## Task 14: Firestore import (`lib/firestore-import.ts`) — facade, untested

**Files:**
- Create: `apps/scraper/src/lib/firestore-import.ts`

- [ ] **Step 1: Write the implementation**

```ts
import { FieldValue } from 'firebase-admin/firestore';

import { db } from './admin';
import { ABCW_SOURCES } from './sources';
import { slugifyName } from './slug';
import type { CsvBean } from './scrape-csv';
import type { LlmFields } from './types';

export async function upsertSources(): Promise<void> {
  const now = Date.now();
  for (const s of ABCW_SOURCES) {
    await db()
      .collection('sources')
      .doc(s.id)
      .set(
        { name: s.name, color: s.color, link: s.link, description: s.description, updatedAt: now, createdAt: now },
        { merge: true },
      );
  }
}

export async function upsertBean(bean: CsvBean, fields: LlmFields, sourceId: string): Promise<string> {
  const id = slugifyName(bean.name);
  const ref = db().collection('beans').doc(id);
  const snap = await ref.get();
  const now = Date.now();

  const data: Record<string, unknown> = {
    name: bean.name,
    species: fields.species,
    plantType: fields.plantType,
    podType: fields.podType,
    beanColor1: fields.beanColors[0] ?? FieldValue.delete(),
    beanColor2: fields.beanColors[1] ?? FieldValue.delete(),
    beanColor3: fields.beanColors[2] ?? FieldValue.delete(),
    sourceId,
    sourceDescription: bean.rawDescription,
    updatedAt: now,
  };

  if (!snap.exists) {
    data.createdAt = now;
    data.yearsGrown = [];
  } else {
    // Clear soft-delete markers if the bean has reappeared.
    data.deletedInSource = FieldValue.delete();
    data.deletedAt = FieldValue.delete();
  }

  await ref.set(data, { merge: true });
  return id;
}

export async function listAbcwBeanIds(): Promise<string[]> {
  const snap = await db().collection('beans').where('sourceId', 'in', ['abcw-beans', 'abcw-network']).get();
  return snap.docs.map((d) => d.id);
}

export async function markDeletedInSource(ids: string[]): Promise<void> {
  const now = Date.now();
  for (let i = 0; i < ids.length; i += 400) {
    const batch = db().batch();
    for (const id of ids.slice(i, i + 400)) {
      batch.update(db().collection('beans').doc(id), { deletedInSource: true, deletedAt: now, updatedAt: now });
    }
    await batch.commit();
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @fazole/scraper lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/scraper/src/lib/firestore-import.ts
git commit -m "feat(scraper): add Firestore import (upsert sources/beans, soft-delete)"
```

---

## Task 15: Image upload + process state

**Files:**
- Create: `apps/scraper/src/lib/image-upload.ts`
- Create: `apps/scraper/src/lib/process-state.ts`
- Test: `apps/scraper/src/__tests__/process-state.test.ts`

- [ ] **Step 1: Write `apps/scraper/src/lib/image-upload.ts` (facade)**

```ts
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';

import { bucket, db } from './admin';

export function fileHash(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export async function uploadSourceImage(beanId: string, localPath: string): Promise<void> {
  if (!existsSync(localPath)) return;
  const ext = (extname(localPath).replace('.', '') || 'jpg').toLowerCase();
  const storagePath = `beans/${beanId}/images/source.${ext}`;
  const imageRef = db().collection('beans').doc(beanId).collection('images').doc('source');
  const snap = await imageRef.get();
  const now = Date.now();

  await imageRef.set(
    {
      type: 'source',
      primary: true,
      paths: {},
      urls: {},
      originalPath: storagePath,
      updatedAt: now,
      ...(snap.exists ? {} : { createdAt: now }),
    },
    { merge: true },
  );

  await bucket().upload(localPath, {
    destination: storagePath,
    metadata: { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` },
  });
}
```

- [ ] **Step 2: Write the failing test for `process-state`**

```ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { imageNeedsUpload, readState, statePath, writeState } from '../lib/process-state';

describe('process-state', () => {
  it('builds a per-target state path', () => {
    expect(statePath('.cache', 'emulator')).toBe('.cache/process-state.emulator.json');
    expect(statePath('.cache', 'prod')).toBe('.cache/process-state.prod.json');
  });

  it('round-trips state through disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pstate-'));
    const path = join(dir, 'process-state.emulator.json');
    writeState(path, { 'bean-x': { imageHash: 'h1' } });
    expect(readState(path)).toEqual({ 'bean-x': { imageHash: 'h1' } });
    expect(readState(join(dir, 'missing.json'))).toEqual({});
  });

  it('decides when an image needs upload', () => {
    const state = { 'bean-x': { imageHash: 'h1' } };
    expect(imageNeedsUpload(state, 'bean-x', 'h1', false)).toBe(false); // unchanged
    expect(imageNeedsUpload(state, 'bean-x', 'h2', false)).toBe(true); // changed
    expect(imageNeedsUpload(state, 'bean-new', 'h1', false)).toBe(true); // unseen
    expect(imageNeedsUpload(state, 'bean-x', 'h1', true)).toBe(true); // forced
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @fazole/scraper test process-state`
Expected: FAIL — cannot find module `../lib/process-state`.

- [ ] **Step 4: Write `apps/scraper/src/lib/process-state.ts`**

```ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Target } from './admin';

export type ProcessState = Record<string, { imageHash: string }>;

export function statePath(cacheDir: string, target: Target): string {
  return join(cacheDir, `process-state.${target}.json`);
}

export function readState(path: string): ProcessState {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as ProcessState) : {};
}

export function writeState(path: string, state: ProcessState): void {
  writeFileSync(path, JSON.stringify(state, null, 2));
}

export function imageNeedsUpload(state: ProcessState, beanId: string, imageHash: string, force: boolean): boolean {
  if (force) return true;
  return state[beanId]?.imageHash !== imageHash;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @fazole/scraper test process-state`
Expected: PASS (3 tests). Then `pnpm --filter @fazole/scraper lint` — PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/scraper/src/lib/image-upload.ts apps/scraper/src/lib/process-state.ts apps/scraper/src/__tests__/process-state.test.ts
git commit -m "feat(scraper): add image upload + per-target process state"
```

---

## Task 16: `process` command + script

**Files:**
- Create: `apps/scraper/src/commands/process.ts`
- Modify: `apps/scraper/src/index.ts` (register `process`)
- Modify: `apps/scraper/package.json` (add `process` script)
- Modify: `package.json` (root — add `process` convenience script)

- [ ] **Step 1: Write `apps/scraper/src/commands/process.ts`**

```ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import Anthropic from '@anthropic-ai/sdk';

import { type Target, initAdmin } from '../lib/admin';
import { mapWithConcurrency } from '../lib/concurrency';
import { extractMultimodal } from '../lib/extract-multimodal';
import { coerceExtraction } from '../lib/coerce-extraction';
import { extractionKey, readExtractionCache, writeExtractionCache } from '../lib/extraction-cache';
import { fileHash, uploadSourceImage } from '../lib/image-upload';
import { computeSoftDeletes, dedupeByPreferBean } from '../lib/import-plan';
import { listAbcwBeanIds, markDeletedInSource, upsertBean, upsertSources } from '../lib/firestore-import';
import { parseScrapeCsv } from '../lib/scrape-csv';
import { slugifyName } from '../lib/slug';
import { sourceIdForOrigin } from '../lib/sources';
import { type ProcessState, imageNeedsUpload, readState, statePath, writeState } from '../lib/process-state';

export async function process_(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv.filter((a) => a !== '--'),
    options: {
      target: { type: 'string', default: 'emulator' },
      cache: { type: 'string', default: '.scraper-cache' },
      limit: { type: 'string' },
      model: { type: 'string' },
      'reimport-images': { type: 'boolean', default: false },
    },
  });

  const target = values.target ?? 'emulator';
  if (target !== 'emulator' && target !== 'prod') {
    throw new Error(`--target must be emulator|prod, got "${target}"`);
  }
  const cacheDir = values.cache ?? '.scraper-cache';
  const csvPath = join(cacheDir, 'beans.csv');
  if (!existsSync(csvPath)) {
    throw new Error(`No cache at ${csvPath}. Run \`scrape\` first.`);
  }
  const limit = values.limit === undefined ? undefined : Number(values.limit);
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error(`--limit must be a positive integer, got "${values.limit}"`);
  }
  const forceImages = values['reimport-images'] ?? false;

  const allBeans = dedupeByPreferBean(parseScrapeCsv(readFileSync(csvPath, 'utf8')));
  const work = limit ? allBeans.slice(0, limit) : allBeans;

  initAdmin(target as Target);
  await upsertSources();

  const extractionsPath = join(cacheDir, 'extractions.json');
  const cache = readExtractionCache(extractionsPath);
  const sPath = statePath(cacheDir, target as Target);
  const state: ProcessState = readState(sPath);

  let client: Anthropic | undefined;
  const getClient = (): Anthropic => {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set (needed for uncached extractions).');
    }
    client ??= new Anthropic();
    return client;
  };

  const summary = { created: 0, updated: 0, imagesUploaded: 0, failed: 0 };

  await mapWithConcurrency(work, 5, async (bean) => {
    try {
      const hasImage = bean.localImagePath !== '' && existsSync(bean.localImagePath);
      const imageHash = hasImage ? fileHash(bean.localImagePath) : '';
      const key = extractionKey(bean.name, bean.rawDescription, imageHash);

      let fields = cache[key];
      if (!fields) {
        fields = hasImage
          ? await extractMultimodal(getClient(), bean, values.model ?? undefined).catch(() =>
              coerceExtraction({}, bean.rules),
            )
          : coerceExtraction({}, bean.rules);
        cache[key] = fields;
      }

      const id = await upsertBean(bean, fields, sourceIdForOrigin(bean.origin));

      if (hasImage && imageNeedsUpload(state, id, imageHash, forceImages)) {
        await uploadSourceImage(id, bean.localImagePath);
        state[id] = { imageHash };
        summary.imagesUploaded++;
      }
      summary.updated++;
    } catch (err) {
      summary.failed++;
      console.warn(`failed: ${bean.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  writeExtractionCache(extractionsPath, cache);
  writeState(sPath, state);

  // Soft-delete only on a full run (a --limit run hasn't seen every bean).
  if (!limit) {
    const scrapeIds = allBeans.map((b) => slugifyName(b.name));
    const existing = await listAbcwBeanIds();
    const toDelete = computeSoftDeletes(existing, scrapeIds);
    if (toDelete.length > 0) await markDeletedInSource(toDelete);
    console.log(`Soft-deleted ${toDelete.length} beans gone from source.`);
  } else {
    console.log(`--limit set: skipped soft-delete pass.`);
  }

  console.log(
    `Processed ${work.length}/${allBeans.length} beans → ${target} | images uploaded: ${summary.imagesUploaded} | failed: ${summary.failed}`,
  );
}
```

> Note: the function is named `process_` (trailing underscore) because `process` is a Node global. Register it under the command name `process`.

- [ ] **Step 2: Register `process` in `apps/scraper/src/index.ts`**

Update the imports and the command map:

```ts
import { dryrun } from './commands/dryrun';
import { process_ } from './commands/process';
import { scrape } from './commands/scrape';

const [command, ...rest] = process.argv.slice(2);

const commands: Record<string, (argv: string[]) => Promise<void>> = {
  dryrun,
  scrape,
  process: process_,
};

const handler = command ? commands[command] : undefined;
if (handler) {
  handler(rest).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.error(
    `Unknown command: ${command ?? '(none)'}.\nUsage: scrape [--cache DIR] | process --target emulator|prod [--limit N] [--model M] [--reimport-images] [--cache DIR] | dryrun [...]`,
  );
  process.exit(1);
}
```

- [ ] **Step 3: Add package + root scripts**

`apps/scraper/package.json` `"scripts"`:

```json
    "process": "tsx src/index.ts process",
```

Root `package.json` `"scripts"`:

```json
    "process": "pnpm --filter @fazole/scraper process",
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @fazole/scraper lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/scraper/src/commands/process.ts apps/scraper/src/index.ts apps/scraper/package.json package.json
git commit -m "feat(scraper): add process command (cache -> Firestore/Storage)"
```

---

## Task 17: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Whole test suite + lint**

Run: `pnpm --filter @fazole/scraper test && pnpm --filter @fazole/scraper lint`
Expected: all suites pass (Phase 1 + new: slug, scrape-csv, manifest, coerce-extraction, extraction-cache, import-plan, process-state); lint clean.
Run: `pnpm --filter @fazole/common test && pnpm --filter @fazole/web lint`
Expected: pass (BeanColor + BeanImage.year changes).

- [ ] **Step 2: Confirm cache exists (from Task 7) or scrape**

If `.scraper-cache/beans.csv` is absent, run `pnpm --filter @fazole/scraper scrape` first.

- [ ] **Step 3: Process a small batch against the emulator**

In one terminal: `pnpm emu` (builds + starts the full emulator suite — functions, firestore, storage). In another:
```bash
export ANTHROPIC_API_KEY=sk-...
pnpm --filter @fazole/scraper process -- --target emulator --limit 10
```
Expected: two `Source` docs upserted; 10 beans written under `beans/`; 10 image docs at `beans/{id}/images/source` with originals uploaded; the `onImageUpload` emulator trigger fills `paths`/`urls` shortly after. Soft-delete pass is skipped (--limit). Verify in the Emulator UI (`http://localhost:5044`). Re-running the same command should report 0 new tokens spent (extractions cached) and skip image re-upload.

- [ ] **Step 4: (Optional) Full emulator run, then prod**

`pnpm --filter @fazole/scraper process -- --target emulator` (no limit) runs the full ~1008 beans incl. soft-delete. For production, set `GOOGLE_APPLICATION_CREDENTIALS` + confirm `SCRAPER_STORAGE_BUCKET`, then `pnpm --filter @fazole/scraper process -- --target prod`. The extraction cache means prod reuses the emulator run's extractions (no new tokens).

- [ ] **Step 5: Final formatting + commit**

```bash
pnpm format
git add -A
git commit -m "style(scraper): apply prettier formatting"
```

---

## Notes
- `process` relies on the existing `onImageUpload` Cloud Function for variant generation — for `--target emulator` the functions emulator must be running (it is, under `pnpm emu`).
- Firestore security rules are bypassed by the admin SDK; no rule changes needed.
- The `sourceId in [...]` query uses a single-field index (no composite index required).
