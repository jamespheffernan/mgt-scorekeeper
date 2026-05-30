/**
 * JSON serialization helpers — the engine state contains a Set<PlayerId>
 * (the once-per-round birdie ledger) which doesn't survive structuredClone /
 * JSON.stringify. These helpers tag and untag Sets so Zustand's persist
 * middleware can round-trip them safely.
 */

const SET_TAG = '__$set';

export function stateReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Set) {
    return { [SET_TAG]: Array.from(value) };
  }
  return value;
}

export function stateReviver(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && SET_TAG in (value as Record<string, unknown>)) {
    const arr = (value as Record<string, unknown>)[SET_TAG];
    if (Array.isArray(arr)) return new Set(arr);
  }
  return value;
}

export function serialize<T>(value: T): string {
  return JSON.stringify(value, stateReplacer);
}

export function deserialize<T>(text: string): T {
  return JSON.parse(text, stateReviver) as T;
}
