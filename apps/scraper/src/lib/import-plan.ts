import type { CsvBean } from './scrape-csv';
import { slugifyName } from './slug';

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
