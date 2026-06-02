# ABCW Scraper Phase 1 (Dry Run) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local CLI app `@fazole/scraper` whose `dryrun` command fetches all A Bean Collector's Window bean/network pages, parses each bean, attempts structured-field extraction two ways (deterministic rules + Claude LLM), and writes a CSV plus a bean/network overlap report — with no database writes.

**Architecture:** A standalone Node 22 + TypeScript (ESM, run via `tsx`) app under `apps/scraper`. Pure, testable units live in `src/lib/` (parsing, rules extraction, overlap, concurrency, CSV mapping); thin 3rd-party facades (`fetch-page`, `extract-llm`) are untested per project rules; `src/commands/dryrun.ts` orchestrates them. Phase 2 (Firestore import, image download, vision colors, change detection, soft-delete) reuses the same `lib/` and is out of scope here.

**Tech Stack:** TypeScript (strict, `noUncheckedIndexedAccess`), pnpm workspace + Turborepo, `cheerio` (HTML parsing), `@anthropic-ai/sdk` (Claude Haiku structured output), `csv-stringify`, `vitest` 3, `tsx`. Reuses `@fazole/common` types.

**Reference spec:** `docs/superpowers/specs/2026-06-02-abeancollectorwindow-scrapper-design.md`

---

## File Structure

```
apps/scraper/
  package.json                      # @fazole/scraper, type:module; scripts: dryrun/lint/test
  tsconfig.json                     # extends base; noEmit; node + vitest/globals types
  vitest.config.ts                  # globals: true
  src/
    index.ts                        # CLI entry; routes `dryrun` subcommand
    commands/
      dryrun.ts                     # orchestration (facade — untested)
    lib/
      types.ts                      # Origin, PageRef, ParsedBean, RuleFields, LlmFields, ScrapedBean
      pages.ts                      # buildPageRefs() — page URL list + origin/pageId
      fetch-page.ts                 # fetchPage() — fetch + retry (facade — untested)
      parse-bean-page.ts            # parseBeanPage() — html -> ParsedBean[]
      extract-rules.ts              # extractRules() — deterministic fields
      extract-llm.ts                # extractLlm() — Claude (facade — untested)
      overlap.ts                    # computeOverlap() + formatOverlapReport()
      concurrency.ts                # mapWithConcurrency()
      csv.ts                        # CSV_COLUMNS + toCsvRow()
    __tests__/
      pages.test.ts
      parse-bean-page.test.ts
      extract-rules.test.ts
      overlap.test.ts
      concurrency.test.ts
      csv.test.ts
      fixtures/
        sample-page.html            # handcrafted, mirrors real DOM
```

**Testing policy (per CLAUDE.md):** unit-test the pure units (`pages`, `parse-bean-page`, `extract-rules`, `overlap`, `concurrency`, `csv`). Skip `fetch-page` and `extract-llm` (thin facades over `fetch`/Anthropic SDK — no mocking) and `dryrun`/`index` (orchestration chokepoints).

---

## Task 1: Scaffold the `@fazole/scraper` app

**Files:**
- Create: `apps/scraper/package.json`
- Create: `apps/scraper/tsconfig.json`
- Create: `apps/scraper/vitest.config.ts`
- Modify: `package.json` (root — add `scrape:dryrun` script)
- Modify: `.gitignore` (ignore generated dry-run output)

- [ ] **Step 1: Create `apps/scraper/package.json`**

```json
{
  "name": "@fazole/scraper",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dryrun": "tsx src/index.ts dryrun",
    "lint": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.65.0",
    "@fazole/common": "workspace:*",
    "cheerio": "^1.0.0",
    "csv-stringify": "^6.5.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `apps/scraper/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `apps/scraper/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 4: Add a root convenience script**

In root `package.json`, add to `"scripts"` (after `"format:check"`):

```json
    "scrape:dryrun": "pnpm --filter @fazole/scraper dryrun"
