import { describe, expect, it } from 'vitest';

import { nullifyUndefined } from './nullify';

describe('nullifyUndefined', () => {
  it('converts undefined values to null', () => {
    expect(nullifyUndefined({ a: undefined, b: 1 })).toEqual({ a: null, b: 1 });
  });

  it('leaves null and falsy values untouched', () => {
    expect(nullifyUndefined({ a: null, b: 0, c: '', d: false })).toEqual({ a: null, b: 0, c: '', d: false });
  });

  it('returns an equivalent object when nothing is undefined', () => {
    expect(nullifyUndefined({ beanId: 'x', year: 2025 })).toEqual({ beanId: 'x', year: 2025 });
  });
});
