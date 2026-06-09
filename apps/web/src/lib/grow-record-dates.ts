// Mantine 8 date inputs use `YYYY-MM-DD` strings; grow records persist epoch
// milliseconds. These helpers bridge the two, treating the calendar date as UTC
// so a store/load round-trip is stable regardless of the user's timezone.

export function epochToDateString(epoch?: number | null): string | null {
  if (epoch == null) return null;
  const date = new Date(epoch);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function dateStringToEpoch(value: string | null): number | undefined {
  if (!value) return undefined;
  const epoch = new Date(value).getTime();
  return Number.isNaN(epoch) ? undefined : epoch;
}

export function epochToDisplayDate(epoch?: number | null): string {
  if (!epoch) return '-';
  return new Date(epoch).toLocaleDateString();
}
