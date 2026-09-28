/**
 * IndexedDB schema (via Dexie).
 *
 *   players   — local-only roster
 *   courses   — courses with one or more tees (Millbrook is seeded)
 *   matches   — finished matches, used for history and rematch
 *   kv        — small key/value bag for state Zustand persists through
 */

import Dexie, { type EntityTable } from 'dexie';
import type { Course, Player } from '@/domain/types';

export interface MatchRecord {
  id: string;
  date: string;
  courseId: string;
  bigGame: boolean;
  playerIds: string[];
  bigGameTotal: number;
  finalRunningTotals: Record<string, number>;
  finishedAt: string;
  /** Full serialized engine state for replay / drill-down. */
  state: string;
}

export interface KVRecord {
  key: string;
  value: string;
}

export const DB_NAME = 'mgt-scorekeeper-v2';
export const DB_VERSION = 1;

export class MgtDb extends Dexie {
  declare players: EntityTable<Player, 'id'>;
  declare courses: EntityTable<Course, 'id'>;
  declare matches: EntityTable<MatchRecord, 'id'>;
  declare kv: EntityTable<KVRecord, 'key'>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      players: 'id, lastName, firstName',
      courses: 'id, name',
      matches: 'id, date, finishedAt',
      kv: 'key',
    });
  }
}

export const db = new MgtDb();
