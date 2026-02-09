const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns true when the value looks like a valid UUID (v4-style). */
export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);
