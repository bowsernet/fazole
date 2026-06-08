import { describe, expect, it } from 'vitest';

import { dateStringToEpoch, epochToDateString } from './grow-record-dates';

describe('dateStringToEpoch', () => {
  it('converts a Mantine YYYY-MM-DD string to an epoch (regression for t.getTime is not a function)', () => {
    expect(dateStringToEpoch('2024-01-15')).toBe(Date.UTC(2024, 0, 15));
  });

  it('returns undefined for null or empty input', () => {
    expect(dateStringToEpoch(null)).toBeUndefined();
    expect(dateStringToEpoch('')).toBeUndefined();
  });

  it('returns undefined for an unparseable string', () => {
    expect(dateStringToEpoch('not-a-date')).toBeUndefined();
  });
});

describe('epochToDateString', () => {
  it('converts an epoch to a YYYY-MM-DD string', () => {
    expect(epochToDateString(Date.UTC(2024, 0, 15))).toBe('2024-01-15');
  });

  it('returns null for undefined input', () => {
    expect(epochToDateString(undefined)).toBeNull();
  });

  it('round-trips a date string through epoch and back', () => {
    const value = '2025-06-08';
    expect(epochToDateString(dateStringToEpoch(value))).toBe(value);
  });
});
