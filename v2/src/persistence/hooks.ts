/**
 * Reactive Dexie queries — components subscribe via these hooks so the UI
 * stays in sync with the underlying IndexedDB without manual cache invalidation.
 */

import { useEffect, useState } from 'react';
import { liveQuery, type Subscription } from 'dexie';

/**
 * Subscribe a component to a Dexie live query. The initial value is required
 * and returned synchronously so callers don't need a `?? []` fallback, which
 * would otherwise create a new reference on every render and defeat memoisation.
 */
export function useLiveQuery<T>(query: () => Promise<T> | T, deps: unknown[], initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    let sub: Subscription | undefined;
    try {
      sub = liveQuery(query).subscribe({
        next: (v) => setValue(v as T),
        error: (err) => console.error('[liveQuery]', err),
      });
    } catch (err) {
      console.error('[liveQuery init]', err);
    }
    return () => sub?.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