```

- [ ] **Step 5: Ignore generated dry-run output**

Append to `.gitignore` (create the file if missing):

```
# ABCW scraper dry-run output
docs/plans/dryrun/
```

- [ ] **Step 6: Install dependencies**

Run: `pnpm install`
Expected: installs without error; `apps/scraper` is picked up as a workspace package (output mentions `@fazole/scraper`). Confirm the latest published versions of `cheerio`, `@anthropic-ai/sdk`, and `csv-stringify` resolved; if a pinned version above is stale, bump it.

> When implementing `extract-llm` (Task 9) and `parse-bean-page` (Task 4), use the `context7` MCP to confirm current `@anthropic-ai/sdk` tool-use and `cheerio` APIs.

- [ ] **Step 7: Commit**

```bash
git add apps/scraper/package.json apps/scraper/tsconfig.json apps/scraper/vitest.config.ts package.json .gitignore pnpm-lock.yaml
git commit -m "chore: scaffold @fazole/scraper CLI app"
```

---

## Task 2: Shared types (`lib/types.ts`)

**Files:**
- Create: `apps/scraper/src/lib/types.ts`

- [ ] **Step 1: Write the types**

```ts
import type { BeanColor, BeanSpecies, PlantType, PodType } from '@fazole/common';

export type Origin = 'bean' | 'network';

export interface PageRef {
  url: string;
  origin: Origin;
  pageId: string; // e.g. "bean-0", "network-7"
}

export interface ParsedBean {
  name: string;
  slug: string; // image filename without extension
  imageUrl: string; // absolute
  alt: string;
  packet: string; // raw "Packet Size 25 Seeds $5.00"
  rawDescription: string;
}

// Rule fields may be blank when the parser can't decide.
export interface RuleFields {
  species: BeanSpecies;
  plantType: PlantType | '';
  podType: PodType | '';
}

export interface LlmFields {
  species: BeanSpecies;
  plantType: PlantType;
  podType: PodType;
  beanColors: BeanColor[];
  notes: string;
}

