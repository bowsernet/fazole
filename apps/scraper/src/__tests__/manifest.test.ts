import { describe, expect, it } from 'vitest';

import { type Manifest, hashContent, isUnchanged } from '../lib/manifest';

describe('manifest', () => {
  it('hashes content deterministically', () => {
    expect(hashContent('<html>a</html>')).toBe(hashContent('<html>a</html>'));
    expect(hashContent('a')).not.toBe(hashContent('b'));
  });

  it('detects unchanged vs changed pages', () => {
    const h = hashContent('page');
    const manifest: Manifest = { 'bean-1': { hash: h, fetchedAt: 1, slugs: ['x'] } };
    expect(isUnchanged(manifest, 'bean-1', h)).toBe(true);
    expect(isUnchanged(manifest, 'bean-1', hashContent('other'))).toBe(false);
    expect(isUnchanged(manifest, 'bean-2', h)).toBe(false); // unknown page
  });
});
