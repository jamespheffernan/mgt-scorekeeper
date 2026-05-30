/**
 * Zustand persist storage adapter that writes through to Dexie's kv table.
 * Keeps engine state durable across page loads while still letting the store
 * stay in memory for the running session.
 */

import type { StateStorage } from 'zustand/middleware';
import { kv } from '@/persistence/repos';

export const dexieStorage: StateStorage = {
  getItem: async (name) => kv.get(name),
  setItem: async (name, value) => {
    await kv.set(name, value);
  },
  removeItem: async (name) => {
    await kv.remove(name);
  },
};
