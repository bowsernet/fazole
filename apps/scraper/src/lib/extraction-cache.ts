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
