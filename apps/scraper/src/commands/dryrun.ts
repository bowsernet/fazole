import Anthropic from '@anthropic-ai/sdk';
import { stringify } from 'csv-stringify/sync';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { mapWithConcurrency } from '../lib/concurrency';
import { CSV_COLUMNS, toCsvRow } from '../lib/csv';
import { extractLlm } from '../lib/extract-llm';
import { extractRules } from '../lib/extract-rules';
import { fetchPage } from '../lib/fetch-page';
import { computeOverlap, formatOverlapReport } from '../lib/overlap';
import { buildPageRefs } from '../lib/pages';
import { parseBeanPage } from '../lib/parse-bean-page';
import type { ScrapedBean } from '../lib/types';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function parsePositiveInt(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${flag} must be a positive integer, got "${value}"`);
  }
  return n;
}

export async function dryrun(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv.filter((a) => a !== '--'),
    options: {
      limit: { type: 'string' },
      pages: { type: 'string', default: 'all' },
      'no-llm': { type: 'boolean', default: false },
      concurrency: { type: 'string', default: '5' },
      out: { type: 'string', default: 'docs/plans/dryrun' },
    },
  });

  const which = values.pages ?? 'all';
  if (which !== 'bean' && which !== 'network' && which !== 'all') {
    throw new Error(`--pages must be one of bean|network|all, got "${which}"`);
  }

  const limit = parsePositiveInt(values.limit, '--limit');
  const concurrency = parsePositiveInt(values.concurrency, '--concurrency') ?? 5;

  if (!values['no-llm'] && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. Set it, or pass --no-llm to skip LLM extraction.');
  }

  const outDir = values.out ?? 'docs/plans/dryrun';
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
    const work = limit ? beans.slice(0, limit) : beans;
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY
    console.log(`Running LLM extraction on ${work.length} beans (concurrency ${concurrency})...`);
    await mapWithConcurrency(work, concurrency, async (bean) => {
      try {
        bean.llm = await extractLlm(client, bean);
      } catch (err) {
        bean.llmError = err instanceof Error ? err.message : String(err);
      }
    });
  }

  mkdirSync(outDir, { recursive: true });
  const csv = stringify(beans.map(toCsvRow), { header: true, columns: [...CSV_COLUMNS] });
  writeFileSync(join(outDir, 'beans-dryrun.csv'), csv);

  const overlap = computeOverlap(beans.map((b) => ({ name: b.name, origin: b.origin })));
  writeFileSync(join(outDir, 'overlap-report.md'), formatOverlapReport(overlap));

  console.log(`Wrote ${beans.length} rows to ${outDir}/beans-dryrun.csv`);
  console.log(
    `Overlap: ${overlap.overlapCount} names on both pages (${overlap.overlapPctOfNetwork.toFixed(1)}% of network).`
  );
}
