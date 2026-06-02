import { stringify } from 'csv-stringify/sync';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { parseArgs } from 'node:util';

import { downloadImage } from '../lib/download-image';
import { extractRules } from '../lib/extract-rules';
import { fetchPage } from '../lib/fetch-page';
import { type Manifest, hashContent, isUnchanged, readManifest, writeManifest } from '../lib/manifest';
import { buildPageRefs } from '../lib/pages';
import { parseBeanPage } from '../lib/parse-bean-page';
import { type CsvBean, SCRAPE_COLUMNS, parseScrapeCsv, toScrapeRow } from '../lib/scrape-csv';

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
