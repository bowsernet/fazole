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
