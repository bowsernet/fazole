import Anthropic from '@anthropic-ai/sdk';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { type Target, initAdmin } from '../lib/admin';
import { coerceExtraction } from '../lib/coerce-extraction';
import { mapWithConcurrency } from '../lib/concurrency';
import { extractMultimodal } from '../lib/extract-multimodal';
import { extractionKey, readExtractionCache, writeExtractionCache } from '../lib/extraction-cache';
import { listAbcwBeanIds, markDeletedInSource, upsertBean, upsertSources } from '../lib/firestore-import';
import { fileHash, uploadSourceImage } from '../lib/image-upload';
import { computeSoftDeletes, dedupeByPreferBean } from '../lib/import-plan';
import { type ProcessState, imageNeedsUpload, readState, statePath, writeState } from '../lib/process-state';
import { parseScrapeCsv } from '../lib/scrape-csv';
import { slugifyName } from '../lib/slug';
import { sourceIdForOrigin } from '../lib/sources';

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

  const summary = { processed: 0, imagesUploaded: 0, failed: 0 };

  await mapWithConcurrency(work, 5, async (bean) => {
    try {
      const hasImage = bean.localImagePath !== '' && existsSync(bean.localImagePath);
      const imageHash = hasImage ? fileHash(bean.localImagePath) : '';
      const key = extractionKey(bean.name, bean.rawDescription, imageHash);

      let fields = cache[key];
      if (!fields) {
        if (hasImage) {
          try {
            fields = await extractMultimodal(getClient(), bean, values.model ?? undefined);
            cache[key] = fields; // cache only successful multimodal extractions
          } catch (err) {
            console.warn(
              `extraction failed for ${bean.name}, using rules fallback: ${err instanceof Error ? err.message : String(err)}`
            );
            fields = coerceExtraction({}, bean.rules); // not cached — retried next run
          }
        } else {
          fields = coerceExtraction({}, bean.rules); // no image; cheap to recompute, not cached
        }
      }

      const id = await upsertBean(bean, fields, sourceIdForOrigin(bean.origin));

      if (hasImage && imageNeedsUpload(state, id, imageHash, forceImages)) {
        await uploadSourceImage(id, bean.localImagePath);
        state[id] = { imageHash };
        summary.imagesUploaded++;
      }
      summary.processed++;
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
    `Processed ${work.length}/${allBeans.length} beans → ${target} | images uploaded: ${summary.imagesUploaded} | failed: ${summary.failed}`
  );
}
