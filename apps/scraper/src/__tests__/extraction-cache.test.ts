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
