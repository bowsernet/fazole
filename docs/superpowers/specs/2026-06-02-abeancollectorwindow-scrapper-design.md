# ABCW Scraper — Design

Scraper for [A Bean Collector's Window](https://www.abeancollectorswindow.com/), the main source for ordering beans to
grow. It imports individual bean varieties from the site's Bean pages and Network pages into our database.

The work is split into two phases:

- **Phase 1 (this design):** a local CLI **dry run** — fetch all pages, parse them, attempt structured-field
  extraction two ways, and emit a CSV plus a bean/network **overlap report**. No database writes.
- **Phase 2 (deferred):** the real import — Firestore upsert, image download, vision-based color inference, change
  detection, and soft-delete. Designed later, informed by the Phase 1 data. The original requirements are preserved in
  the [appendix](#appendix--phase-2-deferred-original-notes).

## Why a local CLI (not a Cloud Function)

This is run **once or twice a year**. A Cloud Function would add deploy, cold-start, Secret Manager, and a hard 60-minute
v2 timeout (Phase 2's ~1100 beans + image downloads + vision calls could exceed it) for no benefit. A local CLI has no
timeout, uses a local `ANTHROPIC_API_KEY`, and in Phase 2 writes directly to Firestore/Storage via `firebase-admin` with
service-account credentials.

## Phase 1 — Dry Run

### Goal

Produce two artifacts so we can make data-informed Phase 2 decisions:

1. **`beans-dryrun.csv`** — every parsed bean with raw fields plus two side-by-side structured-extraction attempts
   (deterministic rules vs. Claude LLM), so we can judge which to trust.
2. **`overlap-report.md`** — how many bean names appear on both Bean and Network pages. This is the decision artifact for
   modeling one `Source` vs. two in Phase 2.

Out of scope for Phase 1: Firestore, Storage, image download, vision color inference, change detection, soft-delete.

### Source pages

- **Bean pages** (`origin: "bean"`): `beanpage.html`, `beanpage1.html` … `beanpage7.html` (8 pages)
- **Network pages** (`origin: "network"`): `networkpage1.html` … `networkpage11.html` (11 pages)

19 pages total. Each record carries `origin` and `pageId` (e.g. `bean-3`, `network-7`).

### App layout

A new standalone app, following turborepo conventions (vitest 3; `build`/`lint`/`test` scripts; reuses `@fazole/common`
and `@fazole/config`). The `lib/` modules are written so Phase 2 reuses them unchanged.

```
apps/scraper/                  # @fazole/scraper — Node CLI
  package.json                 # deps: cheerio, @anthropic-ai/sdk, csv-stringify; dev: vitest, tsx, typescript
  tsconfig.json
  vitest.config.ts
  src/
    index.ts                   # CLI entry / arg routing
    commands/
      dryrun.ts                # Phase 1 orchestration: fetch -> parse -> extract -> CSV + overlap report
      # import.ts              # Phase 2 (later)
    lib/
      pages.ts                 # page URL list + origin/pageId mapping
      fetch-page.ts            # fetch w/ browser UA, 1s spacing, 3x/10s retry, abort-on-fail
      parse-bean-page.ts       # html string -> ParsedBean[]
      extract-rules.ts         # ParsedBean -> RuleFields (deterministic)
      extract-llm.ts           # ParsedBean -> LlmFields (Claude Haiku)
      types.ts
    __tests__/
      parse-bean-page.test.ts  # against saved fixtures
      extract-rules.test.ts    # pure-function cases
      fixtures/                # saved beanpage.html, networkpage1.html
```

Run via `pnpm --filter @fazole/scraper dryrun -- --limit 50`, plus a root `scrape:dryrun` convenience script. Latest
cheerio and Anthropic SDK usage pulled via context7 at implementation time.

### HTML structure (observed)

The site is page-builder HTML (nested `<div>`/`<p>`, no tables). Each bean is reliably anchored by:

```html
<img src="images/abundant-little.jpg" class="bean"
     alt="A group of raw pinto beans with light brown and beige speckled patterns arranged on a plain gray surface.">
```

Block layout is consistent: **name** → `Packet Size N Seeds $X.XX` → **description paragraph** (which usually leads with
the `Bush/Dry.`-style type token). The `alt` text richly describes seed appearance and feeds color inference.

### Parser (`parse-bean-page.ts`)

Anchor on `img.bean`. For each image: derive `imageUrl` + `slug` from `src`, capture `alt`, and walk to the associated
name and description paragraph using the `Packet Size … Seeds $…` line as a structural delimiter (also captured).

```ts
interface ParsedBean {
  name: string;
  slug: string; // from image filename
  imageUrl: string; // absolute
  alt: string;
  packet: string; // raw "Packet Size 25 Seeds $5.00"
  rawDescription: string;
}
```

Exact name-node adjacency is finalized against the saved fixtures during implementation. If a page yields 0 beans, the
run logs a loud warning (likely a selector regression) but continues.

### Extraction — two side-by-side attempts

**Deterministic rules (`extract-rules.ts`):**

- `species`: `/lima/i` → `lima`; otherwise `vulgaris`. (`scarlet`/coccineus only on explicit mention — never inferred
  from "runner", since the site calls running _vulgaris_ "runner".)
- `plantType` / `podType`: parse the leading token (`Bush/Dry`, `Pole lima`, `runner/dry`, `semi-runner`) into the enums
  `bush | semi | runner` and `snap | dry`. Left blank when not confidently matched.

**Claude LLM (`extract-llm.ts`):** Claude Haiku with forced-JSON tool output. Prompt feeds `rawDescription` **and**
`alt`, using the deterministic rules above as "where to look" priors (type token at the start; `lima` keyword; colors
from prose/alt).

```ts
interface LlmFields {
  species: BeanSpecies;
  plantType: PlantType;
  podType: PodType;
  beanColors: BeanColor[]; // white | yellow | brown | pink | red | purple | black
  notes: string; // extraction caveats / confidence
}
```

> **Color note:** in Phase 1 colors are inferred from **text** (`rawDescription` + `alt`). Phase 2 will re-derive them
> from the actual **photo** via vision, which is expected to be more accurate.

Both attempts land in adjacent CSV columns so we can decide the Phase 2 extraction strategy from real output.

### CSV columns

```
name, origin, pageId, slug, imageUrl, packet, rawDescription,
rules_species, rules_plantType, rules_podType,
llm_species, llm_plantType, llm_podType, llm_beanColors, llm_notes
```

Written with `csv-stringify` for correct escaping of commas/quotes/newlines in `rawDescription`.

### Overlap report (Phase 2 source-model decision)

Normalize names (lowercase, trim, collapse whitespace). Compute and write to `overlap-report.md`:

- total Bean-page beans, total Network-page beans
- count + list of names appearing on **both**
- overlap percentage

We decide single vs. two `Source` documents in Phase 2 based on this.

### CLI flags

- `--limit N` — process only the first N beans (cheap iteration / cost control)
- `--pages bean | network | all` — restrict which page set to scrape
- `--no-llm` — skip the LLM columns (raw + rules only)
- `--concurrency N` — parallel LLM calls (default ~5)
- `--out <path>` — output directory (default `docs/plans/dryrun/`)

### Error handling

- **Page fetch:** 1s spacing between requests; on HTTP error, retry 3× with 10s delay; if a page still fails, **abort
  the run**.
- **LLM:** retry 2×, then leave `llm_*` blank with `llm_notes = "extraction failed: <err>"` — never aborts the run.
- ~1100 beans total (≈58 images × 19 pages); Haiku keeps cost trivial. Per-bean calls for accuracy; batching is a
  possible later optimization, not in v1.

### Testing (per project conventions)

- Unit-test `parse-bean-page` against saved HTML fixtures (assert bean counts, sample names/URLs).
- Unit-test `extract-rules` as pure functions (type-token and `lima` cases, including the "runner ≠ scarlet" rule).
- Skip `fetch-page` and `extract-llm` — thin facades over 3rd-party APIs (no mocking, per testing rules).

---

## Appendix — Phase 2 deferred (original notes)

The original specification. These requirements are intentionally **out of scope for Phase 1** and will be brainstormed
into their own design once the dry-run data is in hand.

> I need to implement a scraper that goes through all Beans and Network pages and imports individual varieties into our
> database. The scraper should be runnable incrementally (i.e. if new beans added onto the source pages, they are
> imported). Since they don't appear to have any unique ids exposed, let's just use the name as the unique ID.
>
> Implementation
>
> - runs on demand via CLI
> - scrapes all pages and imports new beans into our database
> - only update if pages have changed (download html and compare hash with last known); store hash in a collection (no
>   permissions for frontend)
> - reasonable rate limiting (~20 pages; 1 second between requests)
> - on http error, retry 3 times with 10 seconds delay and abort if fails 3 times
>
> Additional specifications
>
> - download and store all scraped images locally (don't reference URLs from the source website)
> - updates to existing beans: simply update attributes and images
> - when deleted in the source, keep in our database but mark as "deleted in source"
> - when a bean is in both collections (bean and network pages), prefer the bean page
> - colors inferred from the photo (vision), not the text
