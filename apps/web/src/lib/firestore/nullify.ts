// Firestore rejects `undefined` field values. Optional fields are stored as
// `null` instead of being omitted, so they remain queryable for future filters.
export function nullifyUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value])
  ) as T;
}
