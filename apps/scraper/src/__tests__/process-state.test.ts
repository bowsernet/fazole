import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { imageNeedsUpload, readState, statePath, writeState } from '../lib/process-state';

describe('process-state', () => {
  it('builds a per-target state path', () => {
    expect(statePath('.cache', 'emulator')).toBe('.cache/process-state.emulator.json');
    expect(statePath('.cache', 'prod')).toBe('.cache/process-state.prod.json');
  });

  it('round-trips state through disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pstate-'));
    const path = join(dir, 'process-state.emulator.json');
    writeState(path, { 'bean-x': { imageHash: 'h1' } });
    expect(readState(path)).toEqual({ 'bean-x': { imageHash: 'h1' } });
    expect(readState(join(dir, 'missing.json'))).toEqual({});
  });

  it('decides when an image needs upload', () => {
    const state = { 'bean-x': { imageHash: 'h1' } };
    expect(imageNeedsUpload(state, 'bean-x', 'h1', false)).toBe(false); // unchanged
    expect(imageNeedsUpload(state, 'bean-x', 'h2', false)).toBe(true); // changed
    expect(imageNeedsUpload(state, 'bean-new', 'h1', false)).toBe(true); // unseen
    expect(imageNeedsUpload(state, 'bean-x', 'h1', true)).toBe(true); // forced
  });
});
