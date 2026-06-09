import { describe, expect, it } from 'vitest';

import { dateStringToEpoch, epochToDateString, epochToDisplayDate } from './grow-record-dates';

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

describe('epochToDisplayDate', () => {
  it('returns a dash for null, undefined, or zero', () => {
    expect(epochToDisplayDate(null)).toBe('-');
    expect(epochToDisplayDate(undefined)).toBe('-');
    expect(epochToDisplayDate(0)).toBe('-');
  });

  it('formats a real epoch as a non-empty localized date', () => {
    expect(epochToDisplayDate(Date.UTC(2024, 0, 15))).not.toBe('-');
  });
});