export interface ScrapedBean extends ParsedBean {
  origin: Origin;
  pageId: string;
  rules: RuleFields;
  llm: LlmFields | null;
  llmError?: string;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @fazole/scraper lint`
Expected: PASS (no errors). If `@fazole/common` types aren't found, confirm `BeanColor`, `BeanSpecies`, `PlantType`, `PodType` are exported from `packages/common/src/types/bean.ts` and re-exported via `packages/common/src/index.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/scraper/src/lib/types.ts
git commit -m "feat(scraper): add shared types"
```

---

## Task 3: Page list (`lib/pages.ts`)

**Files:**
- Create: `apps/scraper/src/lib/pages.ts`
- Test: `apps/scraper/src/__tests__/pages.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { buildPageRefs } from '../lib/pages';

describe('buildPageRefs', () => {
  it('builds 8 bean pages with correct ids and urls', () => {
    const beans = buildPageRefs('bean');
    expect(beans).toHaveLength(8);
    expect(beans[0]).toEqual({
      url: 'https://www.abeancollectorswindow.com/beanpage.html',
      origin: 'bean',
      pageId: 'bean-0',
    });
    expect(beans[7]).toEqual({
      url: 'https://www.abeancollectorswindow.com/beanpage7.html',
      origin: 'bean',
      pageId: 'bean-7',
    });
  });

  it('builds 11 network pages starting at 1', () => {
    const net = buildPageRefs('network');
    expect(net).toHaveLength(11);
    expect(net[0]).toEqual({
      url: 'https://www.abeancollectorswindow.com/networkpage1.html',
      origin: 'network',
      pageId: 'network-1',
    });
    expect(net[10]?.pageId).toBe('network-11');
  });

  it('returns all 19 pages for "all"', () => {
    expect(buildPageRefs('all')).toHaveLength(19);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fazole/scraper test pages`
Expected: FAIL — cannot find module `../lib/pages`.

- [ ] **Step 3: Write the implementation**

```ts
import type { Origin, PageRef } from './types';

const BASE = 'https://www.abeancollectorswindow.com';

function beanPages(): PageRef[] {
  // beanpage.html, beanpage1.html ... beanpage7.html
  return Array.from({ length: 8 }, (_, i) => ({
    url: `${BASE}/beanpage${i === 0 ? '' : i}.html`,
    origin: 'bean' as Origin,
    pageId: `bean-${i}`,
  }));
}

function networkPages(): PageRef[] {
  // networkpage1.html ... networkpage11.html
  return Array.from({ length: 11 }, (_, i) => ({
    url: `${BASE}/networkpage${i + 1}.html`,
    origin: 'network' as Origin,
    pageId: `network-${i + 1}`,
  }));
}

export function buildPageRefs(which: 'bean' | 'network' | 'all'): PageRef[] {
  if (which === 'bean') return beanPages();
  if (which === 'network') return networkPages();
  return [...beanPages(), ...networkPages()];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @fazole/scraper test pages`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/scraper/src/lib/pages.ts apps/scraper/src/__tests__/pages.test.ts
git commit -m "feat(scraper): add page list builder"
```

---

## Task 4: HTML parser (`lib/parse-bean-page.ts`)

**Files:**
- Create: `apps/scraper/src/__tests__/fixtures/sample-page.html`
- Create: `apps/scraper/src/lib/parse-bean-page.ts`
- Test: `apps/scraper/src/__tests__/parse-bean-page.test.ts`

- [ ] **Step 1: Create the fixture (mirrors the real DOM)**

`apps/scraper/src/__tests__/fixtures/sample-page.html`:

```html
<html>
  <body>
    <div class="pagecol1">
      <div class="holder">
        <div class="imgtxtadjust">
          <img src="images/abundant-little.jpg" class="bean" alt="A group of raw pinto beans with light brown and beige speckled patterns." />
          <p class="title">Abundant Little Gem</p>
          <div class="txtmve-2"><p class="notavailable-21">Packet Size 30 Seeds $5.00</p></div>
          <p>Bush/Dry. A robust variety that thrives without the need for runners.</p>
        </div>
        <div class="imgtxtadjust">
          <img src="images4/king-of-the-garden.jpg" class="bean" alt="Large flat white lima beans." />
          <p class="title">King of the Garden</p>
          <div class="txtmve-2"><p class="notavailable-9">Packet Size 25 Seeds $5.00</p></div>
          <p>Pole lima. Very productive climbing plant producing many pods.</p>
        </div>
        <div class="imgtxtadjust">
          <img src="https://www.abeancollectorswindow.com/images/scarlet-emperor.jpg" class="bean" alt="Glossy black and purple beans." />
          <p class="title">Scarlet Emperor</p>
          <div class="txtmve-2"><p class="notavailable-3">Packet Size 20 Seeds $6.00</p></div>
          <p>Runner/Snap. A vigorous Phaseolus coccineus with bright red flowers and tender snap pods.</p>
        </div>
        <img src="images2/header-page-1-24.jpg" alt="decorative header" />
      </div>
    </div>
  </body>
</html>
```

- [ ] **Step 2: Write the failing test**

`apps/scraper/src/__tests__/parse-bean-page.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseBeanPage } from '../lib/parse-bean-page';

const html = readFileSync(join(__dirname, 'fixtures/sample-page.html'), 'utf8');
const BASE = 'https://www.abeancollectorswindow.com/beanpage.html';

describe('parseBeanPage', () => {
  const beans = parseBeanPage(html, BASE);

  it('extracts only img.bean beans, ignoring decorative images', () => {
    expect(beans).toHaveLength(3);
  });

  it('parses name, slug, alt and packet', () => {
    expect(beans[0]?.name).toBe('Abundant Little Gem');
    expect(beans[0]?.slug).toBe('abundant-little');
    expect(beans[0]?.alt).toContain('pinto beans');
    expect(beans[0]?.packet).toBe('Packet Size 30 Seeds $5.00');
  });

  it('resolves relative image urls against the page url', () => {
    expect(beans[0]?.imageUrl).toBe('https://www.abeancollectorswindow.com/images/abundant-little.jpg');
    expect(beans[1]?.imageUrl).toBe('https://www.abeancollectorswindow.com/images4/king-of-the-garden.jpg');
  });

  it('keeps absolute image urls as-is', () => {
    expect(beans[2]?.imageUrl).toBe('https://www.abeancollectorswindow.com/images/scarlet-emperor.jpg');
  });

  it('captures the description paragraph, not the packet line', () => {
    expect(beans[0]?.rawDescription).toMatch(/^Bush\/Dry\./);
    expect(beans[0]?.rawDescription).not.toContain('Packet Size');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @fazole/scraper test parse-bean-page`
Expected: FAIL — cannot find module `../lib/parse-bean-page`.

- [ ] **Step 4: Write the implementation**

```ts
import * as cheerio from 'cheerio';

import type { ParsedBean } from './types';

export function parseBeanPage(html: string, baseUrl: string): ParsedBean[] {
  const $ = cheerio.load(html);
  const beans: ParsedBean[] = [];

  $('img.bean').each((_, img) => {
    const $img = $(img);
    const src = $img.attr('src');
    if (!src) return;

    const $block = $img.closest('.imgtxtadjust');
    const name = $block.find('p.title').first().text().trim();
    if (!name) return;

    const packet = $block
      .find('p')
      .filter((_i, el) => /Packet Size/i.test($(el).text()))
      .first()
      .text()
      .trim();

    // Description = direct child <p> elements that are neither the title
    // nor the (nested) packet line.
    const rawDescription = $block
      .children('p')
      .not('.title')
      .map((_i, el) => $(el).text().trim())
      .get()
      .join('\n\n')
      .trim();

    beans.push({
      name,
      slug: slugFromSrc(src),
      imageUrl: new URL(src, baseUrl).href,
      alt: $img.attr('alt')?.trim() ?? '',
      packet,
      rawDescription,
    });
  });

  return beans;
}

function slugFromSrc(src: string): string {
  const file = src.split('/').pop() ?? '';
  return file.replace(/\.[^.]+$/, '');
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @fazole/scraper test parse-bean-page`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/scraper/src/lib/parse-bean-page.ts apps/scraper/src/__tests__/parse-bean-page.test.ts apps/scraper/src/__tests__/fixtures/sample-page.html
git commit -m "feat(scraper): add bean page HTML parser"
```

---

## Task 5: Deterministic rules extraction (`lib/extract-rules.ts`)

**Files:**
- Create: `apps/scraper/src/lib/extract-rules.ts`
- Test: `apps/scraper/src/__tests__/extract-rules.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { extractRules } from '../lib/extract-rules';
import type { ParsedBean } from '../lib/types';

function bean(rawDescription: string, extra: Partial<ParsedBean> = {}): ParsedBean {
  return { name: 'X', slug: 'x', imageUrl: '', alt: '', packet: '', rawDescription, ...extra };
}

describe('extractRules', () => {
  it('reads "Bush/Dry." as bush + dry, default species vulgaris', () => {
    const r = extractRules(bean('Bush/Dry. A robust variety without runners.'));
    expect(r).toEqual({ species: 'vulgaris', plantType: 'bush', podType: 'dry' });
  });

  it('treats "Pole lima." as lima species + runner, blank podType', () => {
    const r = extractRules(bean('Pole lima. Very productive climbing plant.'));
    expect(r).toEqual({ species: 'lima', plantType: 'runner', podType: '' });
  });

  it('detects scarlet only on explicit coccineus, with runner + snap', () => {
    const r = extractRules(bean('Runner/Snap. A vigorous Phaseolus coccineus with red flowers.'));
    expect(r).toEqual({ species: 'scarlet', plantType: 'runner', podType: 'snap' });
  });

  it('does not infer scarlet from the word "runner" alone', () => {
    expect(extractRules(bean('Runner/Dry. A tall climbing bean.')).species).toBe('vulgaris');
  });

  it('ignores "runner" appearing only in the description body', () => {
    // leading token is "Bush/Dry"; "runners" later must not flip plantType
    expect(extractRules(bean('Bush/Dry. Thrives without the need for runners.')).plantType).toBe('bush');
  });

  it('leaves fields blank when the leading token is unrecognized', () => {
    const r = extractRules(bean('A lovely heirloom with no type prefix.'));
    expect(r).toEqual({ species: 'vulgaris', plantType: '', podType: '' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fazole/scraper test extract-rules`
Expected: FAIL — cannot find module `../lib/extract-rules`.

- [ ] **Step 3: Write the implementation**

`RuleFields`, `BeanSpecies`, `PlantType`, and `PodType` are reused from `./types` (defined in Task 2) — do not redefine them here.

```ts
import type { BeanSpecies, PlantType, PodType } from '@fazole/common';

import type { ParsedBean, RuleFields } from './types';

export function extractRules(bean: ParsedBean): RuleFields {
  const lead = bean.rawDescription.split('.')[0] ?? '';
  return {
    species: detectSpecies(bean.rawDescription),
    plantType: detectPlantType(lead),
    podType: detectPodType(lead),
  };
}

function detectSpecies(text: string): BeanSpecies {
  if (/coccineus|scarlet\s+runner/i.test(text)) return 'scarlet';
  if (/\blima\b/i.test(text)) return 'lima';
  return 'vulgaris';
}

function detectPlantType(lead: string): PlantType | '' {
  if (/semi/i.test(lead)) return 'semi';
  if (/pole|runner|climb/i.test(lead)) return 'runner';
  if (/bush/i.test(lead)) return 'bush';
  return '';
}

function detectPodType(lead: string): PodType | '' {
  if (/snap/i.test(lead)) return 'snap';
  if (/dry/i.test(lead)) return 'dry';
  return '';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @fazole/scraper test extract-rules`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/scraper/src/lib/extract-rules.ts apps/scraper/src/__tests__/extract-rules.test.ts
git commit -m "feat(scraper): add deterministic rule extraction"
```

---

## Task 6: Overlap report (`lib/overlap.ts`)

**Files:**
- Create: `apps/scraper/src/lib/overlap.ts`
- Test: `apps/scraper/src/__tests__/overlap.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { computeOverlap, formatOverlapReport } from '../lib/overlap';

describe('computeOverlap', () => {
  const report = computeOverlap([
    { name: 'Cherokee Trail', origin: 'bean' },
    { name: 'cherokee  trail', origin: 'network' }, // same after normalization
    { name: 'Hidatsa', origin: 'bean' },
    { name: 'King of the Garden', origin: 'network' },
  ]);

  it('counts distinct names per origin', () => {
    expect(report.beanCount).toBe(2);
    expect(report.networkCount).toBe(2);
  });

  it('finds names present in both, normalized', () => {
    expect(report.overlapCount).toBe(1);
    expect(report.overlapNames).toEqual(['cherokee trail']);
  });

  it('computes overlap as a percentage of network names', () => {
    expect(report.overlapPctOfNetwork).toBe(50);
  });

  it('handles zero network names without dividing by zero', () => {
    const r = computeOverlap([{ name: 'Solo', origin: 'bean' }]);
    expect(r.overlapPctOfNetwork).toBe(0);
  });
});

describe('formatOverlapReport', () => {
  it('renders markdown with the headline numbers', () => {
    const md = formatOverlapReport({
      beanCount: 2,
      networkCount: 2,
      overlapCount: 1,
      overlapNames: ['cherokee trail'],
      overlapPctOfNetwork: 50,
    });
    expect(md).toContain('# ABCW Bean/Network Overlap');
    expect(md).toContain('Overlap: 1');
    expect(md).toContain('cherokee trail');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fazole/scraper test overlap`
Expected: FAIL — cannot find module `../lib/overlap`.

- [ ] **Step 3: Write the implementation**

```ts
import type { Origin } from './types';

export interface OverlapReport {
  beanCount: number;
  networkCount: number;
  overlapCount: number;
  overlapNames: string[];
  overlapPctOfNetwork: number;
}

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function computeOverlap(beans: { name: string; origin: Origin }[]): OverlapReport {
  const beanNames = new Set<string>();
  const networkNames = new Set<string>();

  for (const { name, origin } of beans) {
    const key = normalize(name);
    if (!key) continue;
    (origin === 'bean' ? beanNames : networkNames).add(key);
  }

  const overlapNames = [...networkNames].filter((n) => beanNames.has(n)).sort();
  const overlapCount = overlapNames.length;

  return {
    beanCount: beanNames.size,
    networkCount: networkNames.size,
    overlapCount,
    overlapNames,
    overlapPctOfNetwork: networkNames.size === 0 ? 0 : (overlapCount / networkNames.size) * 100,
  };
}

export function formatOverlapReport(r: OverlapReport): string {
  const lines = [
    '# ABCW Bean/Network Overlap',
    '',
    `- Bean-page beans (distinct names): ${r.beanCount}`,
    `- Network-page beans (distinct names): ${r.networkCount}`,
    `- Overlap: ${r.overlapCount} (${r.overlapPctOfNetwork.toFixed(1)}% of network names also appear on bean pages)`,
    '',
    '## Overlapping names',
    '',
    ...(r.overlapNames.length ? r.overlapNames.map((n) => `- ${n}`) : ['(none)']),
    '',
  ];
  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @fazole/scraper test overlap`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/scraper/src/lib/overlap.ts apps/scraper/src/__tests__/overlap.test.ts
git commit -m "feat(scraper): add bean/network overlap report"
```

---

## Task 7: Concurrency helper (`lib/concurrency.ts`)

**Files:**
- Create: `apps/scraper/src/lib/concurrency.ts`
- Test: `apps/scraper/src/__tests__/concurrency.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { mapWithConcurrency } from '../lib/concurrency';

describe('mapWithConcurrency', () => {
  it('maps all items preserving input order', async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => n * 2);
    expect(out).toEqual([2, 4, 6, 8, 10]);
  });

  it('never exceeds the concurrency limit', async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n;
    });
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('returns an empty array for empty input', async () => {
    expect(await mapWithConcurrency([], 3, async (n) => n)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fazole/scraper test concurrency`
Expected: FAIL — cannot find module `../lib/concurrency`.

- [ ] **Step 3: Write the implementation**

```ts
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!, index);
    }
  }

  const size = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: size }, () => worker()));
  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @fazole/scraper test concurrency`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/scraper/src/lib/concurrency.ts apps/scraper/src/__tests__/concurrency.test.ts
git commit -m "feat(scraper): add bounded-concurrency map helper"
```

---

## Task 8: CSV mapping (`lib/csv.ts`)

**Files:**
- Create: `apps/scraper/src/lib/csv.ts`
- Test: `apps/scraper/src/__tests__/csv.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { CSV_COLUMNS, toCsvRow } from '../lib/csv';
import type { ScrapedBean } from '../lib/types';

function base(): ScrapedBean {
  return {
    name: 'Abundant Little Gem',
    slug: 'abundant-little',
    imageUrl: 'https://x/abundant-little.jpg',
    alt: 'pinto',
    packet: 'Packet Size 30 Seeds $5.00',
    rawDescription: 'Bush/Dry. Robust.',
    origin: 'bean',
    pageId: 'bean-0',
    rules: { species: 'vulgaris', plantType: 'bush', podType: 'dry' },
    llm: null,
  };
}

describe('toCsvRow', () => {
  it('flattens an LLM result into the column keys', () => {
    const row = toCsvRow({
      ...base(),
      llm: { species: 'vulgaris', plantType: 'bush', podType: 'dry', beanColors: ['brown', 'white'], notes: 'ok' },
    });
    expect(row.name).toBe('Abundant Little Gem');
    expect(row.rules_plantType).toBe('bush');
    expect(row.llm_species).toBe('vulgaris');
    expect(row.llm_beanColors).toBe('brown; white');
    expect(row.llm_notes).toBe('ok');
  });

  it('renders a failed LLM extraction as blank columns with an error note', () => {
    const row = toCsvRow({ ...base(), llm: null, llmError: 'rate limited' });
    expect(row.llm_species).toBe('');
    expect(row.llm_beanColors).toBe('');
    expect(row.llm_notes).toBe('extraction failed: rate limited');
  });

  it('every column key in CSV_COLUMNS is present in a row', () => {
    const row = toCsvRow(base());
    for (const col of CSV_COLUMNS) {
      expect(row).toHaveProperty(col);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fazole/scraper test csv`
Expected: FAIL — cannot find module `../lib/csv`.

- [ ] **Step 3: Write the implementation**

```ts
import type { ScrapedBean } from './types';

export const CSV_COLUMNS = [
  'name',
  'origin',
  'pageId',
  'slug',
  'imageUrl',
  'packet',
  'rawDescription',
  'rules_species',
  'rules_plantType',
  'rules_podType',
  'llm_species',
  'llm_plantType',
  'llm_podType',
  'llm_beanColors',
  'llm_notes',
] as const;

export function toCsvRow(bean: ScrapedBean): Record<string, string> {
  const { llm } = bean;
  return {
    name: bean.name,
    origin: bean.origin,
    pageId: bean.pageId,
    slug: bean.slug,
    imageUrl: bean.imageUrl,
    packet: bean.packet,
    rawDescription: bean.rawDescription,
    rules_species: bean.rules.species,
    rules_plantType: bean.rules.plantType,
    rules_podType: bean.rules.podType,
    llm_species: llm?.species ?? '',
    llm_plantType: llm?.plantType ?? '',
    llm_podType: llm?.podType ?? '',
    llm_beanColors: llm ? llm.beanColors.join('; ') : '',
    llm_notes: llm ? llm.notes : bean.llmError ? `extraction failed: ${bean.llmError}` : '',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @fazole/scraper test csv`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/scraper/src/lib/csv.ts apps/scraper/src/__tests__/csv.test.ts
git commit -m "feat(scraper): add CSV row mapping"
```

---

## Task 9: Page fetcher (`lib/fetch-page.ts`) — facade, untested

**Files:**
- Create: `apps/scraper/src/lib/fetch-page.ts`

- [ ] **Step 1: Write the implementation**

```ts
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export interface FetchOptions {
  retries?: number; // default 3
  retryDelayMs?: number; // default 10_000
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function fetchPage(url: string, opts: FetchOptions = {}): Promise<string> {
  const retries = opts.retries ?? 3;
  const retryDelayMs = opts.retryDelayMs ?? 10_000;

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: BROWSER_HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      console.warn(`fetch ${url} attempt ${attempt}/${retries} failed: ${String(err)}`);
      if (attempt < retries) await sleep(retryDelayMs);
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts: ${String(lastError)}`);
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @fazole/scraper lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/scraper/src/lib/fetch-page.ts
git commit -m "feat(scraper): add page fetcher with retry"
```

---

## Task 10: LLM extractor (`lib/extract-llm.ts`) — facade, untested

**Files:**
- Create: `apps/scraper/src/lib/extract-llm.ts`

> Before writing this, use `context7` to confirm the current `@anthropic-ai/sdk` tool-use API (message create shape, `tool_choice`, reading `tool_use` blocks). The code below targets the SDK as of writing.

- [ ] **Step 1: Write the implementation**

```ts
import Anthropic from '@anthropic-ai/sdk';

import type { LlmFields, ParsedBean } from './types';

const MODEL = 'claude-haiku-4-5';

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
        items: { type: 'string', enum: ['white', 'yellow', 'brown', 'pink', 'red', 'purple', 'black'] },
      },
      notes: { type: 'string', description: 'Extraction caveats or low-confidence flags.' },
    },
    required: ['species', 'plantType', 'podType', 'beanColors', 'notes'],
  },
};

function buildPrompt(bean: ParsedBean): string {
  return [
    'Extract structured attributes for this heirloom bean variety from a seed catalog.',
    '',
    `Name: ${bean.name}`,
    `Image alt text: ${bean.alt}`,
    `Description: ${bean.rawDescription}`,
    '',
    'Guidance on where to look:',
    '- plantType / podType usually appear as a leading token like "Bush/Dry", "Pole lima", "Runner/Snap".',
    '- species: "lima" in the text means lima; only use "scarlet" for an explicit Phaseolus coccineus / scarlet runner — never infer it from the word "runner" alone (this site calls climbing common beans "runner").',
    '- beanColors: infer the seed colors from the description and the image alt text. Map to the closest of: white, yellow, brown, pink, red, purple, black. List 1-3, most dominant first.',
    'If a field is genuinely unclear, make your best guess and explain in notes.',
  ].join('\n');
}

export async function extractLlm(client: Anthropic, bean: ParsedBean, retries = 2): Promise<LlmFields> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'record_bean' },
        messages: [{ role: 'user', content: buildPrompt(bean) }],
      });
      const block = res.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
      if (!block) throw new Error('no tool_use block in response');
      return block.input as LlmFields;
    } catch (err) {
      lastError = err;
      if (attempt <= retries) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error(`LLM extraction failed for "${bean.name}": ${String(lastError)}`);
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @fazole/scraper lint`
Expected: PASS. If the SDK's `Tool` / `ToolUseBlock` type names differ in the installed version, adjust the imports/casts to match (verify via context7).

- [ ] **Step 3: Commit**

```bash
git add apps/scraper/src/lib/extract-llm.ts
git commit -m "feat(scraper): add Claude LLM field extractor"
```

---

## Task 11: Orchestration command + CLI entry

**Files:**
- Create: `apps/scraper/src/commands/dryrun.ts`
- Create: `apps/scraper/src/index.ts`

- [ ] **Step 1: Write `commands/dryrun.ts`**

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import Anthropic from '@anthropic-ai/sdk';
import { stringify } from 'csv-stringify/sync';

import { CSV_COLUMNS, toCsvRow } from '../lib/csv';
import { mapWithConcurrency } from '../lib/concurrency';
import { computeOverlap, formatOverlapReport } from '../lib/overlap';
import { extractLlm } from '../lib/extract-llm';
import { extractRules } from '../lib/extract-rules';
import { fetchPage } from '../lib/fetch-page';
import { buildPageRefs } from '../lib/pages';
import { parseBeanPage } from '../lib/parse-bean-page';
import type { ScrapedBean } from '../lib/types';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function dryrun(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      limit: { type: 'string' },
      pages: { type: 'string', default: 'all' },
      'no-llm': { type: 'boolean', default: false },
      concurrency: { type: 'string', default: '5' },
      out: { type: 'string', default: 'docs/plans/dryrun' },
    },
  });

  const which = values.pages as 'bean' | 'network' | 'all';
  const refs = buildPageRefs(which);
  const beans: ScrapedBean[] = [];

  for (const [i, ref] of refs.entries()) {
    if (i > 0) await sleep(1000); // 1s spacing between requests
    console.log(`Fetching ${ref.pageId} — ${ref.url}`);
    const html = await fetchPage(ref.url);
    const parsed = parseBeanPage(html, ref.url);
    if (parsed.length === 0) console.warn(`WARNING: ${ref.pageId} yielded 0 beans — selector regression?`);
    for (const p of parsed) {
      beans.push({ ...p, origin: ref.origin, pageId: ref.pageId, rules: extractRules(p), llm: null });
    }
  }
  console.log(`Parsed ${beans.length} beans across ${refs.length} pages.`);

  if (!values['no-llm']) {
    const work = values.limit ? beans.slice(0, Number(values.limit)) : beans;
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY
    console.log(`Running LLM extraction on ${work.length} beans (concurrency ${values.concurrency})...`);
    await mapWithConcurrency(work, Number(values.concurrency), async (bean) => {
      try {
        bean.llm = await extractLlm(client, bean);
      } catch (err) {
        bean.llmError = err instanceof Error ? err.message : String(err);
      }
    });
  }

  mkdirSync(values.out, { recursive: true });
  const csv = stringify(beans.map(toCsvRow), { header: true, columns: [...CSV_COLUMNS] });
  writeFileSync(join(values.out, 'beans-dryrun.csv'), csv);

  const overlap = computeOverlap(beans.map((b) => ({ name: b.name, origin: b.origin })));
  writeFileSync(join(values.out, 'overlap-report.md'), formatOverlapReport(overlap));

  console.log(`Wrote ${beans.length} rows to ${values.out}/beans-dryrun.csv`);
  console.log(
    `Overlap: ${overlap.overlapCount} names on both pages (${overlap.overlapPctOfNetwork.toFixed(1)}% of network).`,
  );
}
```

- [ ] **Step 2: Write `index.ts`**

```ts
import { dryrun } from './commands/dryrun';

const [command, ...rest] = process.argv.slice(2);

if (command === 'dryrun') {
  dryrun(rest).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.error(
    `Unknown command: ${command ?? '(none)'}.\n` +
      'Usage: dryrun [--limit N] [--pages bean|network|all] [--no-llm] [--concurrency N] [--out DIR]',
  );
  process.exit(1);
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @fazole/scraper lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/scraper/src/commands/dryrun.ts apps/scraper/src/index.ts
git commit -m "feat(scraper): add dryrun command and CLI entry"
```

---

## Task 12: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `pnpm --filter @fazole/scraper test`
Expected: PASS — all suites green (pages, parse-bean-page, extract-rules, overlap, concurrency, csv).

- [ ] **Step 2: Type-check the package**

Run: `pnpm --filter @fazole/scraper lint`
Expected: PASS, no type errors.

- [ ] **Step 3: Offline smoke test of the CLI wiring (no network, no API)**

Run: `pnpm --filter @fazole/scraper dryrun -- --pages bean --no-llm --limit 0 --out /tmp/abcw-dryrun`
Expected: fetches bean pages (you'll see `Fetching bean-0 …` lines), parses beans, and writes `/tmp/abcw-dryrun/beans-dryrun.csv` + `overlap-report.md`. Open the CSV and confirm `name`, `slug`, `imageUrl`, `rawDescription`, and `rules_*` columns are populated; `llm_*` columns are blank (LLM skipped). If a page logs "0 beans", the parser selectors need revisiting against the live HTML.

> `--limit 0` makes the LLM work-set empty even without `--no-llm`; here we pass both to be explicit. This step requires network access to the live site but no API key.

- [ ] **Step 4: Small LLM trial (requires `ANTHROPIC_API_KEY`)**

Run:
```bash
export ANTHROPIC_API_KEY=sk-...   # your key
pnpm --filter @fazole/scraper dryrun -- --pages bean --limit 25 --out /tmp/abcw-dryrun
```
Expected: 25 beans get `llm_*` columns filled. Spot-check `llm_species` / `llm_plantType` / `llm_podType` against `rules_*`, and sanity-check `llm_beanColors`. Confirm any failed extractions show `llm_notes = "extraction failed: …"` rather than aborting the run.

- [ ] **Step 5: Full run (optional, costs ~1100 Haiku calls)**

Run: `pnpm scrape:dryrun -- --out docs/plans/dryrun`
Expected: ~1100 rows in `docs/plans/dryrun/beans-dryrun.csv` and a populated `overlap-report.md`. Review the overlap numbers — this is the input for the Phase 2 single-vs-two-`Source` decision.

- [ ] **Step 6: Final formatting + commit**

```bash
pnpm format
git add -A
git commit -m "chore(scraper): formatting"
```

---

## Notes for Phase 2 (out of scope here)

These come next, in a separate spec/plan, informed by the dry-run data:
- Decide single vs. two `Source` documents from `overlap-report.md`.
- Firestore upsert (bean id = slug/normalized name), image download into Storage (reuse the existing `onImageUpload` variant pipeline), **vision-based** color inference from the actual photo, page-hash change detection, and "deleted in source" soft-delete.
- Promote `@anthropic-ai/sdk` / `firebase-admin` usage as needed; reuse `src/lib/` unchanged.
