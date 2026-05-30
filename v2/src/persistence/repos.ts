/**
 * Repository functions — small typed CRUD wrappers over Dexie. Components
 * import these instead of touching `db` directly.
 */

import { db, type MatchRecord } from './db';
import type { Course, Player } from '@/domain/types';

export const playersRepo = {
  all: () => db.players.orderBy('lastName').toArray(),
  byId: (id: string) => db.players.get(id),
  put: (p: Player) => db.players.put(p),
  remove: (id: string) => db.players.delete(id),
};

export const coursesRepo = {
  all: () => db.courses.orderBy('name').toArray(),
  byId: (id: string) => db.courses.get(id),
  put: (c: Course) => db.courses.put(c),
  remove: (id: string) => db.courses.delete(id),
};

export const matchesRepo = {
  all: () => db.matches.orderBy('finishedAt').reverse().toArray(),
  byId: (id: string) => db.matches.get(id),
  put: (m: MatchRecord) => db.matches.put(m),
  remove: (id: string) => db.matches.delete(id),
};

export const kv = {
  get: async (key: string): Promise<string | null> => {
    const row = await db.kv.get(key);
    return row?.value ?? null;
  },
  set: (key: string, value: string) => db.kv.put({ key, value }),
  remove: (key: string) => db.kv.delete(key),
};
