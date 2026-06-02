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
